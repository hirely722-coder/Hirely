import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { useApp } from '@/context/AdminAppContext';
import { 
  Briefcase, Search, Plus, Trash2, Edit2, Shield, Eye, Copy, Archive, 
  RefreshCcw, DollarSign, Users, Award, ShieldAlert, Sparkles, Check, X, 
  ArrowLeft, ArrowUpRight, ArrowDownRight, Layers, Database, Sliders, Settings, History
} from 'lucide-react';

export default function AdminSubscriptions() {
  const { showToast } = useApp();
  
  // Loading & State
  const [plans, setPlans] = useState<any[]>([]);
  const [trialAnalytics, setTrialAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Active editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'features' | 'limits' | 'billing' | 'version'>('general');
  const [versions, setVersions] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Default empty plan schema
  const defaultPlan = {
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    currency: 'INR',
    trialDays: 14,
    popularBadge: false,
    recommendedBadge: false,
    planColor: '#3B82F6',
    planIcon: 'Sparkles',
    displayOrder: 1,
    status: 'Draft',
    visibility: 'Public',
    features: {
      unlimited_candidates: true,
      unlimited_jobs: true,
      companies: true,
      pipeline: true,
      dashboard: true,
      resume_upload: true,
      resume_parsing: true,
      csv_import: true,
      excel_import: true,
      email_templates: true,
      team_management: true,
      role_based_access: true,
      ai_search: true,
      ai_candidate_matching: true,
      ai_resume_summary: true,
      ai_email_generator: true,
      ai_voice_copilot: false,
      ai_hiring_insights: true,
      voice_commands: true,
      whatsapp_integration: true,
      email_integration: true,
      analytics: true,
      activity_logs: true,
      notes: true,
      reports: true,
      api_access: false,
      custom_branding: false,
      white_label: false,
      priority_support: true,
      backup_restore: true
    },
    limits: {
      max_team_members: '5',
      max_candidates: 'unlimited',
      max_jobs: 'unlimited',
      max_companies: 'unlimited',
      max_resume_uploads_month: '500',
      max_csv_imports: '10',
      max_emails_month: '1000',
      max_whatsapp_messages: '100',
      max_ai_requests: '200',
      max_voice_ai_requests: '0',
      max_storage_gb: '10',
      max_api_requests: '0',
      max_active_pipelines: '3',
      max_templates: '25',
      max_integrations: '3'
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const [plansData, analyticsData] = await Promise.all([
        fetchAdminApi('/api/superadmin/plans'),
        fetchAdminApi('/api/superadmin/trial-analytics')
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setTrialAnalytics(analyticsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async (planId: string) => {
    try {
      const data = await fetchAdminApi(`/api/superadmin/plans/${planId}/versions`);
      setVersions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast('Failed to load version history logs', 'error');
    }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setIsEditing(true);
    setActiveTab('general');
    loadVersions(plan.id);
  };

  const handleCreate = () => {
    setEditingPlan(JSON.parse(JSON.stringify(defaultPlan)));
    setIsEditing(true);
    setActiveTab('general');
    setVersions([]);
  };

  const handleSave = async () => {
    if (!editingPlan.name || !editingPlan.slug) {
      showToast('Plan Name and Slug are required fields', 'error');
      return;
    }

    try {
      let savedPlan;
      if (editingPlan.id) {
        // Update existing plan
        savedPlan = await fetchAdminApi(`/api/superadmin/plans/${editingPlan.id}`, {
          method: 'PUT',
          body: JSON.stringify(editingPlan)
        });
        showToast('✓ Subscription plan details updated successfully!');
      } else {
        // Create new plan
        savedPlan = await fetchAdminApi('/api/superadmin/plans', {
          method: 'POST',
          body: JSON.stringify(editingPlan)
        });
        showToast('✓ Subscription plan created successfully!');
      }
      setIsEditing(false);
      setEditingPlan(null);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to save plan details', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription plan? Existing workspaces using this plan will failback to the default Starter plan.')) return;
    try {
      await fetchAdminApi(`/api/superadmin/plans/${id}`, {
        method: 'DELETE'
      });
      showToast('Plan deleted successfully');
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete plan', 'error');
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this previous version of the plan?')) return;
    try {
      const updated = await fetchAdminApi(`/api/superadmin/plans/${editingPlan.id}/rollback`, {
        method: 'POST',
        body: JSON.stringify({ versionId })
      });
      setEditingPlan(updated);
      showToast('✓ Reverted plan values successfully!');
      loadVersions(editingPlan.id);
      loadPlans();
    } catch (err: any) {
      showToast(err.message || 'Failed to rollback version', 'error');
    }
  };

  const handleDuplicate = (plan: any) => {
    const dupe = JSON.parse(JSON.stringify(plan));
    delete dupe.id;
    dupe.name = `${dupe.name} (Copy)`;
    dupe.slug = `${dupe.slug}-copy`;
    setEditingPlan(dupe);
    setIsEditing(true);
    setActiveTab('general');
    setVersions([]);
  };

  // Filter plans list
  const filteredPlans = plans.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Derived stats (mock values layered with database plans count)
  const totalPlans = plans.length;
  const activeSubscribers = 142; 
  const trialUsers = trialAnalytics?.activeTrials ?? 38;
  const monthlyRevenue = 324000; // ₹3.24L
  const annualRevenue = 3888000;

  return (
    <div className="space-y-6">
      {/* Upper header action area */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Subscription Management</h1>
          <p className="text-xs text-slate-500 mt-1">Configure subscription plans, RLS features access switches, and limits constraints.</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Plan</span>
          </button>
        )}
      </div>

      {/* Main interface branch: editing wizard vs metrics lists */}
      {isEditing && editingPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Wizard form fields */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setIsEditing(false); setEditingPlan(null); }}
                  className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingPlan.id ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {previewMode ? 'Edit Mode' : 'Card Preview'}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  Save Plan
                </button>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-800 pb-1 overflow-x-auto shrink-0">
              {[
                { id: 'general', name: 'General', icon: Sliders },
                { id: 'features', name: 'Features Access', icon: Sparkles },
                { id: 'limits', name: 'Usage Limits', icon: Database },
                { id: 'billing', name: 'Billing & Visibility', icon: DollarSign },
                ...(editingPlan.id ? [{ id: 'version', name: 'Version History', icon: History }] : [])
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === t.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>

            {/* Tab components */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Name</label>
                    <input
                      type="text"
                      placeholder="Pro Recruiter"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Slug (Unique Reference)</label>
                    <input
                      type="text"
                      placeholder="growth"
                      value={editingPlan.slug}
                      onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Short Pitch</label>
                  <input
                    type="text"
                    placeholder="AI matching and bulk operations."
                    value={editingPlan.shortDescription}
                    onChange={(e) => setEditingPlan({ ...editingPlan, shortDescription: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Description</label>
                  <textarea
                    placeholder="Provide a detailed outline of what this plan entails."
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Color</label>
                    <input
                      type="color"
                      value={editingPlan.planColor}
                      onChange={(e) => setEditingPlan({ ...editingPlan, planColor: e.target.value })}
                      className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Icon</label>
                    <select
                      value={editingPlan.planIcon}
                      onChange={(e) => setEditingPlan({ ...editingPlan, planIcon: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="User">User / Basic</option>
                      <option value="Zap">Zap / Pro</option>
                      <option value="Crown">Crown / Premium</option>
                      <option value="Sparkles">Sparkles / Special</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Display Order</label>
                    <input
                      type="number"
                      value={editingPlan.displayOrder}
                      onChange={(e) => setEditingPlan({ ...editingPlan, displayOrder: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.popularBadge}
                      onChange={(e) => setEditingPlan({ ...editingPlan, popularBadge: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Popular Tier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.recommendedBadge}
                      onChange={(e) => setEditingPlan({ ...editingPlan, recommendedBadge: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Recommended Badge</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Toggle Core Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 shrink-0">
                  {Object.keys(editingPlan.features).map((featKey) => (
                    <div 
                      key={featKey}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all"
                    >
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {featKey.replace(/_/g, ' ')}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPlan.features[featKey]}
                          onChange={(e) => {
                            const updatedFeats = { ...editingPlan.features, [featKey]: e.target.checked };
                            setEditingPlan({ ...editingPlan, features: updatedFeats });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-focus:ring-1 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'limits' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usage Thresholds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 shrink-0">
                  {Object.keys(editingPlan.limits).map((limitKey) => {
                    const isUnlimited = editingPlan.limits[limitKey] === 'unlimited';
                    return (
                      <div key={limitKey} className="space-y-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {limitKey.replace(/max_/g, '').replace(/_/g, ' ')}
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isUnlimited}
                              onChange={(e) => {
                                const val = e.target.checked ? 'unlimited' : '0';
                                const updatedLimits = { ...editingPlan.limits, [limitKey]: val };
                                setEditingPlan({ ...editingPlan, limits: updatedLimits });
                              }}
                              className="rounded text-blue-600 scale-75"
                            />
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Unlimited</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          disabled={isUnlimited}
                          value={isUnlimited ? 'Unlimited' : editingPlan.limits[limitKey]}
                          onChange={(e) => {
                            const updatedLimits = { ...editingPlan.limits, [limitKey]: e.target.value };
                            setEditingPlan({ ...editingPlan, limits: updatedLimits });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        placeholder="2000"
                        value={editingPlan.monthlyPrice}
                        onChange={(e) => setEditingPlan({ ...editingPlan, monthlyPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Yearly Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        placeholder="20000"
                        value={editingPlan.yearlyPrice}
                        onChange={(e) => setEditingPlan({ ...editingPlan, yearlyPrice: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-7 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currency</label>
                    <input
                      type="text"
                      value={editingPlan.currency}
                      onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trial Days</label>
                    <input
                      type="number"
                      value={editingPlan.trialDays}
                      onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</label>
                    <select
                      value={editingPlan.status}
                      onChange={(e) => setEditingPlan({ ...editingPlan, status: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="Active">Active</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visibility</label>
                    <select
                      value={editingPlan.visibility}
                      onChange={(e) => setEditingPlan({ ...editingPlan, visibility: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="Public">Public Landing Page</option>
                      <option value="Internal">Internal Sales Only</option>
                      <option value="Hidden">Hidden</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'version' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Version Log Timeline</h3>
                {versions.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">No previous versions logged.</div>
                ) : (
                  <div className="relative border-l border-slate-100 dark:border-slate-800 pl-4 space-y-5">
                    {versions.map((ver, idx) => (
                      <div key={ver.id} className="relative space-y-1.5">
                        <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Version {ver.version}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(ver.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          Modified by: <span className="font-semibold text-slate-700 dark:text-slate-300">{ver.changedByName}</span>
                        </p>
                        
                        {/* Rollback trigger */}
                        {idx > 0 && (
                          <button
                            onClick={() => handleRollback(ver.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all cursor-pointer mt-1"
                          >
                            <RefreshCcw className="h-2.5 w-2.5" />
                            <span>Rollback to this version</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Right panel: Landing Pricing Card Preview */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col items-center justify-start space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start">Dynamic Preview</h3>
            
            <div 
              style={{ borderColor: `${editingPlan.planColor}60` }}
              className="relative flex w-full flex-col overflow-hidden rounded-2xl border bg-slate-900 p-6 shadow-xl"
            >
              {editingPlan.recommendedBadge && (
                <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
                  Recommended
                </div>
              )}

              <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
                <span 
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: editingPlan.planColor }}
                />
                {editingPlan.name || 'Plan Title'}
              </h4>
              <p className="text-[10px] text-slate-400 mb-4">{editingPlan.shortDescription || 'Short pitch description.'}</p>
              
              <div className="flex items-end gap-1 mb-4">
                <span className="text-2xl font-extrabold text-white">₹{editingPlan.monthlyPrice}</span>
                <span className="text-[10px] text-slate-400 pb-0.5">/month</span>
              </div>

              {editingPlan.trialDays > 0 && (
                <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-400/20 px-2 py-0.5 rounded-full w-max mb-6">
                  ✨ {editingPlan.trialDays} Day Free Trial
                </span>
              )}

              {/* Highlights feature switches */}
              <div className="space-y-2 border-t border-white/5 pt-4 text-xs font-medium text-slate-300">
                {Object.keys(editingPlan.features)
                  .filter(k => editingPlan.features[k])
                  .slice(0, 5)
                  .map(k => (
                    <div key={k} className="flex items-center gap-1.5 text-[10px]">
                      <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      <span>{k.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                {Object.keys(editingPlan.features).filter(k => editingPlan.features[k]).length > 5 && (
                  <div className="text-[9px] text-slate-500 italic mt-1 font-semibold pl-5">
                    + {Object.keys(editingPlan.features).filter(k => editingPlan.features[k]).length - 5} more features included
                  </div>
                )}
              </div>
            </div>

            <div className="w-full text-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
              Changes reflect live on the pricing landing page in real-time.
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscriptions Metrics Dash */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { name: 'Active Subscribers', value: activeSubscribers, change: '+12%', isUp: true, icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
              { name: 'Monthly Revenue', value: `₹${(monthlyRevenue / 1000).toFixed(0)}K`, change: '+8.4%', isUp: true, icon: DollarSign, color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
              { name: 'Trialing Accounts', value: trialUsers, change: '+22%', isUp: true, icon: Sparkles, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
              { name: 'Churn Rate', value: '2.4%', change: '-0.3%', isUp: false, icon: ShieldAlert, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' }
            ].map(card => (
              <div key={card.name} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                <div className="space-y-2 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{card.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{card.value}</span>
                    <span className={`text-[10px] font-bold flex items-center ${card.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {card.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {card.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${card.color} shrink-0`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>

          {trialAnalytics && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl animate-fade-in">
              <div>
                <h2 className="text-sm font-black font-display flex items-center gap-1.5 uppercase tracking-wider text-indigo-400">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-400" /> Free Trial Sourcing & Conversion Analytics
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-1">Real-time cohort insights tracking global trial signup conversion funnels.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Trials</span>
                  <div className="text-xl font-mono font-black text-slate-100 mt-1">{trialAnalytics.totalTrials}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Active Trials</span>
                  <div className="text-xl font-mono font-black text-amber-400 mt-1">{trialAnalytics.activeTrials}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Expired Trials</span>
                  <div className="text-xl font-mono font-black text-slate-300 mt-1">{trialAnalytics.expiredTrials}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800/60 rounded-2xl p-4 text-center text-emerald-400">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Converted Paid</span>
                  <div className="text-xl font-mono font-black text-emerald-400 mt-1">{trialAnalytics.convertedTrials}</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-4 text-center relative overflow-hidden">
                  <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest font-mono block relative z-10">Conversion Rate</span>
                  <div className="text-xl font-mono font-black text-indigo-300 mt-1 relative z-10">{trialAnalytics.conversionRate}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-slate-800/20 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">Trial Cohort Conversion Metrics</h3>
                  <div className="space-y-2.5 text-[11px] font-medium text-slate-400">
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span>Average Conversion Speed:</span>
                      <span className="font-mono text-slate-200 font-bold">{trialAnalytics.avgConversionTimeDays} Days</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800 pb-1.5">
                      <span>Expired Cohort Rate:</span>
                      <span className="font-mono text-slate-200 font-bold">{trialAnalytics.expiryRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cohort Onboarding Success Rate:</span>
                      <span className="font-mono text-emerald-400 font-bold">96.8%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/20 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-display">Top Features Utilized by Trial Users</h3>
                  <div className="space-y-3">
                    {Object.entries(trialAnalytics.topFeaturesBreakdown || {}).map(([featureName, count]: any) => {
                      const maxVal = Math.max(...Object.values(trialAnalytics.topFeaturesBreakdown || {}).map((v: any) => v || 1), 1);
                      const percent = Math.round((count / maxVal) * 100);
                      return (
                        <div key={featureName} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold">
                            <span className="text-slate-300">{featureName}</span>
                            <span className="text-slate-400 font-mono">{count} requests</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search, filters, data grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-4 shrink-0">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search plans by name or slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto self-end md:self-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 focus:outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active only</option>
                  <option value="Draft">Drafts only</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <RefreshCcw className="h-5 w-5 animate-spin" />
                <span>Loading active plans data...</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No subscription plans found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Plan Details</th>
                      <th className="p-4">Slug</th>
                      <th className="p-4">Pricing</th>
                      <th className="p-4">Trial</th>
                      <th className="p-4">Visibility</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                        <td className="p-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0" 
                            style={{ backgroundColor: plan.planColor || '#3B82F6' }} 
                          />
                          <div>
                            <span className="block font-bold">{plan.name}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">{plan.shortDescription}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-slate-400">{plan.slug}</td>
                        <td className="p-4 text-slate-900 dark:text-white font-semibold font-mono">
                          ₹{plan.monthlyPrice} / ₹{plan.yearlyPrice}
                        </td>
                        <td className="p-4 font-semibold text-slate-600 dark:text-slate-300 font-mono">{plan.trialDays} days</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800/20 dark:text-slate-300 dark:border-slate-700">
                            {plan.visibility}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            plan.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/10 dark:text-slate-400 dark:border-slate-800'
                          }`}>
                            {plan.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleEdit(plan)}
                            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer inline"
                            title="Edit Plan"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(plan)}
                            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-600 transition-all cursor-pointer inline"
                            title="Duplicate Plan"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer inline"
                            title="Delete Plan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dynamic Comparison Matrix Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Automated Plan Comparison Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Feature / Limit</th>
                    {plans.map(p => (
                      <th key={p.id} className="p-4 font-bold text-slate-900 dark:text-white text-center">
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* limits row */}
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">Max Candidates</td>
                    {plans.map(p => (
                      <td key={p.id} className="p-4 text-center font-mono uppercase text-[10px]">
                        {p.limits?.max_candidates || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">Max Jobs</td>
                    {plans.map(p => (
                      <td key={p.id} className="p-4 text-center font-mono uppercase text-[10px]">
                        {p.limits?.max_jobs || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">Max Team Seats</td>
                    {plans.map(p => (
                      <td key={p.id} className="p-4 text-center font-mono uppercase text-[10px]">
                        {p.limits?.max_team_members || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">Included Storage</td>
                    {plans.map(p => (
                      <td key={p.id} className="p-4 text-center font-mono uppercase text-[10px]">
                        {p.limits?.max_storage_gb ? `${p.limits.max_storage_gb} GB` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                  {/* features check row */}
                  {[
                    { name: 'AI Voice Copilot', key: 'ai_voice_copilot' },
                    { name: 'AI Candidate Matching', key: 'ai_candidate_matching' },
                    { name: 'Resume Parsing', key: 'resume_parsing' },
                    { name: 'Custom White Labeling', key: 'white_label' },
                    { name: 'WhatsApp Messaging', key: 'whatsapp_integration' }
                  ].map(f => (
                    <tr key={f.key}>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{f.name}</td>
                      {plans.map(p => (
                        <td key={p.id} className="p-4 text-center">
                          {p.features?.[f.key] ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-rose-500 mx-auto" />
                          )}
                        </td>
                      ))}
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
}
