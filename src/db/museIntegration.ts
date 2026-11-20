import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(SERVER_STORE_DIR, 'muse_integration_config.json');

export interface MuseIntegrationStoredConfig {
  apiKeyHash: string;
  keyPrefix: string;
  keyLast4: string;
  lowStockThreshold: number;
  createdAt: string;
  rotatedAt: string;
  updatedBy?: string;
}

export interface MuseIntegrationPublicAdminView {
  hasKey: boolean;
  maskedKey: string;
  lowStockThreshold: number;
  createdAt: string | null;
  rotatedAt: string | null;
  updatedBy: string | null;
}

function ensureStoreDir() {
  if (!fs.existsSync(SERVER_STORE_DIR)) {
    fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
  }
}

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim(), 'utf8').digest('hex');
}

export function readMuseIntegrationConfig(): MuseIntegrationStoredConfig | null {
  try {
    ensureStoreDir();
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        apiKeyHash: String(parsed.apiKeyHash || ''),
        keyPrefix: String(parsed.keyPrefix || 'knx_muse_'),
        keyLast4: String(parsed.keyLast4 || ''),
        lowStockThreshold:
          typeof parsed.lowStockThreshold === 'number' && Number.isFinite(parsed.lowStockThreshold)
            ? Math.max(0, Math.round(parsed.lowStockThreshold))
            : 5,
        createdAt: String(parsed.createdAt || new Date().toISOString()),
        rotatedAt: String(parsed.rotatedAt || new Date().toISOString()),
        updatedBy: parsed.updatedBy ? String(parsed.updatedBy) : undefined,
      };
    }
  } catch (err) {
    console.warn('[Muse Integration] Error reading config:', err);
  }
  return null;
}

function writeMuseIntegrationConfig(cfg: MuseIntegrationStoredConfig): void {
  ensureStoreDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

export function getMuseIntegrationAdminView(): MuseIntegrationPublicAdminView {
  const cfg = readMuseIntegrationConfig();
  if (!cfg || !cfg.apiKeyHash) {
    return {
      hasKey: false,
      maskedKey: '',
      lowStockThreshold: cfg?.lowStockThreshold ?? 5,
      createdAt: null,
      rotatedAt: null,
      updatedBy: cfg?.updatedBy ?? null,
    };
  }
  return {
    hasKey: true,
    maskedKey: `${cfg.keyPrefix}••••••••••••••••••••••••${cfg.keyLast4}`,
    lowStockThreshold: cfg.lowStockThreshold,
    createdAt: cfg.createdAt,
    rotatedAt: cfg.rotatedAt,
    updatedBy: cfg.updatedBy ?? null,
  };
}

export function getMuseLowStockThreshold(): number {
  const cfg = readMuseIntegrationConfig();
  return cfg?.lowStockThreshold ?? 5;
}

export function updateMuseIntegrationSettings(
  updates: { lowStockThreshold?: number },
  updatedBy?: string
): MuseIntegrationPublicAdminView {
  const existing = readMuseIntegrationConfig();
  const now = new Date().toISOString();
  const nextThreshold =
    updates.lowStockThreshold !== undefined && Number.isFinite(Number(updates.lowStockThreshold))
      ? Math.max(0, Math.min(1000, Math.round(Number(updates.lowStockThreshold))))
      : existing?.lowStockThreshold ?? 5;

  const next: MuseIntegrationStoredConfig = {
    apiKeyHash: existing?.apiKeyHash || '',
    keyPrefix: existing?.keyPrefix || 'knx_muse_',
    keyLast4: existing?.keyLast4 || '',
    lowStockThreshold: nextThreshold,
    createdAt: existing?.createdAt || now,
    rotatedAt: existing?.rotatedAt || now,
    updatedBy: updatedBy || existing?.updatedBy || 'Super Admin',
  };
  writeMuseIntegrationConfig(next);
  return getMuseIntegrationAdminView();
}

/**
 * Generates or regenerates the store's Muse Integration API Key.
 * Only the SHA-256 hash and masked prefix/suffix are persisted on disk.
 * Previous key is invalidated immediately.
 */
export function generateMuseApiKey(updatedBy?: string): {
  apiKey: string;
  view: MuseIntegrationPublicAdminView;
} {
  const existing = readMuseIntegrationConfig();
  const now = new Date().toISOString();
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const apiKey = `knx_muse_${rawSecret}`;
  const apiKeyHash = hashApiKey(apiKey);

  const next: MuseIntegrationStoredConfig = {
    apiKeyHash,
    keyPrefix: 'knx_muse_',
    keyLast4: rawSecret.slice(-4),
    lowStockThreshold: existing?.lowStockThreshold ?? 5,
    createdAt: existing?.createdAt || now,
    rotatedAt: now,
    updatedBy: updatedBy || 'Super Admin',
  };

  writeMuseIntegrationConfig(next);
  return {
    apiKey,
    view: getMuseIntegrationAdminView(),
  };
}

export function verifyMuseApiKey(candidateKey?: string | null): boolean {
  if (!candidateKey || typeof candidateKey !== 'string') return false;
  const trimmed = candidateKey.trim();
  if (!trimmed) return false;

  // Support optional env override as well as generated server key
  const envKey = (process.env.MUSE_INTEGRATION_API_KEY || '').trim();
  if (envKey) {
    const a = Buffer.from(hashApiKey(trimmed), 'hex');
    const b = Buffer.from(hashApiKey(envKey), 'hex');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  }

  const cfg = readMuseIntegrationConfig();
  if (!cfg || !cfg.apiKeyHash) return false;

  try {
    const expectedBuf = Buffer.from(cfg.apiKeyHash, 'hex');
    const providedBuf = Buffer.from(hashApiKey(trimmed), 'hex');
    if (expectedBuf.length !== providedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
}
