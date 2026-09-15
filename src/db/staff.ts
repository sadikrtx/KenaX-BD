import fs from 'fs';
import path from 'path';
import { StaffUser } from '../types/index.ts';

const SERVER_STORE_DIR = path.join(process.cwd(), 'data');
const SERVER_STAFF_FILE = path.join(SERVER_STORE_DIR, 'server_staff.json');

const DEFAULT_STAFF: StaffUser[] = [
  {
    id: 'staff-super-2',
    name: 'Super Admin',
    email: 'super@kenaxbd.com',
    password: 'sadik@1234',
    phone: '+880 1700-123456',
    role: 'super_admin',
    permissions: ['*'],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'System Root',
  },
];

export function getAllStaffFromStore(): StaffUser[] {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(SERVER_STAFF_FILE)) {
      fs.writeFileSync(SERVER_STAFF_FILE, JSON.stringify(DEFAULT_STAFF, null, 2), 'utf-8');
      return DEFAULT_STAFF;
    }
    const content = fs.readFileSync(SERVER_STAFF_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[Server Staff] Error reading server_staff.json:', err);
  }
  return DEFAULT_STAFF;
}

export function saveStaffToStore(staff: StaffUser): StaffUser {
  try {
    if (!fs.existsSync(SERVER_STORE_DIR)) {
      fs.mkdirSync(SERVER_STORE_DIR, { recursive: true });
    }
    const current = getAllStaffFromStore();
    const idx = current.findIndex(
      (s) => s.id === staff.id || (staff.email && s.email.toLowerCase() === staff.email.toLowerCase())
    );
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...staff };
    } else {
      current.push(staff);
    }
    fs.writeFileSync(SERVER_STAFF_FILE, JSON.stringify(current, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server Staff] Error writing server_staff.json:', err);
  }
  return staff;
}

export function deleteStaffFromStore(staffId: string): boolean {
  try {
    const current = getAllStaffFromStore();
    const filtered = current.filter((s) => s.id !== staffId && s.email.toLowerCase() !== staffId.toLowerCase());
    fs.writeFileSync(SERVER_STAFF_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Server Staff] Error deleting staff:', err);
    return false;
  }
}
