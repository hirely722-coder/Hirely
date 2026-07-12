import React, { useState } from 'react';
import { Check, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface SettingsGeneralTabProps {
  companyName: string;
  setCompanyName: (val: string) => void;
  recruiterName: string;
  setRecruiterName: (val: string) => void;
  savedMessage: boolean;
  handleSaveGeneral: (e: React.FormEvent) => void;
}

export function SettingsGeneralTab({
  companyName,
  setCompanyName,
  recruiterName,
  setRecruiterName,
  savedMessage,
  handleSaveGeneral
}: SettingsGeneralTabProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (!newPassword.trim()) {
      setPwdError('Password cannot be empty');
      return;
    }
    if (newPassword.length < 6) {
      setPwdError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('Passwords do not match');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPwdError(error.message);
      } else {
        setPwdSuccess(true);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setPwdError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <form onSubmit={handleSaveGeneral} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Corporate Information</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Assigned Recruiter</label>
              <input
                type="text"
                value={recruiterName}
                onChange={(e) => setRecruiterName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2 font-bold">Corporate Branding Presets</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">All reports, candidate profiles, and outreach bundles compiled inside the ATS will utilize these headers automatically.</p>
            
            <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900">Custom Logo Emblem</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Vector SVG logo used for outbound email headers.</p>
              </div>
              <button type="button" className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 rounded cursor-pointer">
                Upload Emblem
              </button>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          {savedMessage ? (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 animate-pulse">
              <Check className="h-4 w-4" />
              Settings saved successfully!
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-sans">Hirly ATS workspace is synchronized.</span>
          )}
          
          <button
            type="submit"
            className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Change Password Security Form */}
      <form onSubmit={handleUpdatePasswordSubmit} className="pt-8 border-t border-slate-200/80 space-y-6">
        <div>
          <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2 font-bold">Change Security Password</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-4">Update the password used to access your recruiter workspace profile.</p>

          {pwdError && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300 font-semibold animate-shake">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-xs text-emerald-300 font-semibold">
              <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUpdatingPassword}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
