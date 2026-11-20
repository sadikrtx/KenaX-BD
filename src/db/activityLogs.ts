import fs from 'fs';
import path from 'path';
import type { ActivityLog } from '../types/index.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

const LEGACY_SAMPLE_LOG_IDS = new Set(['log-101', 'log-102', 'log-103', 'log-104', 'log-105']);

export function isLegacySampleActivityLog(log: Partial<ActivityLog> | any): boolean {
  if (!log) return true;
  if (log.id && LEGACY_SAMPLE_LOG_IDS.has(String(log.id))) return true;
  const details = String(log.details || '').toLowerCase();
  const target = String(log.targetId || '').toLowerCase();
  const ts = String(log.timestamp || '');
  if (
    ts.startsWith('2025-02-') &&
    (details.includes('redmi note 13') ||
      details.includes('xiaomi redmi buds 5') ||
      details.includes('iphone 15') ||
      details.includes('galaxy s24') ||
      details.includes('bk9a77218x') ||
      details.includes('pth-ctg-9821') ||
      target === 'kb-89242' ||
      target === 'xia-rn13-8-256')
  ) {
    return true;
  }
  return false;
}

function getActivityLogsFilePath(isEnvPreview?: boolean): string {
  return path.join(
    SERVER_STORE_DIR,
    isEnvPreview ? 'preview_server_activity_logs.json' : 'server_activity_logs.json'
  );
}

function ensureDir() {
  if (!fs.existsSync(SERVER_STORE_DIR)) {
    fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
  }
}

export function getAllActivityLogsFromStore(isEnvPreview?: boolean): ActivityLog[] {
  try {
    ensureDir();
    const filePath = getActivityLogsFilePath(isEnvPreview);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((l) => !isLegacySampleActivityLog(l));
      cleaned.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      if (cleaned.length !== parsed.length) {
        fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf-8');
      }
      return cleaned;
    }
  } catch (err) {
    console.warn('[Server ActivityLogs] Error reading logs file:', err);
  }
  return [];
}

export function appendActivityLogToStore(
  entry: Omit<ActivityLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string },
  isEnvPreview?: boolean
): ActivityLog {
  const newLog: ActivityLog = {
    ...entry,
    id: entry.id || `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    staffName: entry.staffName || 'System',
    staffRole: entry.staffRole || 'system',
    action: entry.action || 'Action Recorded',
    module: entry.module || 'Orders',
    targetId: entry.targetId || entry.orderId || entry.productId || '',
    details: entry.details || '',
    ipAddress: entry.ipAddress || entry.ip || undefined,
  };

  if (isLegacySampleActivityLog(newLog)) {
    return newLog;
  }

  try {
    ensureDir();
    const filePath = getActivityLogsFilePath(isEnvPreview);
    const current = getAllActivityLogsFromStore(isEnvPreview);
    const existingIdx = current.findIndex((l) => l.id === newLog.id);
    if (existingIdx >= 0) {
      current[existingIdx] = { ...current[existingIdx], ...newLog };
    } else {
      current.unshift(newLog);
    }
    const trimmed = current.slice(0, 2000);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server ActivityLogs] Error writing log file:', err);
  }

  return newLog;
}
