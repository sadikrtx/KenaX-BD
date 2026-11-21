import fs from 'fs';
import path from 'path';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { TelegramBotSettings, TelegramLog } from '../types/index.ts';
import { DEFAULT_TELEGRAM_BOT_SETTINGS, DEFAULT_TELEGRAM_TEMPLATES } from '../lib/telegramBotService.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const TELEGRAM_SETTINGS_FILE = path.join(SERVER_STORE_DIR, 'server_telegram_settings.json');
const TELEGRAM_LOGS_FILE = path.join(SERVER_STORE_DIR, 'server_telegram_logs.json');

function getFirebaseConfig() {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return null;
}

const firebaseConfig = getFirebaseConfig();
let db: any = null;
let telegramFirestoreUnavailable = false;

function isTelegramFirestoreError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || err.name || '').toLowerCase();
  const msg = String(err.message || err.toString?.() || '');
  return (
    code === 'permission-denied' ||
    code === 'unauthenticated' ||
    code === 'resource-exhausted' ||
    code === '7' ||
    code === '429' ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('resource-exhausted')
  );
}

if (firebaseConfig) {
  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
  } catch {
    telegramFirestoreUnavailable = true;
  }
}

function ensureDataDir() {
  if (!fs.existsSync(SERVER_STORE_DIR)) {
    fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
  }
}

/**
 * Get Telegram settings from local server disk, with fallback to Firestore
 */
export async function getServerTelegramSettings(): Promise<TelegramBotSettings> {
  ensureDataDir();

  // 1. Read from local server disk
  let diskSettings: Partial<TelegramBotSettings> | null = null;
  if (fs.existsSync(TELEGRAM_SETTINGS_FILE)) {
    try {
      const raw = fs.readFileSync(TELEGRAM_SETTINGS_FILE, 'utf-8');
      diskSettings = JSON.parse(raw);
    } catch (e) {
      console.info('[Telegram Server Disk Read Fallback]:', e);
    }
  }

  // 2. Read from Firestore if available and client is online
  let firestoreSettings: Partial<TelegramBotSettings> | null = null;
  if (db && !telegramFirestoreUnavailable) {
    try {
      // Use a fast timeout to prevent blocking when client is offline or network is disconnected
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore read timeout')), 1200)
      );
      const readPromise = getDoc(doc(db, 'system_settings', 'telegram_bot_settings'));
      const snap: any = await Promise.race([readPromise, timeoutPromise]);
      if (snap && typeof snap.exists === 'function' && snap.exists()) {
        firestoreSettings = snap.data() as Partial<TelegramBotSettings>;
      }
    } catch (err: any) {
      if (isTelegramFirestoreError(err)) {
        telegramFirestoreUnavailable = true;
      }
      // Graceful offline fallback: silently fall back to local disk persistence
    }
  }

  // 3. Merge hierarchy: DEFAULT -> Firestore -> Disk (Disk takes highest precedence for server persistence)
  const merged: TelegramBotSettings = {
    ...DEFAULT_TELEGRAM_BOT_SETTINGS,
    ...(firestoreSettings || {}),
    ...(diskSettings || {}),
    customerNotifyStatuses: {
      ...DEFAULT_TELEGRAM_BOT_SETTINGS.customerNotifyStatuses,
      ...(firestoreSettings?.customerNotifyStatuses || {}),
      ...(diskSettings?.customerNotifyStatuses || {}),
    },
    templates: {
      ...DEFAULT_TELEGRAM_TEMPLATES,
      ...(firestoreSettings?.templates || {}),
      ...(diskSettings?.templates || {}),
    },
  };

  // Keep disk file updated if we only got it from Firestore
  if (!diskSettings && firestoreSettings) {
    try {
      fs.writeFileSync(TELEGRAM_SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch {}
  }

  return merged;
}

/**
 * Save Telegram settings to both server disk and Firestore
 */
export async function saveServerTelegramSettings(settings: TelegramBotSettings): Promise<boolean> {
  ensureDataDir();

  const dataToSave = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  // 1. Write to server disk synchronously
  try {
    fs.writeFileSync(TELEGRAM_SETTINGS_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
  } catch (err) {
    console.info('[Telegram Server Disk Write Fallback]:', err);
  }

  // 2. Write to Firestore in background / async if db is available
  if (db && !telegramFirestoreUnavailable) {
    try {
      setDoc(doc(db, 'system_settings', 'telegram_bot_settings'), dataToSave, { merge: true }).catch((err) => {
        if (isTelegramFirestoreError(err)) {
          telegramFirestoreUnavailable = true;
        }
      });
    } catch {}
  }

  return true;
}

/**
 * Test Telegram bot token from backend server
 */
export async function testServerTelegramBotToken(token: string): Promise<{
  success: boolean;
  botInfo?: {
    id: number;
    firstName: string;
    username: string;
    canJoinGroups: boolean;
  };
  error?: string;
}> {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { success: false, error: 'Bot Token is required.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    const data = (await res.json()) as any;
    if (data.ok && data.result) {
      return {
        success: true,
        botInfo: {
          id: data.result.id,
          firstName: data.result.first_name,
          username: data.result.username || '',
          canJoinGroups: !!data.result.can_join_groups,
        },
      };
    }
    return {
      success: false,
      error: data.description || 'Telegram API returned error.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Server failed to connect to Telegram API.',
    };
  }
}

/**
 * Get Telegram logs from server disk
 */
export function getServerTelegramLogs(): TelegramLog[] {
  ensureDataDir();
  if (!fs.existsSync(TELEGRAM_LOGS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(TELEGRAM_LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save Telegram log to server disk & Firestore
 */
export async function saveServerTelegramLog(log: Omit<TelegramLog, 'id'> & { id?: string }): Promise<void> {
  ensureDataDir();
  const fullLog: TelegramLog = {
    ...log,
    id: log.id || `TLG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
  };

  try {
    const existing = getServerTelegramLogs();
    const updated = [fullLog, ...existing].slice(0, 150);
    fs.writeFileSync(TELEGRAM_LOGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.info('[Telegram Log Disk Save Fallback]:', err);
  }

  if (db && !telegramFirestoreUnavailable) {
    try {
      await addDoc(collection(db, 'telegram_logs'), fullLog);
    } catch (err: any) {
      if (isTelegramFirestoreError(err)) {
        telegramFirestoreUnavailable = true;
      }
    }
  }
}
