import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Sparkles, Database, GitMerge, FileSpreadsheet, Mail, Settings, MessageSquare, LayoutDashboard, Ban, ShieldAlert, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TeamMember } from '../../types';

const SYSTEM_FEATURES = [
  {
    key: 'disable_ai',
    name: 'AI Talent Assistant & Matching',
    description: 'Enables automatic talent matching scoring and resume summaries.',
    icon: Sparkles,
    color: 'text-purple-600 bg-purple-50'
  },
  {
    key: 'disable_voice_ai',
    name: 'Voice AI Copilot',
    description: 'Allows conversational speech commands within ATS workspace.',
    icon: Sparkles,
    color: 'text-indigo-600 bg-indigo-50'
  },
  {
    key: 'disable_import',
    name: 'Bulk Candidate Ingestion',
    description: 'Permits uploading CSV candidate datasets.',
    icon: Database,
    color: 'text-blue-600 bg-blue-50'
  },
  {
    key: 'disable_export',
    name: 'Database Exporting',
    description: 'Enables downloading spreadsheet exports of applicant contact datasets.',
    icon: FileSpreadsheet,
    color: 'text-emerald-600 bg-emerald-50'
  },
  {
    key: 'disable_dashboard',
    name: 'Recruiter Dashboard View',
    description: 'Provides tracking charts and dashboard summaries.',
    icon: LayoutDashboard,
    color: 'text-sky-600 bg-sky-50'
  },
  {
    key: 'disable_pipeline',
    name: 'Kanban Stages Board',
    description: 'Deactivates drag-and-drop workflow status boards for applicants.',
    icon: GitMerge,
    color: 'text-orange-600 bg-orange-50'
  },
  {
    key: 'disable_templates',
    name: 'Prebuilt Outreach Templates',
    description: 'Allows using standardized templates during outreach campaign.',
    icon: Mail,
    color: 'text-amber-600 bg-amber-50'
  },
  {
    key: 'disable_email',
    name: 'Candidate Email Outreach',
    description: 'Controls direct email integrations and outbound messages.',
    icon: Mail,
    color: 'text-cyan-600 bg-cyan-50'
  },
  {
    key: 'disable_whatsapp',
    name: 'WhatsApp Outreach Integration',
    description: 'Controls WhatsApp outreach templates and chat actions.',
    icon: MessageSquare,
    color: 'text-teal-600 bg-teal-50'
  }
];

