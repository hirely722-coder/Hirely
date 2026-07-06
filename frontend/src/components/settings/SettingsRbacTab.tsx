import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, CheckCircle2, Lock, User, Settings, Check, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WorkspaceRole, TeamMember } from '../../types';

const PERMISSION_GROUPS = [
  {
    name: 'Dashboard & Analytics',
    permissions: [
      { key: 'dashboard.view', label: 'View Dashboard Analytics' },
      { key: 'dashboard.export', label: 'Export Analytics Reports' },
      { key: 'analytics.advanced', label: 'Access Advanced Talent Metrics' }
    ]
  },
  {
    name: 'Candidate Management',
    permissions: [
      { key: 'candidates.view', label: 'View Candidates' },
      { key: 'candidates.add', label: 'Add New Candidates' },
      { key: 'candidates.edit', label: 'Edit Candidate Profiles' },
      { key: 'candidates.delete', label: 'Delete Candidates' },
      { key: 'candidates.import', label: 'Import Candidates (CSV)' },
      { key: 'candidates.export', label: 'Export Candidate Data' },
      { key: 'candidates.upload_resume', label: 'Upload Candidate Resumes' },
      { key: 'candidates.send_email', label: 'Send Outreach Emails' },
      { key: 'candidates.send_whatsapp', label: 'Send WhatsApp Outreach' },
      { key: 'candidates.view_ai_score', label: 'View AI Match Scores' },
      { key: 'candidates.run_ai_parsing', label: 'Trigger AI Resume Parsing' }
    ]
  },
  {
    name: 'Job Openings',
    permissions: [
      { key: 'jobs.view', label: 'View Jobs' },
      { key: 'jobs.create', label: 'Create New Job Postings' },
      { key: 'jobs.edit', label: 'Edit Job Openings' },
      { key: 'jobs.delete', label: 'Delete Job Postings' },
      { key: 'jobs.publish', label: 'Publish / Close Job Postings' },
      { key: 'jobs.ai_matching', label: 'Trigger AI Talent Sourcing / Matching' }
    ]
  },
  {
    name: 'Client Companies',
    permissions: [
      { key: 'companies.view', label: 'View Client Companies' },
      { key: 'companies.create', label: 'Register New Companies' },
      { key: 'companies.edit', label: 'Edit Company Profiles' },
      { key: 'companies.delete', label: 'Delete Registered Companies' }
    ]
  },
  {
    name: 'Recruitment Pipeline',
    permissions: [
      { key: 'pipeline.view', label: 'View Pipeline Kanbans' },
      { key: 'pipeline.move_candidate', label: 'Move Candidates Across Stages' },
      { key: 'pipeline.create_stage', label: 'Add Custom Pipeline Stages' },
      { key: 'pipeline.delete_stage', label: 'Remove Custom Pipeline Stages' }
    ]
  },
  {
    name: 'Tasks & Calendars',
    permissions: [
      { key: 'tasks.view', label: 'View Tasks' },
      { key: 'tasks.create', label: 'Create & Assign Tasks' },
      { key: 'tasks.complete', label: 'Mark Tasks as Completed' },
      { key: 'tasks.delete', label: 'Delete Assigned Tasks' }
    ]
  },
  {
    name: 'Outreach Templates',
    permissions: [
      { key: 'templates.view', label: 'View Email Templates' },
      { key: 'templates.create', label: 'Create Email Templates' },
      { key: 'templates.edit', label: 'Edit Outreach Templates' },
      { key: 'templates.delete', label: 'Delete Outreach Templates' }
    ]
  },
  {
    name: 'AI Copilot Features',
    permissions: [
      { key: 'copilot.open', label: 'Access AI Copilot Chat' },
      { key: 'copilot.voice', label: 'Activate Voice AI Assistant' },
      { key: 'copilot.resume_summary', label: 'Generate AI Resume Summaries' },
      { key: 'copilot.email_writer', label: 'Use AI Email Outreach Scribes' }
    ]
  },
  {
    name: 'Team Management',
    permissions: [
      { key: 'team.view', label: 'View Team Members' },
      { key: 'team.add', label: 'Invite Workspace Members' },
      { key: 'team.remove', label: 'Remove Workspace Members' },
      { key: 'team.edit_role', label: 'Assign Roles & Custom Permissions' },
      { key: 'team.suspend', label: 'Suspend / Activate Team Logins' }
    ]
  },
  {
    name: 'Workspace Settings',
    permissions: [
      { key: 'settings.view', label: 'View Workspace Configurations' },
      { key: 'settings.email', label: 'Modify Verified SMTP SMTP Integrations' },
      { key: 'settings.theme', label: 'Access Branding Theme Designer' },
      { key: 'settings.workspace', label: 'Configure Global Account & Billing Toggles' }
    ]
  }
];

