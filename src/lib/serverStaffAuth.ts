/**
 * Server-Side Staff Authentication, Salted Scrypt Password Storage,
 * Firebase Auth ID Token Verification & RBAC Authorization Middleware.
 *
 * Security Invariants:
 * 1. Passwords are NEVER stored in plaintext or fast unsalted SHA-256.
 *    All credentials use per-user 16-byte random salt + Node.js `crypto.scryptSync` (N=16384, r=8, p=1)
 *    verified via `crypto.timingSafeEqual`.
 * 2. Credentials are stored strictly in a server-only credential store (`staff_credentials`),
 *    NEVER exposed to browser clients or included in `staff` records.
 * 3. Client-supplied headers (`x-staff-role`, `x-staff-email`, `x-staff-id`) and body fields
 *    (`actorRole`, `actorEmail`, `actorId`) are NEVER trusted for authentication or authorization.
 * 4. Every protected request requires a cryptographically verified `Authorization: Bearer <token>`
 *    (Firebase Auth ID token OR server-signed HMAC-SHA256 staff token issued strictly after
 *    server-side credential verification) cross-checked against live staff status & role.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import type { StaffUser, UserRole } from '../types/index.ts';

const SCRYPT_PREFIX = 'scrypt:';
const LEGACY_SHA256_PREFIX = 'sha256:';
const LEGACY_SHA256_NAMESPACE = 'kenaxbd-staff-v1:';
const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

const DATA_DIR = path.join(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'server_staff_credentials.json');
const SESSION_SECRET_FILE = path.join(DATA_DIR, '.staff_token_secret');

export const ALLOWED_STAFF_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'admin',
  'manager',
  'moderator',
]);

export interface StoredStaffCredential {
  staffId: string;
  email: string;
  passwordHash: string; // scrypt:<saltHex>:<derivedKeyHex>
  tokenVersion: number;
  updatedAt: string;
}

export interface VerifiedStaffContext {
  staffId: string;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  tokenSource: 'firebase_id_token' | 'server_signed_token';
}

// ---------------------------------------------------------------------------
// 1. Per-User Salted Scrypt Password Hashing & Constant-Time Verification
// ---------------------------------------------------------------------------

export function isScryptHash(value?: string | null): boolean {
  return Boolean(value && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/i.test(String(value).trim()));
}

export function hashPasswordScrypt(plainPassword: string): string {
  const password = String(plainPassword ?? '');
  if (!password) {
    throw new Error('Password cannot be empty.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString('hex');
  return `${SCRYPT_PREFIX}${salt}:${derived}`;
}

function timingSafeHexEqual(expectedHex: string, candidateHex: string): boolean {
  try {
    const a = Buffer.from(String(expectedHex || ''), 'hex');
    const b = Buffer.from(String(candidateHex || ''), 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPasswordAgainstHash(
  plainPassword: string,
  storedHash?: string | null,
  legacyPlaintext?: string | null
): { valid: boolean; needsUpgrade: boolean } {
  const candidate = String(plainPassword ?? '');
  if (!candidate) return { valid: false, needsUpgrade: false };

  const trimmedHash = String(storedHash || '').trim();

  // 1. Preferred: per-user salted scrypt
  if (isScryptHash(trimmedHash)) {
    const parts = trimmedHash.slice(SCRYPT_PREFIX.length).split(':');
    if (parts.length !== 2) return { valid: false, needsUpgrade: false };
    const [saltHex, expectedKeyHex] = parts;
    const derivedHex = crypto.scryptSync(candidate, saltHex, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString('hex');
    return {
      valid: timingSafeHexEqual(expectedKeyHex, derivedHex),
      needsUpgrade: false,
    };
  }

  // 2. Legacy transition ONLY: unsalted SHA-256 -> auto-upgrade to salted scrypt on login
  if (trimmedHash.toLowerCase().startsWith(LEGACY_SHA256_PREFIX)) {
    const expectedSha = trimmedHash.slice(LEGACY_SHA256_PREFIX.length).toLowerCase();
    const candidateSha = crypto
      .createHash('sha256')
      .update(`${LEGACY_SHA256_NAMESPACE}${candidate}`, 'utf8')
      .digest('hex');
    const valid = timingSafeHexEqual(expectedSha, candidateSha);
    return { valid, needsUpgrade: valid };
  }

  // 3. Legacy transition ONLY: plaintext -> auto-upgrade to salted scrypt on login
  if (typeof legacyPlaintext === 'string' && legacyPlaintext.length > 0) {
    const a = Buffer.from(legacyPlaintext, 'utf8');
    const b = Buffer.from(candidate, 'utf8');
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { valid, needsUpgrade: valid };
  }

  return { valid: false, needsUpgrade: false };
}

// ---------------------------------------------------------------------------
// 2. Server-Only Credential Store (NEVER returned to clients)
// ---------------------------------------------------------------------------

function readCredentialsMap(): Record<string, StoredStaffCredential> {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('[Server Staff Auth] Failed reading credentials store:', err);
  }
  return {};
}

function writeCredentialsMap(map: Record<string, StoredStaffCredential>): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(map, null, 2), { encoding: 'utf-8', mode: 0o600 });
}

export function getStaffCredential(staffId: string): StoredStaffCredential | null {
  if (!staffId) return null;
  const map = readCredentialsMap();
  return map[staffId] || null;
}

export function setStaffCredential(
  staffId: string,
  email: string,
  plainOrScryptPassword: string,
  bumpTokenVersion: boolean = false
): StoredStaffCredential {
  const map = readCredentialsMap();
  const existing = map[staffId];
  const passwordHash = isScryptHash(plainOrScryptPassword)
    ? plainOrScryptPassword
    : hashPasswordScrypt(plainOrScryptPassword);
  const next: StoredStaffCredential = {
    staffId,
    email: String(email || '').trim().toLowerCase(),
    passwordHash,
    tokenVersion: (existing?.tokenVersion || 1) + (bumpTokenVersion ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };
  map[staffId] = next;
  writeCredentialsMap(map);
  return next;
}

export function revokeStaffTokens(staffId: string): void {
  if (!staffId) return;
  const map = readCredentialsMap();
  const existing = map[staffId];
  if (existing) {
    existing.tokenVersion = (existing.tokenVersion || 1) + 1;
    existing.updatedAt = new Date().toISOString();
    map[staffId] = existing;
    writeCredentialsMap(map);
  }
}

export function deleteStaffCredential(staffId: string): void {
  if (!staffId) return;
  const map = readCredentialsMap();
  if (map[staffId]) {
    delete map[staffId];
    writeCredentialsMap(map);
  }
}

export function sanitizeStaffForResponse<T extends Partial<StaffUser>>(staff: T): Omit<T, 'password' | 'passwordHash'> {
  const copy: any = { ...staff };
  delete copy.password;
  delete copy.passwordHash;
  return copy;
}

// ---------------------------------------------------------------------------
// 3. Server-Signed Token & Firebase Auth ID Token Verification
// ---------------------------------------------------------------------------

let cachedSecret: string | null = null;

function getTokenSigningSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.STAFF_AUTH_TOKEN_SECRET && process.env.STAFF_AUTH_TOKEN_SECRET.length >= 32) {
    cachedSecret = process.env.STAFF_AUTH_TOKEN_SECRET;
    return cachedSecret;
  }
  try {
    if (fs.existsSync(SESSION_SECRET_FILE)) {
      const s = fs.readFileSync(SESSION_SECRET_FILE, 'utf-8').trim();
      if (s.length >= 32) {
        cachedSecret = s;
        return cachedSecret;
      }
    }
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(SESSION_SECRET_FILE, generated, { encoding: 'utf-8', mode: 0o600 });
    cachedSecret = generated;
    return cachedSecret;
  } catch {
    cachedSecret = crypto.randomBytes(48).toString('hex');
    return cachedSecret;
  }
}

interface SignedStaffTokenPayload {
  iss: 'kenaxbd-staff-auth';
  sub: string; // staffId
  email: string;
  role: string;
  tv: number; // tokenVersion for immediate server-side revocation
  iat: number;
  exp: number;
}

export function signServerStaffToken(
  staff: StaffUser,
  tokenVersion: number,
  ttlSeconds: number = 12 * 60 * 60
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload: SignedStaffTokenPayload = {
    iss: 'kenaxbd-staff-auth',
    sub: staff.id,
    email: String(staff.email || '').trim().toLowerCase(),
    role: String(staff.role || '').trim().toLowerCase(),
    tv: tokenVersion,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  const sigB64 = crypto
    .createHmac('sha256', getTokenSigningSecret())
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${sigB64}`;
}

export function verifyServerStaffToken(token: string): SignedStaffTokenPayload | null {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto
      .createHmac('sha256', getTokenSigningSecret())
      .update(signingInput)
      .digest('base64url');

    const a = Buffer.from(expectedSig, 'utf8');
    const b = Buffer.from(sigB64, 'utf8');
    if (a.length === 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SignedStaffTokenPayload;
    if (!payload || payload.iss !== 'kenaxbd-staff-auth' || !payload.sub || !payload.exp) {
      return null;
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getFirebaseAdminAuthSafe() {
  try {
    const app = getApps().length
      ? getApp()
      : initializeApp({ projectId: firebaseConfig.projectId });
    return getAuth(app);
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdTokenSafe(
  token: string
): Promise<{ uid: string; email?: string; staffId?: string; role?: string } | null> {
  try {
    const adminAuth = getFirebaseAdminAuthSafe();
    if (!adminAuth) return null;
    // Standard verifyIdToken uses Firebase Auth public keys (needs no IAM)
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded || !decoded.uid) return null;
    return {
      uid: decoded.uid,
      email: typeof decoded.email === 'string' ? decoded.email.trim().toLowerCase() : undefined,
      staffId: typeof decoded.staffId === 'string' ? decoded.staffId : undefined,
      role: typeof decoded.role === 'string' ? decoded.role : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 4. Live Staff Authorization Verification (ZERO Header Trust)
// ---------------------------------------------------------------------------

export function isStaffAccountActive(staff?: StaffUser | null): boolean {
  if (!staff) return false;
  if (staff.isRemoved) return false;
  if (staff.isActive === false) return false;
  if (String(staff.status || '').toLowerCase() === 'suspended') return false;
  if (!ALLOWED_STAFF_ROLES.has(String(staff.role || '').toLowerCase())) return false;
  return true;
}

export interface StaffLookupProvider {
  getAllStaff: (req?: express.Request) => Promise<StaffUser[]> | StaffUser[];
  getTokenVersion?: (staffId: string) => Promise<number> | number;
  verifyFirebaseIdToken?: (token: string) => Promise<{ uid: string; email?: string; staffId?: string; role?: string } | null>;
}

/**
 * Verify a request strictly via `Authorization: Bearer <token>`.
 * NEVER reads or trusts `x-staff-role`, `x-staff-email`, `x-staff-id`, or `req.body.actor*`.
 */