export function SettingsFeatureLocksTab() {
  const { 
    lockedFeatures, 
    handleToggleFeatureLock, 
    currentUserRole,
    teamMembers,
    handleUpdateTeamMember,
    fetchData
  } = useApp();

  const [mode, setMode] = useState<'global' | 'member'>('global');
  
  // Member restriction states
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = currentUserRole === 'Owner';
  const isOwnerOrAdmin = currentUserRole === 'Owner' || currentUserRole === 'Admin';

  // Sync member overrides when selected member changes
  useEffect(() => {
    if (activeMember) {
      setSelectedRestrictions(activeMember.restrictedFeatures || []);
    }
  }, [activeMember]);

  // Initial selection triggers
  useEffect(() => {
    if (teamMembers.length > 0 && !activeMember) {
      setActiveMember(teamMembers[0]);
    }
  }, [teamMembers]);

  const handleGlobalToggle = async (featureKey: string) => {
    if (!isOwner) return;
    setSavingKey(featureKey);
    
    let newLocks = [...(lockedFeatures || [])];
    if (newLocks.includes(featureKey)) {
      newLocks = newLocks.filter(k => k !== featureKey);
    } else {
      newLocks.push(featureKey);
    }
    
    await handleToggleFeatureLock(newLocks);
    setSavingKey(null);
  };

  const handleMemberRestrictionToggle = async (featureKey: string) => {
    if (!isOwnerOrAdmin || !activeMember || activeMember.role === 'Owner') return;

    const newRestrictions = selectedRestrictions.includes(featureKey)
      ? selectedRestrictions.filter(k => k !== featureKey)
      : [...selectedRestrictions, featureKey];

    setSelectedRestrictions(newRestrictions);
    setIsSaving(true);
    try {
      await handleUpdateTeamMember({
        ...activeMember,
        restrictedFeatures: newRestrictions
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to save member restrictions:', err);
    }
    setIsSaving(false);
  };

  const handleSaveMemberRestrictions = async () => {
    if (!activeMember) return;
    setIsSaving(true);
    try {
      await handleUpdateTeamMember({
        ...activeMember,
        restrictedFeatures: selectedRestrictions
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to save member restrictions:', err);
    }
    setIsSaving(false);
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-slate-200/60 rounded-xl bg-slate-50/20 text-center min-h-[300px]" id="settings-feature-locks-tab">
        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 font-sans">Access Restricted</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
          Only the Workspace Owner or Administrator can access feature restriction settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="settings-feature-locks-tab">
      {/* Header & Toggle Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-md font-bold text-slate-900 font-sans">Feature Lock Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Toggle global access scopes or lock features for specific team members.</p>
        </div>
        
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/40 shrink-0">
          <button
            onClick={() => setMode('global')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
              mode === 'global' 
                ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Global Workspace
          </button>
          <button
            onClick={() => setMode('member')}
            className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
              mode === 'member' 
                ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Member Restrictions
          </button>
        </div>
      </div>

      {mode === 'global' ? (
        <div className="space-y-4">
          {!isOwner && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs leading-relaxed">
              Global locks are view-only. Only the Workspace Owner can modify global feature configurations.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_FEATURES.map((feature) => {
              const isCurrentlyLocked = lockedFeatures.map(f => f.toLowerCase()).includes(feature.key.toLowerCase());
              const Icon = feature.icon;
              const isWorking = savingKey === feature.key;

              return (
                <div
                  key={feature.key}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all bg-white ${
                    isCurrentlyLocked 
                      ? 'border-rose-100 bg-rose-50/10' 
                      : 'border-slate-200 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${feature.color} border border-transparent`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-900 font-sans leading-none">{feature.name}</h3>
                        {isCurrentlyLocked && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.25 text-[8px] bg-rose-100 text-rose-700 border border-rose-200/30 rounded-sm font-bold uppercase tracking-wider font-mono">
                            <Ban className="h-2 w-2" />
                            Locked
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal">{feature.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGlobalToggle(feature.key)}
                    disabled={isWorking || !isOwner}
                    className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isCurrentlyLocked ? (
                      <ToggleLeft className="h-9 w-9 text-rose-500" />
                    ) : (
                      <ToggleRight className="h-9 w-9 text-blue-600" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Member List */}
          <div className="md:col-span-1 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/20">
            <div className="p-3 bg-slate-50/60 font-semibold text-[10px] uppercase text-slate-400 tracking-wider font-mono">
              Select Team Member
            </div>
            <div className="p-1.5 space-y-1 max-h-[350px] overflow-y-auto">
              {teamMembers.map((member) => {
                const isActive = activeMember?.id === member.id;
                const hasRestrictions = Array.isArray(member.restrictedFeatures) && member.restrictedFeatures.length > 0;
                return (
                  <div
                    key={member.id}
                    className={`w-full flex flex-col p-2.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                      isActive 
                        ? 'bg-blue-50/50 text-blue-700 border-blue-200/50 shadow-2xs font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-transparent'
                    }`}
                    onClick={() => setActiveMember(member)}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="truncate">{member.name}</span>
                      {hasRestrictions && (
                        <span className="px-1.5 py-0.25 text-[7px] bg-rose-100 text-rose-800 border border-rose-200/30 rounded uppercase font-bold tracking-wide scale-90">
                          Restricted
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">{member.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Features Overrides */}
          {activeMember && (
            <div className="md:col-span-3 border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                    Feature Restrictions: <span className="text-blue-600">{activeMember.name}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {activeMember.role === 'Owner'
                      ? 'Owners always have access to all features. Cannot be restricted.'
                      : 'Toggle switches below to lock specific features for this user.'}
                  </p>
                </div>
                
                {activeMember.role !== 'Owner' && (
                  <button
                    onClick={handleSaveMemberRestrictions}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-55 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Restrictions'}
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4 max-h-[450px] overflow-y-auto divide-y divide-slate-100">
                {SYSTEM_FEATURES.map((feature, idx) => {
                  const isRestricted = selectedRestrictions.map(f => f.toLowerCase()).includes(feature.key.toLowerCase());
                  const Icon = feature.icon;
                  const isReadonly = activeMember.role === 'Owner';

                  return (
                    <div
                      key={feature.key}
                      className={`pt-4 first:pt-0 flex items-start justify-between gap-4 transition-all ${
                        isRestricted ? 'opacity-90' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${feature.color} border border-transparent mt-0.5`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-bold text-slate-900 font-sans leading-none">{feature.name}</h3>
                            {isRestricted && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.25 text-[8px] bg-rose-100 text-rose-700 border border-rose-200/30 rounded-sm font-bold uppercase tracking-wider font-mono">
                                Restricted
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 leading-normal">{feature.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMemberRestrictionToggle(feature.key)}
                        disabled={isReadonly}
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                      >
                        {isRestricted ? (
                          <ToggleLeft className="h-9 w-9 text-rose-500" />
                        ) : (
                          <ToggleRight className="h-9 w-9 text-blue-600" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
