import fs from 'fs';
import path from 'path';
import { StaffUser } from '../types/index.ts';
import { normalizeBDPhoneNumber } from '../utils/phoneUtils.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');

const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff-super-2',
    name: 'Super Admin',
    email: 'super@kenaxbd.com',
    password: 'sadik@1234',
    phone: '01719143897',
    role: 'super_admin',
    permissions: ['*'],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'System Root',
  },
];

function readStaffFromFile(filePath: string): StaffUser[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
    const file1 = path.join(SERVER_STORE_DIR, 'server_staff.json');
    const file2 = path.join(SERVER_STORE_DIR, 'preview_server_staff.json');
    const content = JSON.stringify(staffList, null, 2);
    fs.writeFileSync(file1, content, 'utf-8');
    fs.writeFileSync(file2, content, 'utf-8');
  } catch (err) {
    console.error('[Server Staff] Error writing staff files:', err);
  }
}

export function getAllStaffFromStore(_isEnvPreview?: boolean): StaffUser[] {
  try {
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
      const lowerEmail = s.email ? s.email.trim().toLowerCase() : '';
      const idKey = s.id ? s.id.trim() : '';

      const existing = (idKey ? staffById.get(idKey) : null) || (lowerEmail ? staffByEmail.get(lowerEmail) : null);
      // Saved / incoming staff takes full precedence over baseline default
      const merged: StaffUser = existing ? { ...existing, ...s } : { ...s };

      if (idKey) staffById.set(idKey, merged);
      if (lowerEmail) staffByEmail.set(lowerEmail, merged);
    };

    // 1. DEFAULT_STAFF baseline (lowest priority)
    for (const s of DEFAULT_STAFF) {
      mergeEntry(s);
    }

    // 2. Merge from preview store
    for (const s of list2) {
      mergeEntry(s);
    }

    // 3. Merge from primary store (highest priority on server)
    for (const s of list1) {
      mergeEntry(s);
    }

    const seen = new Set<string>();
    const mergedList: StaffUser[] = [];
    for (const s of staffById.values()) {
      const key = s.id || (s.email ? s.email.toLowerCase() : '');
      if (key && !seen.has(key)) {
        seen.add(key);
        mergedList.push(s);
      }
    }

    if (mergedList.length > 0) {
      // Sync back to both stores so both are always 100% identical and up-to-date
      writeStaffToBothFiles(mergedList);
      return mergedList;
    }
  } catch (err) {
    console.warn('[Server Staff] Error getting staff:', err);
  }
  return DEFAULT_STAFF;
}

export function saveStaffToStore(staff: StaffUser, _isEnvPreview?: boolean): StaffUser {
  try {
    const sanitizedStaff: StaffUser = {
      ...staff,
      phone: staff.phone && staff.phone !== 'N/A' ? normalizeBDPhoneNumber(staff.phone) : staff.phone,
    };
    const current = getAllStaffFromStore();
    const idx = current.findIndex(
      (s) => s.id === sanitizedStaff.id || (sanitizedStaff.email && s.email && s.email.toLowerCase() === sanitizedStaff.email.toLowerCase())
    );
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...sanitizedStaff };
    } else {
      current.unshift(sanitizedStaff);
    }
    writeStaffToBothFiles(current);
    return sanitizedStaff;
  } catch (err) {
    console.error('[Server Staff] Error saving staff:', err);
  }
  return staff;
}

export function deleteStaffFromStore(staffId: string, _isEnvPreview?: boolean): boolean {
  try {
    const current = getAllStaffFromStore();
    const filtered = current.filter(
      (s) => s.id !== staffId && s.email.toLowerCase() !== staffId.toLowerCase()
    );
    // Ensure Super Admin is never deleted completely
    if (!filtered.some((s) => s.role === 'super_admin')) {
      filtered.push(DEFAULT_STAFF[0]);
    }
    writeStaffToBothFiles(filtered);
    return true;
  } catch (err) {
    console.error('[Server Staff] Error deleting staff:', err);
    return false;
  }
}

