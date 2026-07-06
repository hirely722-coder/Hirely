import React from 'react';

interface SettingsNotificationsTabProps {
  notifyOnApply: boolean;
  setNotifyOnApply: (val: boolean) => void;
  notifyOnMatch: boolean;
  setNotifyOnMatch: (val: boolean) => void;
  resumeNotificationEnabled: boolean;
  setResumeNotificationEnabled: (val: boolean) => void;
  resumeNotificationEmail: string;
  setResumeNotificationEmail: (val: string) => void;
  telegramChatId: string | null;
  telegramToken: string | null;
  telegramNotificationEnabled: boolean;
  setTelegramNotificationEnabled: (val: boolean) => void;
  handleGenerateTelegramToken: () => void;
  handleDisconnectTelegram: () => void;
  handleSaveNotifications: (e: React.FormEvent) => void;
  isSavingNotifications: boolean;
}

export function SettingsNotificationsTab({
  notifyOnApply,
  setNotifyOnApply,
  notifyOnMatch,
  setNotifyOnMatch,
  resumeNotificationEnabled,
  setResumeNotificationEnabled,
  resumeNotificationEmail,
  setResumeNotificationEmail,
  telegramChatId,
  telegramToken,
  telegramNotificationEnabled,
  setTelegramNotificationEnabled,
  handleGenerateTelegramToken,
  handleDisconnectTelegram,
  handleSaveNotifications,
  isSavingNotifications
}: SettingsNotificationsTabProps) {
  return (
    <form onSubmit={handleSaveNotifications} className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Recruiter Alert Triggers</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">Customize when to notify recruiters via screen alerts or automatic logs.</p>

        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={notifyOnApply}
              onChange={(e) => setNotifyOnApply(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5 cursor-pointer"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">New Candidate Uploads</p>
              <p className="text-[10px] text-slate-404 mt-0.5 font-sans leading-normal">Post an activity feed entry whenever a resume completes parsing successfully.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={notifyOnMatch}
              onChange={(e) => setNotifyOnMatch(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5 cursor-pointer"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">Match Score Alerts</p>
              <p className="text-[10px] text-slate-404 mt-0.5 font-sans leading-normal">Notify the recruiting panel when a parsed candidate returns a Match Score exceeding 90%.</p>
            </div>
          </label>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Email Alerts Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Email Alerts Configuration</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">Automatically dispatch an email notification to you when new resumes are uploaded.</p>

        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={resumeNotificationEnabled}
              onChange={(e) => setResumeNotificationEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5 cursor-pointer"
            />
            <div>
              <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">Email me on new resume uploads</p>
              <p className="text-[10px] text-slate-404 mt-0.5 font-sans leading-normal">Receive an email alert detailing the extracted candidate information every time a candidate profile is imported from a resume.</p>
            </div>
          </label>

          {resumeNotificationEnabled && (
            <div className="pl-7 space-y-1.5 max-w-sm animate-fade-in">
              <label className="block text-[10px] font-mono text-slate-404 uppercase tracking-wider font-bold">Notification Email Address</label>
              <input
                type="email"
                required
                value={resumeNotificationEmail}
                onChange={(e) => setResumeNotificationEmail(e.target.value)}
                placeholder="e.g. recruiter@agency.com"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Telegram Alerts Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Telegram Bot Notifications</h2>
        <p className="text-xs text-slate-500 leading-relaxed font-sans">Receive instant resume alerts directly via our <b>@hirly_bot</b> Telegram bot.</p>

        <div className="pt-2">
          {telegramChatId ? (
            <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-900 font-sans text-emerald-800">Connected to Telegram</span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 transition-colors"
                >
                  Disconnect Bot
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-normal">
                Your recruiter profile is linked with Telegram Chat ID: <code className="bg-emerald-100/40 text-emerald-800 px-1.5 py-0.5 rounded font-mono font-bold">{telegramChatId}</code>.
              </p>
              
              <label className="flex items-start gap-3 cursor-pointer group select-none pt-1">
                <input
                  type="checkbox"
                  checked={telegramNotificationEnabled}
                  onChange={(e) => setTelegramNotificationEnabled(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">Send me Telegram alerts on new resume uploads</p>
                  <p className="text-[10px] text-slate-404 mt-0.5 font-sans leading-normal">Get instant direct messages with extracted profile details when parsing completes.</p>
                </div>
              </label>
            </div>
          ) : (
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-700 font-sans">Telegram Bot Not Connected</span>
              </div>
              <p className="text-[10px] text-slate-404 leading-relaxed font-sans">
                Link your account to receive real-time candidate notifications on your phone or desktop.
              </p>

              {telegramToken ? (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="bg-blue-50/30 border border-blue-100/50 rounded-lg p-3 text-[10px] text-slate-655 leading-normal font-sans space-y-1.5">
                    <p className="font-bold text-slate-900">Follow these instructions:</p>
                    <p>1. Open Telegram and search for <b>@hirly_bot</b> (or click the button below).</p>
                    <p>2. Send the command or click <b>"Start"</b> to trigger linking: <code className="bg-blue-100/50 text-blue-800 px-1 py-0.5 rounded font-mono font-bold">/start {telegramToken}</code></p>
                    <p>3. Once connected, this page will update automatically.</p>
                  </div>
                  
                  <a
                    href={`https://t.me/hirly_bot?start=${telegramToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer select-none font-sans"
                  >
                    🚀 Launch @hirly_bot
                  </a>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateTelegramToken}
                  className="px-3.5 py-1.5 text-xs font-semibold border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                >
                  🔑 Generate Connection Link
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={isSavingNotifications}
          className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors cursor-pointer select-none font-sans"
        >
          {isSavingNotifications ? 'Saving Settings...' : 'Save Notification Preferences'}
        </button>
      </div>
    </form>
  );
}
