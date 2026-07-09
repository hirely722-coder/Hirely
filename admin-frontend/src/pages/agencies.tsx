import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Building2, Plus, Search, Filter, Download, Eye, Edit2, 
  UserMinus, UserCheck, Trash2, Key, X, Check, ShieldAlert
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminAgencies() {
  const { showToast } = useApp();
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAgency, setCurrentAgency] = useState<any>(null);
  const [agencyName, setAgencyName] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [plans, setPlans] = useState<any[]>([]);

  const loadAgencies = async () => {
    setLoading(true);
    try {
      const [agenciesData, plansData] = await Promise.all([
        fetchAdminApi('/api/superadmin/agencies'),
        fetchAdminApi('/api/superadmin/plans')
      ]);
      setAgencies(agenciesData);
      setPlans(plansData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentAgency) {
        // Update
        const updated = await fetchAdminApi(`/api/superadmin/agencies/${currentAgency.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: agencyName,
            subscriptionPlan,
            subscriptionStatus
          })
        });
        setAgencies(prev => prev.map(a => a.id === currentAgency.id ? { ...a, ...updated } : a));
        showToast('✓ Agency updated successfully!');
      } else {
        // Create
        const created = await fetchAdminApi('/api/superadmin/agencies', {
          method: 'POST',
          body: JSON.stringify({
            name: agencyName,
            subscriptionPlan
          })
        });
        setAgencies(prev => [created, ...prev]);
        showToast('✓ Agency registered successfully!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleToggleStatus = async (agency: any) => {
    const nextStatus = agency.subscriptionStatus === 'suspended' ? 'active' : 'suspended';
    try {
      const updated = await fetchAdminApi(`/api/superadmin/agencies/${agency.id}`, {
        method: 'PUT',
        body: JSON.stringify({ subscriptionStatus: nextStatus })
      });
      setAgencies(prev => prev.map(a => a.id === agency.id ? { ...a, ...updated } : a));
      showToast(`✓ Agency ${nextStatus === 'suspended' ? 'suspended' : 'activated'} successfully!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this agency workspace? This will remove all associated database records.')) return;
    try {
      await fetchAdminApi(`/api/superadmin/agencies/${id}`, { method: 'DELETE' });
      setAgencies(prev => prev.filter(a => a.id !== id));
      showToast('✓ Agency deleted successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete agency', 'error');
    }
  };

  const handleImpersonate = async (agency: any) => {
    try {
      const result = await fetchAdminApi(`/api/superadmin/agencies/${agency.id}/impersonate`, { method: 'POST' });
      showToast(`🔑 Impersonating Chal Chale... Redirecting shortly.`, 'success');
      
      // Store impersonated credentials to localStorage and reload
      localStorage.setItem('hirely_impersonated_user', JSON.stringify(result.user));
      // Simulate switching context back to Recruiter dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (err: any) {
      showToast(err.message || 'Impersonation failed', 'error');
    }
  };

  const handleExportCSV = () => {
    const headers = 'Agency ID,Name,Slug,Plan,Status,Users,Candidates,Jobs,Storage(MB)\n';
    const rows = filteredAgencies.map(a => 
      `"${a.id}","${a.name}","${a.slug}","${a.subscriptionPlan}","${a.subscriptionStatus}",${a.usersCount},${a.candidatesCount},${a.jobsCount},${a.storageUsedMb}`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hirely_agencies_${Date.now()}.csv`;
    link.click();
  };

  const openEditModal = (agency: any) => {
    setCurrentAgency(agency);
    setAgencyName(agency.name);
    setSubscriptionPlan(agency.subscriptionPlan);
    setSubscriptionStatus(agency.subscriptionStatus);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setCurrentAgency(null);
    setAgencyName('');
    setSubscriptionPlan(plans[0]?.slug || 'starter');
    setSubscriptionStatus('active');
    setIsModalOpen(true);
  };

  // Filter & Search logic
  const filteredAgencies = agencies.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'All' || a.subscriptionPlan === filterPlan;
    const matchesStatus = filterStatus === 'All' || 
      (filterStatus === 'Active' && a.subscriptionStatus !== 'suspended') ||
      (filterStatus === 'Suspended' && a.subscriptionStatus === 'suspended');
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">Agency Management</h1>
          <p className="text-xs text-slate-500 font-medium">Control and configure tenant workspaces and license terms.</p>
        </div>
        
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Create Agency</span>
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
              placeholder="Search by agency name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50 focus:bg-white transition-all"
            />
          </div>

          {/* Plan filter */}
          <div className="relative">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="All">All Plans</option>
              {plans.map(p => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
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
              <option value="Suspended">Suspended</option>
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

      {/* Agencies Data Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading agencies data...</div>
        ) : filteredAgencies.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No agencies match the search filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 uppercase tracking-wider font-bold font-mono">
                <tr>
                  <th className="px-6 py-4">Agency</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Users</th>
                  <th className="px-6 py-4">Candidates</th>
                  <th className="px-6 py-4">Jobs</th>
                  <th className="px-6 py-4">Storage</th>
                  <th className="px-6 py-4">AI Usage</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAgencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-slate-900 font-display text-sm">{agency.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{agency.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const matchingPlan = plans.find(p => p.slug === agency.subscriptionPlan);
                        const displayName = matchingPlan ? matchingPlan.name : agency.subscriptionPlan;
                        const planColor = matchingPlan?.planColor || '#64748B';
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border" style={{
                            backgroundColor: planColor + '10',
                            borderColor: planColor + '25',
                            color: planColor
                          }}>
                            {displayName}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold">{agency.usersCount}</td>
                    <td className="px-6 py-4 font-mono font-semibold">{agency.candidatesCount}</td>
                    <td className="px-6 py-4 font-mono font-semibold">{agency.jobsCount}</td>
                    <td className="px-6 py-4 font-mono font-semibold">{agency.storageUsedMb} MB</td>
                    <td className="px-6 py-4 font-mono font-semibold">{agency.aiUsageCount} reqs</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        agency.subscriptionStatus === 'suspended'
                          ? 'bg-rose-50 text-rose-700 border-rose-100/50'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100/50'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          agency.subscriptionStatus === 'suspended' ? 'bg-rose-600' : 'bg-emerald-600'
                        }`} />
                        {agency.subscriptionStatus === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleImpersonate(agency)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                          title="Impersonate (Switch Context)"
                        >
                          <Key className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(agency)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Edit Details & Plan"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(agency)}
                          className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                            agency.subscriptionStatus === 'suspended'
                              ? 'text-slate-400 hover:text-emerald-600'
                              : 'text-slate-400 hover:text-amber-600'
                          }`}
                          title={agency.subscriptionStatus === 'suspended' ? 'Activate Agency' : 'Suspend Agency'}
                        >
                          {agency.subscriptionStatus === 'suspended' ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(agency.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Workspace"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Agency Slide-over or Modal popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-center items-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-scale-up">
            
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                {currentAgency ? 'Configure Agency Workspace' : 'Register New Workspace'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Agency Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Staffing"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subscription Plan</label>
                <select
                  value={subscriptionPlan}
                  onChange={(e) => setSubscriptionPlan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                >
                  {plans.map(p => (
                    <option key={p.slug} value={p.slug}>{p.name} {p.monthlyPrice > 0 ? `(₹${p.monthlyPrice}/mo)` : '(Free)'}</option>
                  ))}
                </select>
              </div>

              {currentAgency && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">License Status</label>
                  <select
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="active">Active (Full features allowed)</option>
                    <option value="suspended">Suspended (All logins blocked)</option>
                  </select>
                </div>
              )}

              {currentAgency && subscriptionStatus === 'suspended' && (
                <div className="flex gap-2 bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-[10px] font-semibold text-rose-700 leading-normal">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>Suspending this agency will lock out all users associated with this workspace immediately.</span>
                </div>
              )}

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
                  Save Settings
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
