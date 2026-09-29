import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Key,
  Save,
  X,
  Lock,
  Mail,
  Phone,
  Search,
  Bot,
  MessageSquare,
  Sparkles,
  Zap,
  Boxes,
  ShoppingCart,
  Receipt,
  Users,
  Truck,
  CreditCard,
  Tag,
  Star,
  Globe,
  ClipboardList,
} from 'lucide-react';
import { StaffUser, UserRole } from '../../types';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../lib/permissions';
import {
  cleanBDPhoneNumber,
  validateBangladeshMobile,
  isValidBDMobileNumber,
} from '../../utils/phoneUtils';

interface AdminStaffProps {
  staffList: StaffUser[];
  onAddStaff: (staff: StaffUser) => void;
  onUpdateStaff: (staff: StaffUser) => void;
  onDeleteStaff: (staffId: string) => void;
  onToggleStaffStatus: (staffId: string) => void;
  onRestoreStaff?: (staffId: string) => void;
  currentRole: UserRole;
  currentStaff: StaffUser | null;
}

export const AdminStaff: React.FC<AdminStaffProps> = ({
  staffList,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onToggleStaffStatus,
  onRestoreStaff,
  currentRole,
  currentStaff,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('moderator');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');

  // View Matrix modal
  const [showMatrix, setShowMatrix] = useState(false);

  const openCreateModal = () => {
    setEditingStaff(null);
    setName('');
    setEmail('');
    setPhone('+880 17');
    setPassword('123456');
    setRole('moderator');
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS['moderator']);
    setPermSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffUser) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setPhone(staff.phone || '+880 17');
    setPassword(staff.password || '123456');
    setRole(staff.role);
    setSelectedPermissions(staff.permissions || DEFAULT_ROLE_PERMISSIONS[staff.role]);
    setPermSearch('');
    setIsModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const toggleModulePermissions = (moduleName: string) => {
    const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === moduleName).map((p) => p.id);
    const allModuleSelected = modulePerms.every((id) => selectedPermissions.includes(id));

    if (allModuleSelected) {
      setSelectedPermissions(selectedPermissions.filter((id) => !modulePerms.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedPermissions, ...modulePerms]));
      setSelectedPermissions(combined);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const payload: StaffUser = {
      id: editingStaff ? editingStaff.id : 'staff-' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password: password.trim() || editingStaff?.password || '123456',
      role,
      permissions: selectedPermissions,
      isActive: editingStaff ? editingStaff.isActive : true,
      createdAt: editingStaff?.createdAt || new Date().toISOString(),
      lastLogin: editingStaff?.lastLogin || new Date().toISOString(),
    };

    if (editingStaff) {
      onUpdateStaff(payload);
    } else {
      onAddStaff(payload);
    }

    setIsModalOpen(false);
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'super_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">SUPER ADMIN</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800">MANAGER</span>;
      case 'moderator':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">MODERATOR</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">USER</span>;
    }
  };

  // Group all permissions by module for the matrix
  const permissionModules = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.module)));

  const activeStaff = staffList.filter((s) => !s.isRemoved);
  const deletedStaff = staffList.filter((s) => s.isRemoved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Staff Members & RBAC ({activeStaff.length})</h2>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">Manage internal team roles, access levels, and granular permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMatrix(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            <span>Role Permissions Matrix</span>
          </button>
          {currentRole === 'super_admin' && (
            <button
              onClick={openCreateModal}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Staff Table / Cards */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Active Permissions</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeStaff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getRoleBadge(s.role)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                    {s.phone || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    {s.role === 'super_admin' ? (
                      <span className="text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-full text-[11px] inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span>All Permissions (Full Access)</span>
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {(s.permissions || DEFAULT_ROLE_PERMISSIONS[s.role] || []).includes('chatbot.whatsapp') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              🟢 WhatsApp
                            </span>
                          )}
                          {(s.permissions || DEFAULT_ROLE_PERMISSIONS[s.role] || []).includes('chatbot.telegram') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                              🔵 Telegram
                            </span>
                          )}
                          {(s.permissions || DEFAULT_ROLE_PERMISSIONS[s.role] || []).includes('chatbot.sms') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              📱 SMS
                            </span>
                          )}
                          {(s.permissions || DEFAULT_ROLE_PERMISSIONS[s.role] || []).includes('chatbot.email') && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              📧 Email
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {s.permissions?.length || DEFAULT_ROLE_PERMISSIONS[s.role]?.length || 0} total rules granted
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                    {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('en-GB') : 'Active now'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.isActive ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit Staff"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleStaffStatus(s.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          s.isActive
                            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800'
                            : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800'
                        }`}
                        title={s.isActive ? 'Suspend Staff' : 'Reactivate Staff'}
                      >
                        {s.isActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                      {s.email.toLowerCase() !== 'super@kenaxbd.com' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to permanently delete staff member ${s.name} (${s.email})? This staff account will be removed permanently from the database and login access will be revoked.`)) {
                              onDeleteStaff(s.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Permanently Delete Staff"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Clean, Zero Horizontal Scroll Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {activeStaff.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs font-medium">
              No active staff members found.
            </div>
          ) : (
            activeStaff.map((s) => (
              <div key={s.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{s.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{s.email}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {getRoleBadge(s.role)}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        s.isActive ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Phone</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate text-xs">{s.phone || 'N/A'}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Permissions</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate text-xs">
                      {s.role === 'super_admin' ? 'Full Access' : `${s.permissions?.length || 0} granted`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Login: {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('en-GB') : 'Active'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-1 border border-sky-100 dark:border-sky-800"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => onToggleStaffStatus(s.id)}
                      className={`p-1.5 rounded-lg text-xs font-bold ${
                        s.isActive ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80' : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80'
                      }`}
                      title={s.isActive ? 'Suspend' : 'Activate'}
                    >
                      {s.isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                    {s.email.toLowerCase() !== 'super@kenaxbd.com' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Permanently delete staff member ${s.name}?`)) {
                            onDeleteStaff(s.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Deleted Staff List Section */}
      {deletedStaff.length > 0 && (
        <div className="rounded-2xl bg-white border border-rose-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 bg-rose-50/70 border-b border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Deleted Staff List / সরানো স্টাফ তালিকা</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-black">
                    {deletedStaff.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  এই স্টাফদের লগইন বন্ধ করা হয়েছে, তবে তাদের হিস্ট্রি ও টিম পারফরম্যান্স ডেটা সংরক্ষিত রয়েছে
                </p>
              </div>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Removed Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deletedStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{staff.name}</p>
                          <p className="text-[11px] text-slate-400">{staff.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold capitalize text-slate-600">
                      {staff.role.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {staff.phone || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {staff.removedAt ? new Date(staff.removedAt).toLocaleDateString('en-GB') : 'Recently removed'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <XCircle className="w-3 h-3" />
                        Removed
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {onRestoreStaff && currentRole === 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => onRestoreStaff(staff.id)}
                          className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          title="Restore Staff Account"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Restore Access</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-rose-100">
            {deletedStaff.map((staff) => (
              <div key={staff.id} className="p-3.5 space-y-2 bg-rose-50/20">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shrink-0">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{staff.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{staff.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0 capitalize">
                    {staff.role.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-500">
                    Removed: {staff.removedAt ? new Date(staff.removedAt).toLocaleDateString('en-GB') : 'Recently'}
                  </span>
                  {onRestoreStaff && currentRole === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => onRestoreStaff(staff.id)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
            <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">
                  {editingStaff ? 'Edit Staff Member' : 'Invite New Staff Member'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@kenaxbd.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number (BD)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter login password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="super_admin" className="dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Super Admin (Full Unrestricted Access)</option>
                    <option value="manager" className="dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Manager (Orders, Products, Couriers, Reports)</option>
                    <option value="moderator" className="dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Moderator (Order Status & Reviews Only)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Overrides */}
              {role !== 'super_admin' && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        <span>Granular Access</span>
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(ALL_PERMISSIONS.map((p) => p.id))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Select All Rules
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Quick Permission Presets:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const waInboxPerms = ['whatsapp.inbox', 'whatsapp.reply'];
                          const combined = Array.from(new Set([...selectedPermissions, ...waInboxPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 text-emerald-900 dark:text-emerald-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        <span>WhatsApp Live Inbox & Replies Only (Staff / Manager)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const waAllPerms = ['whatsapp.inbox', 'whatsapp.reply', 'whatsapp.templates', 'whatsapp.settings'];
                          const combined = Array.from(new Set([...selectedPermissions, ...waAllPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300 dark:border-emerald-800"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Full WhatsApp Suite (Inbox + Reply + Templates + Settings)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const tgPerms = ['telegram.view', 'telegram.send'];
                          const combined = Array.from(new Set([...selectedPermissions, ...tgPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/80 hover:bg-sky-200 text-sky-900 dark:text-sky-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200 dark:border-sky-800"
                      >
                        <Bot className="w-3.5 h-3.5 text-sky-700 dark:text-sky-400" />
                        <span>Telegram View & Quick Sender</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const tgAllPerms = ['telegram.view', 'telegram.send', 'telegram.rules', 'telegram.templates', 'telegram.settings'];
                          const combined = Array.from(new Set([...selectedPermissions, ...tgAllPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-800 dark:text-sky-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-300 dark:border-sky-800"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Full Telegram Bot Automation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const cbPerms = ['chatbot.ai', 'chatbot.rules'];
                          const combined = Array.from(new Set([...selectedPermissions, ...cbPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 hover:bg-indigo-200 text-indigo-900 dark:text-indigo-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                        <span>ChatBot AI & Rule Matrix</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const salesPerms = ['orders.view', 'orders.create', 'orders.edit', 'orders.status', 'customers.view', 'whatsapp.inbox', 'whatsapp.reply', 'telegram.view'];
                          const combined = Array.from(new Set([...selectedPermissions, ...salesPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 hover:bg-teal-200 text-teal-900 dark:text-teal-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-teal-200 dark:border-teal-800"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                        <span>Sales & Customer Care Support</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const invPerms = ['products.view', 'products.create', 'products.edit', 'inventory.view', 'inventory.adjust', 'suppliers.view'];
                          const combined = Array.from(new Set([...selectedPermissions, ...invPerms]));
                          setSelectedPermissions(combined);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 text-amber-900 dark:text-amber-200 text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200 dark:border-amber-800"
                      >
                        <Boxes className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        <span>Inventory & Sourcing</span>
                      </button>
                    </div>
                  </div>

                  {/* Search bar inside modal */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Search rules (e.g. WhatsApp, Telegram, Email, SMS, Orders, Products, Costs)..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400"
                    />
                  </div>

                  {/* Permission Modules List */}
                  <div className="space-y-3">
                    {permissionModules.map((moduleName) => {
                      const modulePerms = ALL_PERMISSIONS.filter(
                        (p) =>
                          p.module === moduleName &&
                          (!permSearch.trim() ||
                            p.name.toLowerCase().includes(permSearch.toLowerCase()) ||
                            p.description.toLowerCase().includes(permSearch.toLowerCase()) ||
                            p.id.toLowerCase().includes(permSearch.toLowerCase()))
                      );
                      if (modulePerms.length === 0) return null;

                      const allSelected = modulePerms.every((p) => selectedPermissions.includes(p.id));
                      const isBotModule = moduleName === 'Automation';

                      return (
                        <div
                          key={moduleName}
                          className={`p-3.5 rounded-2xl border ${
                            isBotModule
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300/80 dark:border-emerald-800 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-200/60 dark:border-slate-700">
                            <div className="flex items-center gap-2">
                              {isBotModule ? (
                                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                              <p
                                className={`text-xs font-bold uppercase tracking-wider ${
                                  isBotModule ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'
                                }`}
                              >
                                {moduleName} Module
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleModulePermissions(moduleName)}
                              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 cursor-pointer"
                            >
                              {allSelected ? 'Deselect Module' : 'Select All Module'}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {modulePerms.map((p) => {
                              const isChecked = selectedPermissions.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-white dark:bg-slate-900 border-sky-400 dark:border-sky-600 shadow-2xs'
                                      : 'bg-slate-100/50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(p.id)}
                                    className="rounded text-sky-600 focus:ring-sky-500 shrink-0"
                                  />
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{p.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingStaff ? 'Save Staff Updates' : 'Add Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Permissions Matrix Modal */}
      {showMatrix && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">KenaX BD Role-Based Access Control Matrix</h3>
              </div>
              <button onClick={() => setShowMatrix(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-500 mb-4">
                Comparison of standard capabilities granted to each administrative tier:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold">
                      <th className="py-2.5 px-3 border border-slate-200">Permission Action</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Moderator</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Manager</th>
                      <th className="py-2.5 px-3 border border-slate-200 text-center">Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ALL_PERMISSIONS.map((perm) => (
                      <tr key={perm.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 border border-slate-200">
                          <span className="font-semibold text-slate-800">{perm.name}</span>
                          <span className="text-[10px] text-slate-400 block">{perm.id}</span>
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-center">
                          {DEFAULT_ROLE_PERMISSIONS['moderator'].includes(perm.id) ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline-block" />
                          )}
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-center">
                          {DEFAULT_ROLE_PERMISSIONS['manager'].includes(perm.id) ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 inline-block" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 inline-block" />
                          )}
                        </td>
                        <td className="py-2 px-3 border border-slate-200 text-center bg-purple-50/50">
                          <CheckCircle className="w-4 h-4 text-purple-700 inline-block" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
