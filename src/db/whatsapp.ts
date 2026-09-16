import fs from 'fs';
import path from 'path';
import { getFirestore, collection, doc, setDoc, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

export interface WhatsAppMessageRecord {
  id: string; // Meta message ID (wamid) or generated ID
  direction: 'incoming' | 'outgoing';
  from: string;
  to?: string;
  senderName?: string;
  text?: string;
  messageType: 'text' | 'interactive' | 'template' | 'image' | 'button' | 'location' | 'document' | 'other';
  rawPayload?: any;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  orderId?: string;
  error?: string;
}

export interface WhatsAppWebhookLog {
  id: string;
  receivedAt: string;
  type: string;
  senderPhone?: string;
  summary: string;
  rawPayload: any;
}

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const WHATSAPP_MESSAGES_FILE = path.join(SERVER_STORE_DIR, 'server_whatsapp_messages.json');
const WHATSAPP_WEBHOOKS_FILE = path.join(SERVER_STORE_DIR, 'server_whatsapp_webhooks.json');

function ensureDataDir() {
  if (!fs.existsSync(SERVER_STORE_DIR)) {
    fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
  }
}

export function getAllWhatsAppMessages(): WhatsAppMessageRecord[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(WHATSAPP_MESSAGES_FILE)) {
      return [];
    }
    const content = fs.readFileSync(WHATSAPP_MESSAGES_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[WhatsApp Store] Error reading messages:', err);
    return [];
  }
}

export function saveWhatsAppMessage(msg: WhatsAppMessageRecord): WhatsAppMessageRecord {
  try {
    ensureDataDir();
    const current = getAllWhatsAppMessages();
    const idx = current.findIndex((m) => m.id === msg.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...msg };
    } else {
      current.unshift(msg);
      // Keep last 500 messages to maintain server speed
      if (current.length > 500) {
        current.length = 500;
      }
    }
    fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('[WhatsApp Store] Error writing message:', err);
  }
  return msg;
}

export function updateWhatsAppMessageStatus(messageId: string, status: WhatsAppMessageRecord['status'], error?: string): void {
  try {
    ensureDataDir();
    const current = getAllWhatsAppMessages();
    const target = current.find((m) => m.id === messageId);
    if (target) {
      target.status = status;
      if (error) target.error = error;
      fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
      syncWhatsAppStatusToFirestore(messageId, status, error).catch(() => {});
    }
  } catch (err) {
    console.warn('[WhatsApp Store] Status update error:', err);
  }
}

export function getAllWhatsAppWebhookLogs(): WhatsAppWebhookLog[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(WHATSAPP_WEBHOOKS_FILE)) {
      return [];
    }
    const content = fs.readFileSync(WHATSAPP_WEBHOOKS_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logWhatsAppWebhook(log: WhatsAppWebhookLog): void {
  try {
    ensureDataDir();
    const current = getAllWhatsAppWebhookLogs();
    current.unshift(log);
    if (current.length > 200) {
      current.length = 200;
    }
    fs.writeFileSync(WHATSAPP_WEBHOOKS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    syncWhatsAppWebhookLogToFirestore(log).catch(() => {});
  } catch (err) {
    console.warn('[WhatsApp Store] Webhook logging error:', err);
  }
}

// Write to Firestore asynchronously
let firestoreDb: any = null;
function getFirestoreInstance() {
  if (firestoreDb) return firestoreDb;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = !getApps().length ? initializeApp(config) : getApp();
    firestoreDb = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);
    return firestoreDb;
  } catch {
    return null;
  }
}

export async function syncWhatsAppMessageToFirestore(msg: WhatsAppMessageRecord): Promise<void> {
  try {
    const db = getFirestoreInstance();
    if (!db) return;
    const safeDocId = msg.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'whatsapp_messages', safeDocId), {
      ...msg,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] WhatsApp message sync notice:', err.message);
  }
}

export async function syncWhatsAppStatusToFirestore(messageId: string, status: WhatsAppMessageRecord['status'], error?: string): Promise<void> {
  try {
    const db = getFirestoreInstance();
    if (!db) return;
    const safeDocId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const payload: any = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (error) payload.error = error;
    await setDoc(doc(db, 'whatsapp_messages', safeDocId), payload, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] WhatsApp status update notice:', err.message);
  }
}

export async function syncWhatsAppWebhookLogToFirestore(log: WhatsAppWebhookLog): Promise<void> {
  try {
    const db = getFirestoreInstance();
    if (!db) return;
    const safeDocId = log.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, 'whatsapp_webhooks', safeDocId), {
      ...log,
      syncedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err: any) {
    console.warn('[Firestore Sync] WhatsApp webhook log notice:', err.message);
  }
}
