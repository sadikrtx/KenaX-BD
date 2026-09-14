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
} from 'lucide-react';
import { StaffUser, UserRole } from '../../types';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../../lib/permissions';

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
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">SUPER ADMIN</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">MANAGER</span>;
      case 'moderator':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">MODERATOR</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">USER</span>;
    }
  };

  // Group all permissions by module for the matrix
  const permissionModules = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.module)));

  const activeStaff = staffList.filter((s) => !s.isRemoved);
  const deletedStaff = staffList.filter((s) => s.isRemoved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900">Staff Members & RBAC ({activeStaff.length})</h2>
          <p className="hidden sm:block text-xs text-slate-500">Manage internal team roles, access levels, and granular permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMatrix(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
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

      {/* Active Staff Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Active Permissions</th>
                <th className="py-3.5 px-4">Last Login</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeStaff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getRoleBadge(s.role)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {s.phone || 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {s.role === 'super_admin' ? (
                      <span className="text-purple-700 font-bold">All Permissions (Full Access)</span>
                    ) : (
                      <span>{s.permissions?.length || DEFAULT_ROLE_PERMISSIONS[s.role]?.length || 0} granted</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {s.lastLogin ? new Date(s.lastLogin).toLocaleDateString('en-GB') : 'Active now'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                        title="Edit Staff"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleStaffStatus(s.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          s.isActive
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
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
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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

          <div className="overflow-x-auto">
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
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base">
                  {editingStaff ? 'Edit Staff Member' : 'Invite New Staff Member'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Ahmed"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@kenaxbd.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (BD)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1711-..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter login password"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Role *</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white font-bold"
                  >
                    <option value="super_admin">Super Admin (Full Unrestricted Access)</option>
                    <option value="manager">Manager (Orders, Products, Couriers, Reports)</option>
                    <option value="moderator">Moderator (Order Status & Reviews Only)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Overrides */}
              {role !== 'super_admin' && (
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
                    Granular Access Permissions
                  </h4>
                  <div className="space-y-4">
                    {permissionModules.map((moduleName) => {
                      const modulePerms = ALL_PERMISSIONS.filter((p) => p.module === moduleName);
                      return (
                        <div key={moduleName} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                            {moduleName} Module
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modulePerms.map((p) => (
                              <label
                                key={p.id}
                                className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(p.id)}
                                  onChange={() => togglePermission(p.id)}
                                  className="rounded text-sky-600 focus:ring-sky-500"
                                />
                                <span>{p.name}</span>
                              </label>
                            ))}
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
      )}
    </div>
  );
};
