import fs from 'fs';
import path from 'path';
import { getFirestore, collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

export interface WhatsAppMessageRecord {
  id: string; // Meta message ID (wamid) or generated ID
  direction: 'incoming' | 'outgoing';
  from: string;
  to?: string;
  senderName?: string;
  text?: string;
  messageType: 'text' | 'interactive' | 'template' | 'image' | 'video' | 'audio' | 'voice' | 'button' | 'location' | 'document' | 'other';
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'voice' | 'document';
  mediaCaption?: string;
  filename?: string;
  rawPayload?: any;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  timestamp: string;
  orderId?: string;
  error?: string;
  staffMember?: string;
  staffId?: string;
  staffRole?: string;
  readAt?: string;
  readBy?: string;
  updatedAt?: string;
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
const WHATSAPP_PINNED_FILE = path.join(SERVER_STORE_DIR, 'server_whatsapp_pinned.json');

export function normalizePhoneNumber(rawPhone: string): string {
  const digits = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.startsWith('880') && digits.length === 13) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `88${digits}`;
  }
  if (digits.length === 10) {
    return `880${digits}`;
  }
  return digits;
}

/**
 * Universal phone matcher handling Bangladeshi (+880, 880, 01, etc.) and international numbers
 */
export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhoneNumber(p1);
  const n2 = normalizePhoneNumber(p2);
  if (n1 && n2 && n1 === n2) return true;
  const d1 = (p1 || '').replace(/[^0-9]/g, '');
  const d2 = (p2 || '').replace(/[^0-9]/g, '');
  if (d1.length >= 10 && d2.length >= 10) {
    return d1.slice(-10) === d2.slice(-10);
  }
  return false;
}

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

/**
 * Robust async message fetch: reads Firestore + local disk, merges and deduplicates
 * Ensures all incoming customer messages and outgoing admin replies are permanently preserved.
 */
export async function getAllWhatsAppMessagesAsync(): Promise<WhatsAppMessageRecord[]> {
  const localList = getAllWhatsAppMessages();
  const map = new Map<string, WhatsAppMessageRecord>();

  // Add local messages
  localList.forEach((m) => {
    if (m && m.id) {
      map.set(m.id, m);
    }
  });

  // Query Firestore whatsapp_messages
  try {
    const db = getFirestoreInstance();
    if (db) {
      const snap = await getDocs(collection(db, 'whatsapp_messages'));
      snap.forEach((docSnap) => {
        const data = docSnap.data() as WhatsAppMessageRecord;
        if (data && data.id && (data.text || data.from || data.to)) {
          const existing = map.get(data.id);
          if (existing) {
            // CRITICAL MERGE FIX: Never downgrade a confirmed 'read' status back to 'received'!
            const isRead = existing.status === 'read' || data.status === 'read';
            map.set(data.id, {
              ...existing,
              ...data,
              status: isRead ? 'read' : (data.status || existing.status),
              readAt: existing.readAt || data.readAt,
              readBy: existing.readBy || data.readBy,
              updatedAt: [existing.updatedAt, data.updatedAt].filter(Boolean).sort().reverse()[0],
            });
          } else {
            map.set(data.id, data);
          }
        }
      });
    }
  } catch (err: any) {
    console.warn('[WhatsApp Store] Firestore fetch notice:', err.message);
  }

  const combined = Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
  );

  // Sync combined list to local disk so next sync is instantaneous
  try {
    ensureDataDir();
    fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(combined.slice(0, 1000), null, 2), 'utf-8');
  } catch {}

  return combined;
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
      if (current.length > 1000) {
        current.length = 1000;
      }
    }
    fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
    // Always persist to Firestore
    syncWhatsAppMessageToFirestore(msg).catch(() => {});
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

/**
 * Marks all incoming unread messages for a given phone as 'read'
 */
