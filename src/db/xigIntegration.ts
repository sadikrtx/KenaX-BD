import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  XigIntegrationConfig,
  XigProductPermission,
  XigSyncLog,
  XigExternalOrderMapping,
} from '../types/xig.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const XIG_CONFIG_FILE = path.join(SERVER_STORE_DIR, 'xig_integration_config.json');
const XIG_PERMISSIONS_FILE = path.join(SERVER_STORE_DIR, 'xig_product_permissions.json');
const XIG_LOGS_FILE = path.join(SERVER_STORE_DIR, 'xig_sync_logs.json');
const XIG_ORDERS_MAP_FILE = path.join(SERVER_STORE_DIR, 'xig_orders_map.json');

function ensureDataDir() {
  if (!fs.existsSync(SERVER_STORE_DIR)) {
    fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
  }
}

export function generateSecureKey(prefix: string, length = 32): string {
  return `${prefix}_${crypto.randomBytes(length).toString('hex')}`;
}

export function getDefaultXigConfig(): XigIntegrationConfig {
  const now = new Date().toISOString();
  return {
    enabled: false, // Default is disabled until admin explicitly enables
    apiKey: generateSecureKey('xig_live', 24),
    apiSecret: generateSecureKey('xsec', 32),
    webhookUrl: '',
    webhookSecret: generateSecureKey('xwhsec', 24),
    webhookEvents: ['product.updated', 'product.unauthorized', 'order.status_changed'],
    rateLimitPerMinute: 120,
    pricingRule: {
      mode: 'percentage_margin',
      marginPercent: 15, // 15% wholesale/reseller discount from source retail
      minResalePriceRule: 'enforce_retail',
    },
    inventorySync: {
      autoHideOutOfStock: true,
      stockBuffer: 1,
      allowBackorders: false,
    },
    createdAt: now,
    updatedAt: now,
  };
}

// -------------------------------------------------------------
// Config Management
// -------------------------------------------------------------
export function getXigConfig(): XigIntegrationConfig {
  ensureDataDir();
  if (!fs.existsSync(XIG_CONFIG_FILE)) {
    const initial = getDefaultXigConfig();
    fs.writeFileSync(XIG_CONFIG_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(XIG_CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Xig DB] Error parsing xig_integration_config.json:', err);
    return getDefaultXigConfig();
  }
}

export function saveXigConfig(updates: Partial<XigIntegrationConfig>): XigIntegrationConfig {
  ensureDataDir();
  const current = getXigConfig();
  const merged: XigIntegrationConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(XIG_CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function rotateXigApiKeys(): XigIntegrationConfig {
  return saveXigConfig({
    apiKey: generateSecureKey('xig_live', 24),
    apiSecret: generateSecureKey('xsec', 32),
  });
}

// -------------------------------------------------------------
// Product Permissions Management
// -------------------------------------------------------------
export function getXigProductPermissions(): Record<string, XigProductPermission> {
  ensureDataDir();
  if (!fs.existsSync(XIG_PERMISSIONS_FILE)) {
    fs.writeFileSync(XIG_PERMISSIONS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }
  try {
    const raw = fs.readFileSync(XIG_PERMISSIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Xig DB] Error parsing xig_product_permissions.json:', err);
    return {};
  }
}

export function saveXigProductPermission(permission: XigProductPermission): XigProductPermission {
  ensureDataDir();
  const current = getXigProductPermissions();
  current[permission.productId] = permission;
  fs.writeFileSync(XIG_PERMISSIONS_FILE, JSON.stringify(current, null, 2), 'utf-8');
  return permission;
}

export function bulkUpdateXigProductPermissions(permissions: XigProductPermission[]): void {
  ensureDataDir();
  const current = getXigProductPermissions();
  permissions.forEach((p) => {
    current[p.productId] = p;
  });
  fs.writeFileSync(XIG_PERMISSIONS_FILE, JSON.stringify(current, null, 2), 'utf-8');
}

export function revokeXigProductPermission(productId: string): boolean {
  ensureDataDir();
  const current = getXigProductPermissions();
  if (current[productId]) {
    current[productId].isEligible = false;
    current[productId].status = 'revoked';
    current[productId].revokedAt = new Date().toISOString();
    fs.writeFileSync(XIG_PERMISSIONS_FILE, JSON.stringify(current, null, 2), 'utf-8');
    return true;
  }
  return false;
}

// -------------------------------------------------------------
// Logs Management
// -------------------------------------------------------------
export function getXigSyncLogs(limit = 100): XigSyncLog[] {
  ensureDataDir();
  if (!fs.existsSync(XIG_LOGS_FILE)) {
    fs.writeFileSync(XIG_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(XIG_LOGS_FILE, 'utf-8');
    const logs: XigSyncLog[] = JSON.parse(raw);
    return Array.isArray(logs) ? logs.slice(0, limit) : [];
  } catch (err) {
    console.warn('[Xig DB] Error parsing xig_sync_logs.json:', err);
    return [];
  }
}

export function addXigSyncLog(log: Omit<XigSyncLog, 'id' | 'timestamp'>): XigSyncLog {
  ensureDataDir();
  const logs = getXigSyncLogs(250);
  const newLog: XigSyncLog = {
    ...log,
    id: `xlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...logs].slice(0, 200);
  fs.writeFileSync(XIG_LOGS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return newLog;
}

export function clearXigSyncLogs(): void {
  ensureDataDir();
  fs.writeFileSync(XIG_LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// -------------------------------------------------------------
// External Order Mappings
// -------------------------------------------------------------
export function getXigOrderMappings(): XigExternalOrderMapping[] {
  ensureDataDir();
  if (!fs.existsSync(XIG_ORDERS_MAP_FILE)) {
    fs.writeFileSync(XIG_ORDERS_MAP_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(XIG_ORDERS_MAP_FILE, 'utf-8');
    const maps = JSON.parse(raw);
    return Array.isArray(maps) ? maps : [];
  } catch (err) {
    console.warn('[Xig DB] Error parsing xig_orders_map.json:', err);
    return [];
  }
}

export function saveXigOrderMapping(mapping: XigExternalOrderMapping): void {
  ensureDataDir();
  const maps = getXigOrderMappings();
  const idx = maps.findIndex((m) => m.xigOrderId === mapping.xigOrderId || m.kenaxOrderId === mapping.kenaxOrderId);
  if (idx >= 0) {
    maps[idx] = { ...maps[idx], ...mapping, updatedAt: new Date().toISOString() };
  } else {
    maps.unshift(mapping);
  }
  fs.writeFileSync(XIG_ORDERS_MAP_FILE, JSON.stringify(maps.slice(0, 500), null, 2), 'utf-8');
}

export function findXigOrderMappingByIdempotency(key: string): XigExternalOrderMapping | undefined {
  if (!key) return undefined;
  const maps = getXigOrderMappings();
  return maps.find((m) => m.idempotencyKey === key || m.xigOrderId === key);
}

// -------------------------------------------------------------
// Auth & Verification
// -------------------------------------------------------------
export function verifyXigApiKey(providedKey?: string): boolean {
  if (!providedKey) return false;
  const config = getXigConfig();
  if (!config.enabled) return false;
  const cleanProvided = providedKey.replace(/^Bearer\s+/i, '').trim();
  return cleanProvided === config.apiKey.trim();
}
