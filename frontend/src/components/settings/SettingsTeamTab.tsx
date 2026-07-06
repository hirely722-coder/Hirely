import React from 'react';
import { UserPlus, Eye, Edit2, Send, Lock, Power, Trash2, ShieldAlert } from 'lucide-react';
import { TeamMember } from '../../types';

interface SettingsTeamTabProps {
  teamMembers: TeamMember[];
  setShowInviteModal: (val: boolean) => void;
  setViewingMember: (val: TeamMember | null) => void;
  setEditingMember: (val: TeamMember | null) => void;
  handleResendInvite: (name: string) => void;
  handleResetPassword: (name: string) => void;
  handleToggleMemberStatus: (id: string) => void;
  handleRemoveMember: (id: string, name: string) => void;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: ['Full billing access', 'Database read/write/delete', 'Manage team members', 'Export candidate data', 'Adjust model sourcing parameters'],
  Admin: ['Database read/write', 'Manage jobs and templates', 'Add/edit candidates', 'Configure team integrations', 'View reports'],
  Recruiter: ['View/edit candidates', 'Advance applicants in pipelines', 'Outbox email & WhatsApp', 'Schedule interviews', 'Create general tasks'],
  'HR Executive': ['View candidates', 'Export candidate profiles', 'Read jobs matching metrics', 'Log screening activities'],
  Viewer: ['Read-only candidate lists', 'View dashboard metrics', 'Monitor pipeline states']
};

export function SettingsTeamTab({
  teamMembers,
  setShowInviteModal,
  setViewingMember,
  setEditingMember,
  handleResendInvite,
  handleResetPassword,
  handleToggleMemberStatus,
  handleRemoveMember
}: SettingsTeamTabProps) {
  return (
    <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between text-slate-800">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-sans">Corporate Agency Roster</h2>
            <p className="text-xs text-slate-500 mt-0.5">Control operational roles, resend invites, and configure permissions across your recruitment staff.</p>
          </div>
          <button 
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer font-sans"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Team Member
          </button>
        </div>

        {/* Team Roster Grid Layout */}
        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-404 text-[10px] font-mono uppercase tracking-wider border-b border-slate-150 font-bold">
                <th className="p-3">Recruiter Info</th>
                <th className="p-3">Role Designation</th>
                <th className="p-3">Operational Status</th>
                <th className="p-3">Last Logged In</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/40">
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-705 text-xs uppercase">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">{member.role}</span>
                      <span className="text-[9px] font-mono px-1 py-0.5 bg-slate-100 border border-slate-150 text-slate-500 rounded uppercase font-bold">
                        {member.department}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                      member.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : member.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      <span className={`h-1 w-1 rounded-full ${member.status === 'Active' ? 'bg-emerald-500' : member.status === 'Pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      {member.status === 'Pending' ? 'Invited' : member.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[10px] text-slate-400">
                    {member.lastLogin}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        onClick={() => setViewingMember(member)}
                        title="View Permissions"
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setEditingMember(member)}
                        title="Edit Role"
                        className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {member.status === 'Pending' ? (
                        <button 
                          onClick={() => handleResendInvite(member.name)}
                          title="Resend Invitation"
                          className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleResetPassword(member.name)}
                          title="Reset Password"
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleToggleMemberStatus(member.id)}
                        title={member.status === 'Disabled' ? 'Enable user' : 'Disable user'}
                        className={`p-1 cursor-pointer ${member.status === 'Disabled' ? 'text-slate-400 hover:text-emerald-600' : 'text-slate-400 hover:text-rose-500'}`}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      {member.role !== 'Owner' && (
                        <button 
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          title="Remove Member"
                          className="p-1 text-slate-400 hover:text-red-650 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Roles Summary Panel */}
      <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2 mt-4">
        <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1 font-bold">
          <ShieldAlert className="h-3.5 w-3.5 text-blue-500" />
          recruitment agency role permissions guide
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-[10px] text-slate-505 leading-relaxed pt-1 font-sans">
          {Object.keys(ROLE_PERMISSIONS).map(roleKey => (
            <div key={roleKey} className="border-r border-slate-150/60 last:border-none pr-2">
              <p className="font-bold text-slate-800">{roleKey}</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1 text-[9px] text-slate-400 leading-normal">
                {ROLE_PERMISSIONS[roleKey].slice(0, 3).map((perm, pi) => (
                  <li key={pi} className="truncate" title={perm}>{perm}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