export async function markWhatsAppConversationAsReadInStore(
  phone: string,
  staffMember?: string
): Promise<{ updatedCount: number; messageIds: string[] }> {
  const current = getAllWhatsAppMessages();
  const updatedIds: string[] = [];
  const nowISO = new Date().toISOString();

  current.forEach((m) => {
    if (
      m.direction === 'incoming' &&
      m.status !== 'read' &&
      (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
    ) {
      m.status = 'read';
      m.readAt = nowISO;
      m.readBy = staffMember || 'Admin';
      m.updatedAt = nowISO;
      updatedIds.push(m.id);
    }
  });

  if (updatedIds.length > 0) {
    try {
      ensureDataDir();
      fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
    } catch {}

    // Update in Firestore
    const db = getFirestoreInstance();
    if (db) {
      for (const mid of updatedIds) {
        const safeDocId = mid.replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(
          doc(db, 'whatsapp_messages', safeDocId),
          {
            status: 'read',
            readAt: nowISO,
            readBy: staffMember || 'Admin',
            updatedAt: nowISO,
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }

  return { updatedCount: updatedIds.length, messageIds: updatedIds };
}

/**
 * Marks ALL unread incoming WhatsApp messages across all conversations as read
 */
export async function markAllWhatsAppConversationsAsReadInStore(
  staffMember?: string
): Promise<{ updatedCount: number; messageIds: string[] }> {
  const current = getAllWhatsAppMessages();
  const updatedIds: string[] = [];
  const nowISO = new Date().toISOString();

  current.forEach((m) => {
    if (m.direction === 'incoming' && m.status !== 'read') {
      m.status = 'read';
      m.readAt = nowISO;
      m.readBy = staffMember || 'Admin';
      m.updatedAt = nowISO;
      updatedIds.push(m.id);
    }
  });

  if (updatedIds.length > 0) {
    try {
      ensureDataDir();
      fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
    } catch {}

    const db = getFirestoreInstance();
    if (db) {
      for (const mid of updatedIds) {
        const safeDocId = mid.replace(/[^a-zA-Z0-9_-]/g, '_');
        await setDoc(
          doc(db, 'whatsapp_messages', safeDocId),
          {
            status: 'read',
            readAt: nowISO,
            readBy: staffMember || 'Admin',
            updatedAt: nowISO,
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }

  return { updatedCount: updatedIds.length, messageIds: updatedIds };
}

/**
 * Marks conversation as unread by setting the latest incoming message to 'received'
 */
export async function markWhatsAppConversationAsUnreadInStore(phone: string): Promise<boolean> {
  const current = getAllWhatsAppMessages();
  const incoming = current.filter(
    (m) =>
      m.direction === 'incoming' &&
      (isPhoneMatch(m.from, phone) || isPhoneMatch(m.to, phone))
  );

  if (incoming.length === 0) return false;

  // Sort incoming by timestamp desc to find the newest one
  incoming.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  const newest = incoming[0];
  const nowISO = new Date().toISOString();
  newest.status = 'received';
  newest.updatedAt = nowISO;

  try {
    ensureDataDir();
    fs.writeFileSync(WHATSAPP_MESSAGES_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch {}

  const db = getFirestoreInstance();
  if (db && newest.id) {
    const safeDocId = newest.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(
      doc(db, 'whatsapp_messages', safeDocId),
      {
        status: 'received',
        updatedAt: nowISO,
      },
      { merge: true }
    ).catch(() => {});
  }

  return true;
}

/**
 * Pinned Chats Management on Server Store & Firestore
 */
export async function getPinnedWhatsAppChatsFromStore(): Promise<string[]> {
  const db = getFirestoreInstance();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'whatsapp_metadata', 'pinned_chats'));
      if (snap.exists()) {
        const data = snap.data();
        const list: string[] = Array.isArray(data?.list)
          ? data.list.map((p: string) => normalizePhoneNumber(p))
          : [];
        try {
          ensureDataDir();
          fs.writeFileSync(WHATSAPP_PINNED_FILE, JSON.stringify(list, null, 2), 'utf-8');
        } catch {}
        return list;
      }
    } catch {}
  }

  try {
    ensureDataDir();
    if (fs.existsSync(WHATSAPP_PINNED_FILE)) {
      const content = fs.readFileSync(WHATSAPP_PINNED_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed.map((p: string) => normalizePhoneNumber(p)) : [];
    }
  } catch {}

  return [];
}

export async function togglePinnedWhatsAppChatInStore(phone: string): Promise<string[]> {
  if (!phone) return [];
  const normKey = normalizePhoneNumber(phone);
  const current = await getPinnedWhatsAppChatsFromStore();
  let updated: string[];

  if (current.includes(normKey)) {
    updated = current.filter((p) => p !== normKey);
  } else {
    updated = [normKey, ...current.filter((p) => p !== normKey)];
  }

  try {
    ensureDataDir();
    fs.writeFileSync(WHATSAPP_PINNED_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch {}

  const db = getFirestoreInstance();
  if (db) {
    try {
      await setDoc(
        doc(db, 'whatsapp_metadata', 'pinned_chats'),
        {
          list: updated,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err: any) {
      console.warn('[WhatsApp Store] Pinned chats Firestore save notice:', err.message);
    }
  }

  return updated;
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
