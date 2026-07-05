import React, { Dispatch, SetStateAction } from 'react';
import { UserPlus, X, Send, Shield, Check, Edit2 } from 'lucide-react';
import { TeamMember } from '../../types';
import AnimatedModal from '../AnimatedModal';

interface SettingsTeamModalsProps {
  showInviteModal: boolean;
  setShowInviteModal: (val: boolean) => void;
  inviteName: string;
  setInviteName: (val: string) => void;
  inviteEmail: string;
  setInviteEmail: (val: string) => void;
  inviteRole: 'Owner' | 'Admin' | 'Recruiter' | 'HR Executive' | 'Viewer';
  setInviteRole: (val: 'Owner' | 'Admin' | 'Recruiter' | 'HR Executive' | 'Viewer') => void;
  inviteDept: string;
  setInviteDept: (val: string) => void;
  inviteMsg: string;
  setInviteMsg: (val: string) => void;
  isInviting: boolean;
  handleInviteSubmit: (e: React.FormEvent) => void;
  viewingMember: TeamMember | null;
  setViewingMember: (member: TeamMember | null) => void;
  editingMember: TeamMember | null;
  setEditingMember: Dispatch<SetStateAction<TeamMember | null>>;
  handleSaveMemberEdit: (e: React.FormEvent) => void;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: ['Full billing access', 'Database read/write/delete', 'Manage team members', 'Export candidate data', 'Adjust model sourcing parameters'],
  Admin: ['Database read/write', 'Manage jobs and templates', 'Add/edit candidates', 'Configure team integrations', 'View reports'],
  Recruiter: ['View/edit candidates', 'Advance applicants in pipelines', 'Outbox email & WhatsApp', 'Schedule interviews', 'Create general tasks'],
  'HR Executive': ['View candidates', 'Export candidate profiles', 'Read jobs matching metrics', 'Log screening activities'],
  Viewer: ['Read-only candidate lists', 'View dashboard metrics', 'Monitor pipeline states']
};

export function SettingsTeamModals({
  showInviteModal,
  setShowInviteModal,
  inviteName,
  setInviteName,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  inviteDept,
  setInviteDept,
  inviteMsg,
  setInviteMsg,
  isInviting,
  handleInviteSubmit,
  viewingMember,
  setViewingMember,
  editingMember,
  setEditingMember,
  handleSaveMemberEdit
}: SettingsTeamModalsProps) {
  return (
    <>
      {/* 1. INVITE MEMBER POPUP */}
      <AnimatedModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)}>
        {(animate) => (
          <form 
            onSubmit={handleInviteSubmit}
            className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden text-xs text-slate-600 transition-all duration-200 transform ${
              animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Invite Team Member</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Dispatches invitation via outbox mail</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 font-sans">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Liam Chen"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="liam.c@agency.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Role Designation</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full h-8 px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Department</label>
                  <input 
                    type="text" 
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    placeholder="e.g. Executive Staff"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Personal Greeting (Optional)</label>
                <textarea 
                  rows={3}
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  placeholder="Welcome to our hiring dashboard! Looking forward to reviewing candidates together."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white resize-none focus:outline-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2 font-sans">
              <button 
                type="button" 
                onClick={() => setShowInviteModal(false)}
                className="px-3.5 py-1.5 font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isInviting}
                className="px-4 py-1.5 font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isInviting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending Invite...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </AnimatedModal>

      {/* 2. VIEW MEMBER PERMISSIONS POPUP */}
      <AnimatedModal isOpen={!!viewingMember} onClose={() => setViewingMember(null)}>
        {(animate) => {
          if (!viewingMember) return null;
          return (
            <div 
              className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden text-xs text-slate-600 transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-sans">{viewingMember.name}'s Access Rights</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Role: {viewingMember.role}</p>
                  </div>
                </div>
                <button onClick={() => setViewingMember(null)} className="p-1 text-slate-400 hover:text-slate-605 rounded cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 font-sans">
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-705 uppercase">
                    {viewingMember.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-805">{viewingMember.name}</p>
                    <p className="text-[10px] text-slate-404 font-mono mt-0.5">{viewingMember.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-mono text-slate-404 uppercase tracking-wider font-bold">Authorized Operational Rights</h4>
                  <div className="space-y-1.5">
                    {(ROLE_PERMISSIONS[viewingMember.role] || ['Full Access']).map((perm, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{perm}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 font-sans">
                <button 
                  onClick={() => setViewingMember(null)}
                  className="px-4 py-1.5 font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          );
        }}
      </AnimatedModal>

      {/* 3. EDIT MEMBER DETAILS POPUP */}
      <AnimatedModal isOpen={!!editingMember} onClose={() => setEditingMember(null)}>
        {(animate) => {
          if (!editingMember) return null;
          return (
            <form 
              onSubmit={handleSaveMemberEdit}
              className={`bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden text-xs text-slate-600 transition-all duration-200 transform ${
                animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Edit2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-sans">Modify Credentials</h3>
                    <p className="text-[10px] text-slate-404 font-mono">Editing: {editingMember.name}</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 font-sans">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={editingMember.name}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={editingMember.email}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, email: e.target.value } : null)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Role Designation</label>
                    <select 
                      value={editingMember.role}
                      onChange={(e) => setEditingMember(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                      className="w-full h-8 px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                    >
                      <option value="Owner">Owner</option>
                      <option value="Admin">Admin</option>
                      <option value="Recruiter">Recruiter</option>
                      <option value="HR Executive">HR Executive</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Department</label>
                    <input 
                      type="text" 
                      value={editingMember.department}
                      onChange={(e) => setEditingMember(prev => prev ? { ...prev, department: e.target.value } : null)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2 font-sans">
                <button 
                  type="button" 
                  onClick={() => setEditingMember(null)}
                  className="px-3.5 py-1.5 font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          );
        }}
      </AnimatedModal>
    </>
  );
}