const getDefaultPermissions = (roleName: string): string[] => {
  const name = roleName.toLowerCase();
  if (name === 'owner') return ['*'];
  if (name === 'admin') {
    return [
      'dashboard.view', 'dashboard.export',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.delete', 'candidates.import', 'candidates.export', 'candidates.upload_resume', 'candidates.download_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.create', 'jobs.edit', 'jobs.delete', 'jobs.publish', 'jobs.close_job', 'jobs.ai_matching',
      'companies.view', 'companies.create', 'companies.edit', 'companies.delete', 'companies.send_candidate_profile', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate', 'pipeline.create_stage', 'pipeline.delete_stage',
      'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.complete', 'tasks.delete',
      'templates.view', 'templates.create', 'templates.edit', 'templates.delete',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics',
      'analytics.view', 'analytics.export', 'analytics.advanced',
      'team.view', 'team.add', 'team.remove', 'team.edit_role', 'team.suspend',
      'settings.view', 'settings.email', 'settings.theme', 'settings.integrations', 'settings.api_keys', 'settings.workspace'
    ];
  }
  if (name === 'recruiter') {
    return [
      'dashboard.view',
      'candidates.view', 'candidates.add', 'candidates.edit', 'candidates.upload_resume', 'candidates.send_email', 'candidates.send_whatsapp', 'candidates.view_ai_score', 'candidates.run_ai_parsing',
      'jobs.view', 'jobs.ai_matching',
      'companies.view', 'companies.view_hiring_history',
      'pipeline.view', 'pipeline.move_candidate',
      'tasks.view', 'tasks.create', 'tasks.complete',
      'templates.view',
      'copilot.open', 'copilot.voice', 'copilot.resume_summary', 'copilot.email_writer', 'copilot.search', 'copilot.analytics'
    ];
  }
  if (name === 'viewer') {
    return [
      'dashboard.view',
      'candidates.view',
      'jobs.view',
      'companies.view',
      'pipeline.view'
    ];
  }
  return [];
};

