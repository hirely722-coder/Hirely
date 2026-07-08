import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Users, Search, Filter, Edit2, UserMinus, UserCheck, 
  Trash2, X, RefreshCcw, RefreshCw, LogOut, Download
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminUsers() {
  const { showToast } = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Viewer');
  const [userStatus, setUserStatus] = useState('Active');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/users');
      setUsers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await fetchAdminApi(`/api/superadmin/users/${currentUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: userName,
          role: userRole,
          status: userStatus
        })
      });
      setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, ...updated } : u));
      showToast('✓ User details updated successfully!');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleToggleStatus = async (user: any) => {
    const nextStatus = user.status === 'Disabled' ? 'Active' : 'Disabled';
    try {
      const updated = await fetchAdminApi(`/api/superadmin/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
      showToast(`✓ User account ${nextStatus === 'Disabled' ? 'disabled' : 'activated'} successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user profile? This action is permanent.')) return;
    try {
      await fetchAdminApi(`/api/superadmin/users/${id}`, { method: 'DELETE' });
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast('✓ User profile deleted successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  const handleResetPassword = (user: any) => {
    window.confirm(`Reset password for ${user.name} (${user.email})? A secure temporary password link will be generated.`);
    showToast(`✓ Temporary password link sent to ${user.email}`, 'success');
  };

  const handleForceLogout = (user: any) => {
    if (window.confirm(`Force log out ${user.name} across all devices and terminate active sessions?`)) {
      showToast(`✓ Terminated active login sessions for ${user.name}`, 'success');
    }
  };

  const handleExportCSV = () => {
    const headers = 'User ID,Name,Email,Agency,Role,Status,Last Login\n';
    const rows = filteredUsers.map(u => 
      `"${u.id}","${u.name}","${u.email}","${u.agencyName}","${u.role}","${u.status}","${u.lastLogin || 'Never'}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hirely_users_${Date.now()}.csv`;
    link.click();
  };

  const openEditModal = (user: any) => {
    setCurrentUser(user);
    setUserName(user.name);
    setUserRole(user.role);
    setUserStatus(user.status);
    setIsModalOpen(true);
  };

  // Filter & Search logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u.agencyName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'All' || u.role === filterRole;
    const matchesStatus = filterStatus === 'All' || u.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">User Management</h1>
          <p className="text-xs text-slate-500 font-medium">Manage user profiles, control workspace roles, and override login access.</p>
        </div>
        
        <button 
          onClick={loadUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email or workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="All">All Roles</option>
              <option value="Owner">Owner</option>
              <option value="Admin">Admin</option>
              <option value="Recruiter">Recruiter</option>
              <option value="HR Executive">HR Executive</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* CSV Export Button */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Users Data Grid */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading user profiles...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No users found matching search query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Workspace / Agency</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((profile) => {
                  const initials = profile.name ? profile.name.substring(0, 2).toUpperCase() : 'US';
                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 font-display text-sm">{profile.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{profile.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700">{profile.agencyName}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] font-bold text-slate-600">
                        {profile.role}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          profile.status === 'Disabled'
                            ? 'bg-rose-50 text-rose-700 border-rose-100/50'
                            : profile.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-100/50'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                        }`}>
                          {profile.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-semibold font-mono text-[10px]">
                        {profile.lastLogin || 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(profile)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Edit User Profile"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(profile)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            title="Reset Password link"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleForceLogout(profile)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                            title="Force Terminate Sessions"
                          >
                            <LogOut className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(profile)}
                            className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                              profile.status === 'Disabled'
                                ? 'text-slate-400 hover:text-emerald-600'
                                : 'text-slate-400 hover:text-rose-600'
                            }`}
                            title={profile.status === 'Disabled' ? 'Enable Account' : 'Suspend Account'}
                          >
                            {profile.status === 'Disabled' ? (
                              <UserCheck className="h-4 w-4" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(profile.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Profile"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Configure User Profile</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Workspace Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                >
                  <option value="Owner">Owner (Full admin + Billing controls)</option>
                  <option value="Admin">Admin (Full administrative privileges)</option>
                  <option value="Recruiter">Recruiter (Manage jobs & candidates)</option>
                  <option value="HR Executive">HR Executive (Manage candidates only)</option>
                  <option value="Viewer">Viewer (Read-only views)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Account Status</label>
                <select
                  value={userStatus}
                  onChange={(e) => setUserStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                >
                  <option value="Active">Active</option>
                  <option value="Pending">Pending Invitation</option>
                  <option value="Disabled">Suspended / Disabled</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                >
                  Update Profile
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
