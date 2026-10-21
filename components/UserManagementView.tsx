import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Icons } from './Icons';

interface StaffUser {
  _id: string;
  username: string;
  useremail: string;
  userNumber: string;
  role: 'admin' | 'user' | 'cert' | 'hr';
  password?: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  user: 'bg-blue-100 text-blue-700',
  cert: 'bg-emerald-100 text-emerald-700',
  hr: 'bg-pink-100 text-pink-700',
};

const emptyForm = { username: '', useremail: '', userNumber: '', password: '', role: 'user' as StaffUser['role'] };

const UserFormModal = ({
  isOpen,
  onClose,
  onSave,
  initial,
  isSaving,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: typeof emptyForm) => void;
  initial: Partial<StaffUser> | null;
  isSaving: boolean;
  error: string;
}) => {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        username: initial.username || '',
        useremail: initial.useremail || '',
        userNumber: initial.userNumber || '',
        password: '',
        role: initial.role || 'user',
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial, isOpen]);

  if (!isOpen) return null;

  const isEdit = !!initial?._id;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} disabled={isSaving} className="p-2 hover:bg-slate-100 rounded-full">
            <Icons.X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Username *</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Abhi"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email *</label>
            <input
              type="email"
              value={form.useremail}
              onChange={(e) => setForm(f => ({ ...f, useremail: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. user@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number *</label>
            <input
              type="text"
              value={form.userNumber}
              onChange={(e) => setForm(f => ({ ...f, userNumber: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 919025620238"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Enter password'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm(f => ({ ...f, role: e.target.value as StaffUser['role'] }))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              {/* <option value="cert">Cert</option> */}
              <option value="hr">HR</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.username.trim() || !form.useremail.trim() || !form.userNumber.trim() || (!isEdit && !form.password.trim())}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isSaving && <Icons.RefreshCcw className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserManagementView: React.FC = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getStaff();
      if (res.success) setStaff(res.staff);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const openAdd = () => {
    setEditingUser(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (user: StaffUser) => {
    setEditingUser(user);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (form: typeof emptyForm) => {
    setFormError('');
    setIsSaving(true);
    try {
      if (editingUser) {
        const payload: any = {
          username: form.username,
          useremail: form.useremail,
          userNumber: form.userNumber,
          role: form.role,
        };
        if (form.password.trim()) payload.password = form.password;
        await apiService.updateStaff(editingUser._id, payload);
        showToast('User updated successfully');
      } else {
        await apiService.createStaff(form);
        showToast('User created successfully');
      }
      setIsModalOpen(false);
      loadStaff();
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiService.deleteStaff(id);
      setDeleteConfirmId(null);
      showToast('User deleted');
      loadStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-800 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2">
          {toastMsg}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-slate-800">User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">{staff.length} user{staff.length !== 1 ? 's' : ''} in the system</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
          >
            <Icons.Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-20 text-slate-400 italic">No users found</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">User</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden sm:table-cell">Email</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left hidden md:table-cell">Phone</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-left">Role</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase shrink-0">
                            {u.username.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{u.useremail}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{u.userNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${ROLE_STYLES[u.role] || 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {deleteConfirmId === u._id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-500 font-semibold">Confirm?</span>
                            <button
                              onClick={() => handleDelete(u._id)}
                              disabled={isDeleting}
                              className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              {isDeleting ? '...' : 'Yes, Delete'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Icons.Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(u._id)}
                              className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Icons.Trash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initial={editingUser}
        isSaving={isSaving}
        error={formError}
      />
    </div>
  );
};

export default UserManagementView;
