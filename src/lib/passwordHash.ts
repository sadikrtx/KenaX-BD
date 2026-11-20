import type { StaffUser, UserRole } from '../types/index.ts';

const HASH_PREFIX = 'sha256:';
const HASH_NAMESPACE = 'kenaxbd-staff-v1:';
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/i;

export const STAFF_SESSION_KEY = 'kenax_staff_session';
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Pure-JS SHA-256 fallback for environments where Web Crypto `crypto.subtle`
 * is unavailable (e.g. non-HTTPS local LAN testing).
 */
function sha256Fallback(ascii: string): string {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const utf8Bytes = new TextEncoder().encode(ascii);
  const asciiBitLength = utf8Bytes.length * 8;

  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  for (let i = 0; i < utf8Bytes.length; i++) {
    words[i >> 2] = (words[i >> 2] || 0) | (utf8Bytes[i] << ((3 - (i % 4)) * 8));
  }
  words[utf8Bytes.length >> 2] =
    (words[utf8Bytes.length >> 2] || 0) | (0x80 << ((3 - (utf8Bytes.length % 4)) * 8));

  while (words.length % 16 !== 14) {
    words.push(0);
  }
  words.push(Math.floor(asciiBitLength / maxWord));
  words.push(asciiBitLength | 0);

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Compute lowercase hex SHA-256 digest using Web Crypto API with pure-JS fallback.
 */
export async function sha256Hex(input: string): Promise<string> {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fall back to deterministic pure-JS SHA-256
  }
  return sha256Fallback(input);
}

export function isPasswordHash(value?: string | null): boolean {
  return Boolean(value && HASH_PATTERN.test(value.trim()));
}

/**
 * Hash a staff password into a deterministic namespaced SHA-256 string (`sha256:<hex>`).
 * Safe to store in Cloud Firestore; plain passwords are NEVER stored in Firestore or localStorage.
 */
export async function hashStaffPassword(plainPassword: string): Promise<string> {
  const normalized = String(plainPassword ?? '');
  if (isPasswordHash(normalized)) {
    return normalized.toLowerCase();
  }
  const hex = await sha256Hex(`${HASH_NAMESPACE}${normalized}`);
  return `${HASH_PREFIX}${hex}`;
}

/**
 * Verify a staff password against `passwordHash` (preferred) or legacy plaintext `password`
 * (for transparent one-time migration).
 */
export async function verifyStaffPassword(
  plainPassword: string,
  staff: { passwordHash?: string; password?: string; role?: string }
): Promise<{ valid: boolean; needsMigration: boolean }> {
  const entered = String(plainPassword ?? '');

  if (staff.passwordHash && isPasswordHash(staff.passwordHash)) {
    const computed = await hashStaffPassword(entered);
    const valid = computed.toLowerCase() === staff.passwordHash.trim().toLowerCase();
    // If legacy plaintext `password` still lingers on the doc alongside passwordHash, trigger cleanup migration
    return { valid, needsMigration: valid && Boolean(staff.password) };
  }

  // Legacy plaintext compatibility (triggers immediate hash migration in Firestore)
  if (typeof staff.password === 'string' && staff.password.length > 0) {
    const valid = entered === staff.password;
    return { valid, needsMigration: valid };
  }

  return { valid: false, needsMigration: false };
}

/**
 * Remove sensitive password fields before exposing staff records to UI state or browser session storage.
 */
export function stripStaffSecrets<T extends Partial<StaffUser>>(staff: T): Omit<T, 'password' | 'passwordHash'> & {
  password?: undefined;
  passwordHash?: undefined;
} {
  if (!staff) return staff as any;
  const copy: any = { ...staff };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

export interface StaffSessionData {
  id: string;
  staffId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  isActive?: boolean;
  status?: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  loginAt: string;
  expiresAt: string;
}

/**
 * Persist ONLY non-secret staff session metadata in localStorage (staffId, role, loginAt, expiresAt).
 * NEVER stores password or passwordHash in localStorage.
 */
export function saveStaffSession(staff: StaffUser, ttlMs: number = DEFAULT_SESSION_TTL_MS): StaffSessionData {
  const now = Date.now();
  const clean = stripStaffSecrets(staff);
  const session: StaffSessionData = {
    id: clean.id,
    staffId: clean.id,
    name: clean.name,
    email: clean.email,
    phone: clean.phone,
    role: clean.role,
    permissions: Array.isArray(clean.permissions) ? clean.permissions : [],
    avatar: clean.avatar,
    isActive: clean.isActive !== false,
    status: clean.status || (clean.isActive === false ? 'suspended' : 'active'),
    createdAt: clean.createdAt || new Date(now).toISOString(),
    lastLogin: clean.lastLogin || new Date(now).toISOString(),
    loginAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const serialized = JSON.stringify(session);
      localStorage.setItem(STAFF_SESSION_KEY, serialized);
      localStorage.setItem('kenax_authenticated_role', session.role);
      // Remove legacy password-containing session keys so secrets never linger in browser storage
      localStorage.removeItem('kenax_current_staff');
      localStorage.removeItem('kenax_authenticated_staff');
      localStorage.removeItem('preview_kenax_current_staff');
      localStorage.removeItem('preview_kenax_authenticated_staff');
      localStorage.removeItem('kenax_admin_session');
      localStorage.removeItem('preview_kenax_admin_session');
    } catch {}
  }

  return session;
}

/**
 * Load active non-expired staff session from localStorage (automatically sanitizes legacy keys).
 */
export function loadStaffSession(): StaffUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem(STAFF_SESSION_KEY) ||
      localStorage.getItem('kenax_current_staff') ||
      localStorage.getItem('kenax_authenticated_staff') ||
      localStorage.getItem('preview_kenax_current_staff');

    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || (!parsed.id && !parsed.email)) return null;

    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
      clearStaffSession();
      return null;
    }

    const sanitized = stripStaffSecrets(parsed) as StaffUser;
    // If loaded from legacy key, migrate immediately to clean passwordless session key
    if (!localStorage.getItem(STAFF_SESSION_KEY)) {
      saveStaffSession(sanitized);
    }
    return sanitized;
  } catch {
    return null;
  }
}

export function clearStaffSession(): void {
  if (typeof window === 'undefined') return;
  try {
    [
      STAFF_SESSION_KEY,
      'kenax_current_staff',
      'kenax_authenticated_staff',
      'preview_kenax_current_staff',
      'preview_kenax_authenticated_staff',
      'kenax_admin_session',
      'preview_kenax_admin_session',
      'kenax_authenticated_role',
    ].forEach((k) => localStorage.removeItem(k));
  } catch {}
}
