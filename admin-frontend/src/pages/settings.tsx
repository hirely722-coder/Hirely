import React, { useState, useEffect } from 'react';
import { fetchAdminApi } from '@/utils/adminApi';
import { 
  Settings, RefreshCw, Mail, Cpu, HardDrive, 
  CheckCircle2, ShieldCheck, Globe, Save
} from 'lucide-react';
import { useApp } from '@/context/AdminAppContext';

export default function AdminSettings() {
  const { showToast } = useApp();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'smtp' | 'api' | 'branding' | 'backup'>('smtp');

  // Input states mapping settings fields
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSender, setSmtpSender] = useState('');
  const [edenaiKey, setEdenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  const [whitelabelDomain, setWhitelabelDomain] = useState('');
  const [allowedDomainsList, setAllowedDomainsList] = useState('');
  const [backupSchedule, setBackupSchedule] = useState('Daily');

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminApi('/api/superadmin/settings');
      setSettings(data);
      
      // Initialize states
      setSmtpServer(data.smtpServer || 'smtp.gmail.com');
      setSmtpPort(data.smtpPort || 587);
      setSmtpUser(data.smtpUser || '');
      setSmtpPass(data.smtpPass || '');
      setSmtpSender(data.smtpSender || 'noreply@hirely.com');
      setEdenaiKey(data.edenaiKey || '');
      setElevenlabsKey(data.elevenlabsKey || '');
      setTelegramToken(data.telegramToken || '');
      setWhitelabelDomain(data.whitelabelDomain || 'app.hirely.com');
      setAllowedDomainsList(data.allowedDomainsList || '*');
      setBackupSchedule(data.backupSchedule || 'Daily');

    } catch (err: any) {
      showToast(err.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...settings,
        smtpServer,
        smtpPort: parseInt(smtpPort as any),
        smtpUser,
        smtpPass,
        smtpSender,
        edenaiKey,
        elevenlabsKey,
        telegramToken,
        whitelabelDomain,
        allowedDomainsList,
        backupSchedule
      };

      const updated = await fetchAdminApi('/api/superadmin/settings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      setSettings(updated);
      showToast('✓ System configuration saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update system settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-6 text-center text-slate-400">Loading system settings...</div>;
  }

  const tabs = [
    { id: 'smtp', name: 'SMTP Server', icon: Mail },
    { id: 'api', name: 'API Services', icon: Cpu },
    { id: 'branding', name: 'Branding & Domain', icon: Globe },
    { id: 'backup', name: 'Backup Schedule', icon: HardDrive }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">System Settings</h1>
          <p className="text-xs text-slate-500 font-medium">Configure unified outbound mail gateways, API key connections, backups, and branding options.</p>
        </div>
        <button 
          onClick={loadSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Tabs pane */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4 shadow-2xs space-y-1.5 h-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer border ${
                  isTabActive 
                    ? 'bg-blue-50 text-blue-700 border-blue-100/50 shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isTabActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Settings pane */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* SMTP Tab View */}
            {activeTab === 'smtp' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-950 font-display">Outbound Mail Configuration</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Used for system activations, invitations, and candidate updates.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SMTP Server</label>
                    <input
                      type="text"
                      required
                      value={smtpServer}
                      onChange={(e) => setSmtpServer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SMTP Port</label>
                    <input
                      type="number"
                      required
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SMTP Username</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SMTP Password</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sender Email Address</label>
                  <input
                    type="email"
                    required
                    value={smtpSender}
                    onChange={(e) => setSmtpSender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* API Tab View */}
            {activeTab === 'api' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-950 font-display">Provider API Integrations</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Update developer credential tokens securely.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Eden AI Access Key</label>
                  <input
                    type="password"
                    value={edenaiKey}
                    onChange={(e) => setEdenaiKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">ElevenLabs Voice Synthesizer Token</label>
                  <input
                    type="password"
                    value={elevenlabsKey}
                    onChange={(e) => setElevenlabsKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Telegram Bot Webhook Token</label>
                  <input
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Branding Tab View */}
            {activeTab === 'branding' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-950 font-display">White-Label Domains</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Control domain mapping options and tenant domain white-listing.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Platform Domain</label>
                  <input
                    type="text"
                    required
                    value={whitelabelDomain}
                    onChange={(e) => setWhitelabelDomain(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Allowed CORS Sign-Up Domains</label>
                  <input
                    type="text"
                    required
                    value={allowedDomainsList}
                    onChange={(e) => setAllowedDomainsList(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">Use comma separated list or * to allow registration requests from any domain.</p>
                </div>
              </div>
            )}

            {/* Backup Schedule View */}
            {activeTab === 'backup' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-950 font-display">Database Backups</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Auto backups setup logs.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Backup Interval</label>
                  <select
                    value={backupSchedule}
                    onChange={(e) => setBackupSchedule(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  >
                    <option value="Hourly">Hourly Incremental Backup</option>
                    <option value="Daily">Daily Snapshot Backup</option>
                    <option value="Weekly">Weekly Cold-Storage Backup</option>
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-2.5 text-[10px] font-semibold text-blue-700 leading-normal items-start">
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider">Automated cold backup</span>
                    <span className="mt-0.5 block">Hirely database snapshots are encrypted via AES-256 and pushed directly to S3 glacier storage. Reclaiming requires 4 hours retrieval delay.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6 justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving System Config...' : 'Save Configuration'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