export function SettingsRbacTab() {
  const { 
    workspaceRoles, 
    teamMembers,
    handleUpdateTeamMember,
    handleSaveRolePermissions, 
    handleCreateCustomRole, 
    handleDeleteCustomRole, 
    currentUserRole,
    fetchData
  } = useApp();

  const [mode, setMode] = useState<'roles' | 'members'>('roles');
  
  // Roles Management States
  const [activeRole, setActiveRole] = useState<WorkspaceRole | null>(null);
  
  // Members Management States
  const [activeMember, setActiveMember] = useState<TeamMember | null>(null);
  
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isOwnerOrAdmin = currentUserRole === 'Owner' || currentUserRole === 'Admin';
  const isOwner = currentUserRole === 'Owner';

  // Restore selection mode on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedMode = localStorage.getItem('hirely_rbac_selection_mode');
      if (cachedMode === 'roles' || cachedMode === 'members') {
        setMode(cachedMode);
      }
    }
  }, []);

  const handleSetMode = (m: 'roles' | 'members') => {
    setMode(m);
    localStorage.setItem('hirely_rbac_selection_mode', m);
  };

  const handleSelectRole = (role: WorkspaceRole) => {
    setActiveRole(role);
    localStorage.setItem('hirely_rbac_active_role_id', role.id);
  };

  const handleSelectMember = (member: TeamMember) => {
    setActiveMember(member);
    localStorage.setItem('hirely_rbac_active_member_id', member.id);
  };

  // Sync role defaults or overrides on active selection
  useEffect(() => {
    if (mode === 'roles' && activeRole) {
      setSelectedPermissions(activeRole.permissions || []);
    } else if (mode === 'members' && activeMember) {
      if (activeMember.customPermissions && activeMember.customPermissions.length > 0) {
        setSelectedPermissions(activeMember.customPermissions);
      } else {
        // Inherit from member role
        const matchedRole = workspaceRoles.find(r => r.name === activeMember.role);
        setSelectedPermissions(matchedRole?.permissions || getDefaultPermissions(activeMember.role));
      }
    }
  }, [activeRole, activeMember, mode, workspaceRoles]);

  // Keep activeMember in sync with the latest data from teamMembers context
  useEffect(() => {
    if (activeMember && teamMembers.length > 0) {
      const updated = teamMembers.find(m => m.id === activeMember.id);
      if (updated && JSON.stringify(updated.customPermissions) !== JSON.stringify(activeMember.customPermissions)) {
        setActiveMember(updated);
      }
    }
  }, [teamMembers]);

  // Initial selection triggers
  useEffect(() => {
    if (workspaceRoles.length > 0 && !activeRole) {
      const cachedRoleId = localStorage.getItem('hirely_rbac_active_role_id');
      const foundRole = workspaceRoles.find(r => r.id === cachedRoleId);
      const owner = foundRole || workspaceRoles.find(r => r.name === 'Owner') || workspaceRoles[0];
      setActiveRole(owner);
    }
    if (teamMembers.length > 0 && !activeMember) {
      const cachedMemberId = localStorage.getItem('hirely_rbac_active_member_id');
      const foundMember = teamMembers.find(m => m.id === cachedMemberId);
      setActiveMember(foundMember || teamMembers[0]);
    }
  }, [workspaceRoles, teamMembers]);

  const handlePermissionToggle = (permKey: string, checked: boolean) => {
    // If Roles mode, check custom status
    if (mode === 'roles') {
      if (!activeRole || !activeRole.isCustom) return;
    }
    // If Members mode, disable modifying Owner account
    if (mode === 'members') {
      if (!activeMember || activeMember.role === 'Owner') return;
    }

    if (checked) {
      setSelectedPermissions(prev => [...prev, permKey]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permKey));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    if (mode === 'roles' && activeRole) {
      await handleSaveRolePermissions(activeRole.id, selectedPermissions);
    } else if (mode === 'members' && activeMember) {
      await handleUpdateTeamMember({
        ...activeMember,
        customPermissions: selectedPermissions
      });
      // Trigger background fetch to update current logged in session permissions in real-time
      await fetchData();
    }
    setIsSaving(false);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setIsSaving(true);
    await handleCreateCustomRole(newRoleName.trim(), ['dashboard.view']);
    setNewRoleName('');
    setShowCreateModal(false);
    setIsSaving(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this custom role? Users assigned will fallback to Viewer.')) {
      setIsSaving(true);
      await handleDeleteCustomRole(roleId);
      const owner = workspaceRoles.find(r => r.name === 'Owner') || workspaceRoles[0];
      setActiveRole(owner);
      setIsSaving(false);
    }
  };

  const handleResetToRoleDefault = async () => {
    if (!activeMember) return;
    if (confirm(`Reset ${activeMember.name}'s permissions to the default settings for their ${activeMember.role} role?`)) {
      setIsSaving(true);
      await handleUpdateTeamMember({
        ...activeMember,
        customPermissions: [] // Empty array deletes database overrides
      });
      // Reset local state selection
      const matchedRole = workspaceRoles.find(r => r.name === activeMember.role);
      setSelectedPermissions(matchedRole?.permissions || getDefaultPermissions(activeMember.role));
      await fetchData();
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="settings-rbac-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h2 className="text-md font-bold text-slate-900 font-sans">Roles & Permission System</h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure access matrix scopes and customize credentials.</p>
        </div>
        
        {/* Toggle Mode */}
        {isOwnerOrAdmin && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/40 shrink-0">
            <button
              onClick={() => handleSetMode('roles')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                mode === 'roles' 
                  ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              Configure Roles
            </button>
            <button
              onClick={() => handleSetMode('members')}
              className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                mode === 'members' 
                  ? 'bg-white text-blue-600 shadow-2xs font-extrabold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Configure Members
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="md:col-span-1 border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 bg-slate-50/20">
          <div className="p-3 bg-slate-50/60 font-semibold text-[10px] uppercase text-slate-400 tracking-wider font-mono flex items-center justify-between">
            <span>{mode === 'roles' ? 'Workspace Roles' : 'Workspace Roster'}</span>
            {mode === 'roles' && isOwner && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            )}
          </div>
          
          <div className="p-1.5 space-y-1 max-h-[350px] overflow-y-auto">
            {mode === 'roles' ? (
              workspaceRoles.map((role) => {
                const isActive = activeRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100/40 font-bold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                    onClick={() => handleSelectRole(role)}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${role.isCustom ? 'text-amber-500' : isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{role.name}</span>
                    </div>
                    {role.isCustom && isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              teamMembers.map((member) => {
                const isActive = activeMember?.id === member.id;
                const hasOverrides = Array.isArray(member.customPermissions) && member.customPermissions.length > 0;
                return (
                  <div
                    key={member.id}
                    className={`w-full flex flex-col p-2.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                      isActive 
                        ? 'bg-blue-50/50 text-blue-700 border-blue-200/50 shadow-2xs font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-transparent'
                    }`}
                    onClick={() => handleSelectMember(member)}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="truncate">{member.name}</span>
                      {hasOverrides && (
                        <span className="px-1.5 py-0.25 text-[7px] bg-amber-100 text-amber-800 border border-amber-200/30 rounded uppercase font-bold tracking-wide scale-90">
                          Custom
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">{member.role}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right side: permissions grid */}
        {((mode === 'roles' && activeRole) || (mode === 'members' && activeMember)) && (
          <div className="md:col-span-3 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
            {/* Right Pane Header */}
            <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 font-sans flex items-center gap-1.5">
                  {mode === 'roles' ? (
                    <>
                      Permissions Matrix: <span className="text-blue-600">{activeRole?.name}</span>
                      {!activeRole?.isCustom && (
                        <span className="px-1.5 py-0.25 text-[8px] bg-slate-100 text-slate-500 border border-slate-200/40 rounded uppercase font-mono tracking-wider font-semibold">
                          System Role
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      Overrides Matrix: <span className="text-blue-600">{activeMember?.name}</span>
                      <span className="px-1.5 py-0.25 text-[8px] bg-slate-100 text-slate-500 border border-slate-200/40 rounded font-mono">
                        Base: {activeMember?.role}
                      </span>
                    </>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {mode === 'roles'
                    ? activeRole?.isCustom 
                      ? 'Change permissions for this custom role.' 
                      : 'Default permissions matrix for this system role.'
                    : activeMember?.role === 'Owner'
                      ? 'Owner has absolute, unrestricted access to all features.'
                      : 'Customize checkboxes below to override role permissions for this specific member.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {mode === 'members' && activeMember && activeMember.role !== 'Owner' && activeMember.customPermissions && activeMember.customPermissions.length > 0 && (
                  <button
                    onClick={handleResetToRoleDefault}
                    disabled={isSaving}
                    className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    Reset defaults
                  </button>
                )}

                {((mode === 'roles' && activeRole?.isCustom && isOwner) || 
                  (mode === 'members' && activeMember?.role !== 'Owner' && isOwnerOrAdmin)) && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-55 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Permissions'}
                  </button>
                )}
              </div>
            </div>

            {/* Grid checklist */}
            <div className="p-4 space-y-6 max-h-[450px] overflow-y-auto divide-y divide-slate-100">
              {PERMISSION_GROUPS.map((group) => {
                return (
                  <div key={group.name} className="pt-4 first:pt-0 space-y-2.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {group.name}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.permissions.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.key) || selectedPermissions.includes('*') || selectedPermissions.includes(perm.key.split('.')[0] + '.*');
                        
                        let isReadonly = false;
                        if (mode === 'roles') {
                          isReadonly = !activeRole?.isCustom || !isOwner;
                        } else {
                          isReadonly = activeMember?.role === 'Owner' || !isOwnerOrAdmin;
                        }

                        return (
                          <label
                            key={perm.key}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border transition-all ${
                              isChecked 
                                ? 'bg-slate-50/50 border-slate-200/80' 
                                : 'border-slate-100 hover:bg-slate-50/20'
                            } ${isReadonly ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isReadonly}
                              onChange={(e) => handlePermissionToggle(perm.key, e.target.checked)}
                              className="mt-0.5 h-3.5 w-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-slate-700 leading-none">{perm.label}</p>
                              <p className="text-[9px] font-mono text-slate-400 mt-1">{perm.key}</p>
                            </div>
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
      </div>

      {/* Create Custom Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-xl animate-scale-up">
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Create Custom Workspace Role</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">Provide a unique descriptor name for the custom role.</p>

            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Intern, Researcher"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  {isSaving ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
