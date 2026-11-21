import fs from 'fs';
import path from 'path';
import type { StaffUser } from '../types/index.ts';
import { normalizeBDPhoneNumber } from '../utils/phoneUtils.ts';
import {
  getStaffCredential,
  setStaffCredential,
  deleteStaffCredential,
  revokeStaffTokens,
  sanitizeStaffForResponse,
} from '../lib/serverStaffAuth.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

// Baseline Super Admin metadata ONLY — NEVER contains plaintext passwords or hashes
const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff-super-2',
    name: 'Super Admin',
    email: 'super@kenaxbd.com',
    phone: '01719143897',
    role: 'super_admin',
    permissions: ['*'],
    status: 'active',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'System Root',
  },
];

function migrateAnyInlineSecretToCredentialStore(staff: StaffUser): StaffUser {
  const anyStaff = staff as any;
  const rawSecret =
    (typeof anyStaff.password === 'string' && anyStaff.password.trim()) ||
    (typeof anyStaff.passwordHash === 'string' && anyStaff.passwordHash.trim()) ||
    '';

  if (staff.id && rawSecret && !getStaffCredential(staff.id)) {
    try {
      setStaffCredential(staff.id, staff.email || '', rawSecret, false);
    } catch (err) {
      console.warn('[Server Staff] Failed migrating inline secret to credential store:', err);
    }
  }
  return sanitizeStaffForResponse(staff) as StaffUser;
}

function ensureBootstrapSuperAdminCredential(): void {
  const superId = DEFAULT_STAFF[0].id;
  if (!getStaffCredential(superId)) {
    const envBootstrapPassword = String(process.env.INITIAL_SUPER_ADMIN_PASSWORD || '').trim();
    if (envBootstrapPassword) {
      setStaffCredential(superId, DEFAULT_STAFF[0].email, envBootstrapPassword, false);
    }
  }
}

function readStaffFromFile(filePath: string): StaffUser[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(migrateAnyInlineSecretToCredentialStore);
      }
    }
  } catch (err) {
    console.warn(`[Server Staff] Error reading file ${filePath}:`, err);
  }
  return [];
}

function writeStaffToBothFiles(staffList: StaffUser[]): void {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const sanitized = staffList.map((s) => sanitizeStaffForResponse(s));
    const file1 = path.join(SERVER_STORE_DIR, 'server_staff.json');
    const file2 = path.join(SERVER_STORE_DIR, 'preview_server_staff.json');
    const content = JSON.stringify(sanitized, null, 2);
    fs.writeFileSync(file1, content, 'utf-8');
    fs.writeFileSync(file2, content, 'utf-8');
  } catch (err) {
    console.error('[Server Staff] Error writing staff files:', err);
  }
}

export function getAllStaffFromStore(_isEnvPreview?: boolean): StaffUser[] {
  try {
    ensureBootstrapSuperAdminCredential();
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const file1 = path.join(SERVER_STORE_DIR, 'server_staff.json');
    const file2 = path.join(SERVER_STORE_DIR, 'preview_server_staff.json');

    const list1 = readStaffFromFile(file1);
    const list2 = readStaffFromFile(file2);

    const staffById = new Map<string, StaffUser>();
    const staffByEmail = new Map<string, StaffUser>();

    const mergeEntry = (s: StaffUser) => {
      if (!s || (!s.id && !s.email)) return;
      const clean = sanitizeStaffForResponse(s) as StaffUser;
      const lowerEmail = clean.email ? clean.email.trim().toLowerCase() : '';
      const idKey = clean.id ? clean.id.trim() : '';

      const existing = (idKey ? staffById.get(idKey) : null) || (lowerEmail ? staffByEmail.get(lowerEmail) : null);
      const merged: StaffUser = existing ? { ...existing, ...clean } : { ...clean };

      if (idKey) staffById.set(idKey, merged);
      if (lowerEmail) staffByEmail.set(lowerEmail, merged);
    };

    for (const s of DEFAULT_STAFF) {
      mergeEntry(s);
    }
    for (const s of list2) {
      mergeEntry(s);
    }
    for (const s of list1) {
      mergeEntry(s);
    }

    const seen = new Set<string>();
    const mergedList: StaffUser[] = [];
    for (const s of staffById.values()) {
      const key = s.id || (s.email ? s.email.toLowerCase() : '');
      if (key && !seen.has(key)) {
        seen.add(key);
        mergedList.push(sanitizeStaffForResponse(s) as StaffUser);
      }
    }

    if (mergedList.length > 0) {
      writeStaffToBothFiles(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('[Server Staff] Error getting staff:', err);
  }
  return DEFAULT_STAFF.map((s) => sanitizeStaffForResponse(s) as StaffUser);
}

export function saveStaffToStore(staff: StaffUser, _isEnvPreview?: boolean): StaffUser {
  try {
    const rawPassword = typeof staff.password === 'string' && staff.password.trim() ? staff.password.trim() : '';
    const sanitizedStaff: StaffUser = sanitizeStaffForResponse({
      ...staff,
      email: String(staff.email || '').trim().toLowerCase(),
      phone: staff.phone && staff.phone !== 'N/A' ? normalizeBDPhoneNumber(staff.phone) : staff.phone,
      isActive: staff.isActive !== false && staff.status !== 'suspended',
      status: staff.isActive === false || staff.status === 'suspended' ? 'suspended' : 'active',
    }) as StaffUser;

    const current = getAllStaffFromStore();
    const idx = current.findIndex(
      (s) => s.id === sanitizedStaff.id || (sanitizedStaff.email && s.email && s.email.toLowerCase() === sanitizedStaff.email.toLowerCase())
    );
    const prev = idx >= 0 ? current[idx] : null;

    if (rawPassword) {
      setStaffCredential(sanitizedStaff.id, sanitizedStaff.email, rawPassword, true);
    } else if (prev && (prev.role !== sanitizedStaff.role || prev.isActive !== sanitizedStaff.isActive || prev.status !== sanitizedStaff.status)) {
      revokeStaffTokens(sanitizedStaff.id);
    }

    if (idx >= 0) {
      current[idx] = { ...current[idx], ...sanitizedStaff };
    } else {
      current.unshift(sanitizedStaff);
    }
    writeStaffToBothFiles(current);
    return sanitizeStaffForResponse(sanitizedStaff) as StaffUser;
  } catch (err) {
    console.error('[Server Staff] Error saving staff:', err);
  }
  return sanitizeStaffForResponse(staff) as StaffUser;
}

export function deleteStaffFromStore(staffId: string, _isEnvPreview?: boolean): boolean {
  try {
    const current = getAllStaffFromStore();
    const target = current.find(
      (s) => s.id === staffId || s.email.toLowerCase() === staffId.toLowerCase()
    );
    const filtered = current.filter(
      (s) => s.id !== staffId && s.email.toLowerCase() !== staffId.toLowerCase()
    );
    // Ensure at least one active Super Admin remains
    if (!filtered.some((s) => s.role === 'super_admin' && s.isActive !== false && !s.isRemoved)) {
      return false;
    }
    if (target) {
      deleteStaffCredential(target.id);
    }
    writeStaffToBothFiles(filtered);
    return true;
  } catch (err) {
    console.error('[Server Staff] Error deleting staff:', err);
    return false;
  }
}