export async function authenticateStaffBearerRequest(
  req: express.Request,
  provider: StaffLookupProvider
): Promise<{ ok: true; staff: VerifiedStaffContext } | { ok: false; status: number; error: string; message: string }> {
  const authHeader = String(req.headers.authorization || '').trim();
  if (!authHeader.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      error: 'missing_authorization_token',
      message: 'Authentication required: missing Authorization Bearer token.',
    };
  }

  const rawToken = authHeader.slice(7).trim();
  if (!rawToken || rawToken.length < 20) {
    return {
      ok: false,
      status: 401,
      error: 'invalid_authorization_token',
      message: 'Authentication failed: malformed Bearer token.',
    };
  }

  const verifyFb = provider.verifyFirebaseIdToken || verifyFirebaseIdTokenSafe;
  let tokenIdentity: {
    staffId?: string;
    uid: string;
    email?: string;
    tokenVersion?: number;
    tokenSource: 'firebase_id_token' | 'server_signed_token';
  } | null = null;

  // 1. Try Firebase Auth ID token first
  const fbDecoded = await verifyFb(rawToken);
  if (fbDecoded) {
    tokenIdentity = {
      staffId: fbDecoded.staffId,
      uid: fbDecoded.uid,
      email: fbDecoded.email,
      tokenSource: 'firebase_id_token',
    };
  } else {
    // 2. Try server-signed HMAC staff token (issued only after server-side password verification)
    const serverDecoded = verifyServerStaffToken(rawToken);
    if (serverDecoded) {
      tokenIdentity = {
        staffId: serverDecoded.sub,
        uid: serverDecoded.sub,
        email: serverDecoded.email,
        tokenVersion: serverDecoded.tv,
        tokenSource: 'server_signed_token',
      };
    }
  }

  if (!tokenIdentity) {
    return {
      ok: false,
      status: 401,
      error: 'invalid_or_expired_token',
      message: 'Authentication failed: invalid or expired Bearer token.',
    };
  }

  // Cross-check live staff record (never trust claims alone if staff was suspended/deleted/demoted)
  const staffList = await Promise.resolve(provider.getAllStaff(req));
  const matched = staffList.find((s) => {
    const sId = String(s?.id || '').trim();
    const sUid = String((s as any)?.firebaseUid || '').trim();
    const sEmail = String(s?.email || '').trim().toLowerCase();
    return (
      (tokenIdentity!.staffId && sId === tokenIdentity!.staffId) ||
      (tokenIdentity!.uid && sUid && sUid === tokenIdentity!.uid) ||
      (tokenIdentity!.email && sEmail && sEmail === tokenIdentity!.email)
    );
  });

  if (!matched) {
    return {
      ok: false,
      status: 403,
      error: 'staff_not_found',
      message: 'Forbidden: authenticated user is not a registered staff member.',
    };
  }

  if (!isStaffAccountActive(matched)) {
    return {
      ok: false,
      status: 403,
      error: 'staff_inactive_or_suspended',
      message: 'Forbidden: staff account is inactive, suspended, or removed.',
    };
  }

  // Enforce server-side token revocation version for server-signed tokens
  if (tokenIdentity.tokenSource === 'server_signed_token') {
    const expectedVersion = provider.getTokenVersion
      ? await Promise.resolve(provider.getTokenVersion(matched.id))
      : getStaffCredential(matched.id)?.tokenVersion || 1;
    if (tokenIdentity.tokenVersion !== expectedVersion) {
      return {
        ok: false,
        status: 401,
        error: 'token_revoked',
        message: 'Session has been revoked. Please sign in again.',
      };
    }
  }

  return {
    ok: true,
    staff: {
      staffId: matched.id,
      uid: tokenIdentity.uid,
      email: String(matched.email || '').trim().toLowerCase(),
      name: matched.name || 'Staff',
      role: matched.role,
      permissions: Array.isArray(matched.permissions) ? matched.permissions : [],
      tokenSource: tokenIdentity.tokenSource,
    },
  };
}

export function createRequireStaffMiddleware(
  provider: StaffLookupProvider,
  allowedRoles?: ReadonlyArray<string>
) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await authenticateStaffBearerRequest(req, provider);
      if (result.ok === false) {
        return res.status(result.status).json({
          ok: false,
          error: result.error,
          message: result.message,
          now: new Date().toISOString(),
        });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(result.staff.role)) {
        return res.status(403).json({
          ok: false,
          error: 'forbidden_insufficient_role',
          message: `Forbidden: requires role in [${allowedRoles.join(', ')}].`,
          now: new Date().toISOString(),
        });
      }

      (req as any).verifiedStaff = result.staff;
      return next();
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: 'auth_verification_error',
        message: err?.message || 'Failed to verify staff authentication.',
        now: new Date().toISOString(),
      });
    }
  };
}
