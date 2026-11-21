import type { Auth } from 'firebase/auth';
import type { StaffUser, UserRole } from '../types/index.ts';

export const STAFF_SESSION_KEY = 'kenax_staff_session';
const SERVER_STAFF_TOKEN_KEY = 'kenax_staff_server_token';
const DEFAULT_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory bearer token fallback for local Express dev mode (cleared on logout)
let inMemoryServerStaffToken: string | null = null;

/**
 * Store a server-issued signed staff token in memory + sessionStorage (never localStorage)
 * for environments where Firebase Custom Token IAM signing is unavailable (local dev).
 */
export function setServerStaffToken(token: string | null): void {
  inMemoryServerStaffToken = token ? token.trim() : null;
  if (typeof window !== 'undefined') {
    try {
      if (inMemoryServerStaffToken) {
        window.sessionStorage.setItem(SERVER_STAFF_TOKEN_KEY, inMemoryServerStaffToken);
      } else {
        window.sessionStorage.removeItem(SERVER_STAFF_TOKEN_KEY);
      }
    } catch {}
  }
}

export function getServerStaffToken(): string | null {
  if (inMemoryServerStaffToken) return inMemoryServerStaffToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(SERVER_STAFF_TOKEN_KEY);
      if (stored) {
        inMemoryServerStaffToken = stored;
        return stored;
      }
    } catch {}
  }
  return null;
}

/**
 * Resolve the authoritative Bearer token for protected staff API requests.
 * Prefers a live Firebase Auth ID token (with Custom Claims), falling back to a
 * server-issued HMAC staff token when running against the local Express dev server.
 * NEVER sends spoofable `x-staff-role` or `x-staff-email` headers.
 */
export async function getStaffAuthBearerToken(
  firebaseAuth?: Auth | null,
  forceRefresh = false
): Promise<string | null> {
  try {
    if (firebaseAuth?.currentUser) {
      const idToken = await firebaseAuth.currentUser.getIdToken(forceRefresh);
      if (idToken) return idToken;
    }
  } catch {
    // Fall through to local dev server-signed token if Firebase Auth is not signed in
  }
  return getServerStaffToken();
}

/**
 * Remove sensitive password fields before exposing staff records to UI state or browser session storage.
 */
export function stripStaffSecrets<T extends Partial<StaffUser>>(
  staff: T
): Omit<T, 'password' | 'passwordHash'> & {
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
  firebaseUid?: string;
  createdAt: string;
  lastLogin?: string;
  loginAt: string;
  expiresAt: string;
}

/**
 * Persist ONLY non-secret staff session metadata in localStorage (staffId, role, loginAt, expiresAt).
 * NEVER stores password, passwordHash, or secrets in localStorage.
 */
export function saveStaffSession(
  staff: StaffUser,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): StaffSessionData {
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
    firebaseUid: (clean as any).firebaseUid,
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
    if (!localStorage.getItem(STAFF_SESSION_KEY)) {
      saveStaffSession(sanitized);
    }
    return sanitized;
  } catch {
    return null;
  }
}

export function clearStaffSession(): void {
  setServerStaffToken(null);
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
