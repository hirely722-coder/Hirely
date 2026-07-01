import React, { useState } from 'react';
import { 
  Settings, Shield, Bell, Key, Mail, MessageSquare, Sliders, Smartphone, 
  Check, HelpCircle, Users, UserPlus, Trash2, Edit2, Lock, RefreshCw, UserCheck, 
  Send, ChevronRight, CheckCircle, AlertCircle, Eye, Info, X, Power, ShieldAlert,
  Paintbrush
} from 'lucide-react';
import { TeamMember, EmailConfig } from '../types';
import ThemeBuilderView from './ThemeBuilderView';

interface SettingsViewProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  emailConfig: EmailConfig;
  setEmailConfig: React.Dispatch<React.SetStateAction<EmailConfig>>;
  addActivityLog: (type: string, description: string) => void;
  setNotifications: React.Dispatch<React.SetStateAction<{ id: string; text: string; time: string; read: boolean }[]>>;
  showToast: (text: string, type: 'success' | 'error') => void;
  currentThemeId: string;
  onThemeChanged: (themeId: string) => void;
}

export default function SettingsView({
  teamMembers,
  setTeamMembers,
  emailConfig,
  setEmailConfig,
  addActivityLog,
  setNotifications,
  showToast,
  currentThemeId,
  onThemeChanged
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'team' | 'email' | 'notifications'>('general');
  const [savedMessage, setSavedMessage] = useState(false);

  // General tab form values
  const [companyName, setCompanyName] = useState('Hirly - Recruitment');
  const [recruiterName, setRecruiterName] = useState('Sarah Jenkins');
  const [waNumber, setWaNumber] = useState('+1 (555) 304-4422');
  const [enableWhatsAppAutoAlert, setEnableWhatsAppAutoAlert] = useState(true);
  const [notifyOnApply, setNotifyOnApply] = useState(true);
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);

  // ==========================================
  // EMAIL SETUP WIZARD STATES
  // ==========================================
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizProvider, setWizProvider] = useState<'Gmail' | 'Outlook' | 'SMTP' | 'Microsoft 365'>('Gmail');
  const [wizHost, setWizHost] = useState('smtp.gmail.com');
  const [wizPort, setWizPort] = useState('587');
  const [wizUsername, setWizUsername] = useState('sarah.j@apexstaffing.com');
  const [wizPassword, setWizPassword] = useState('••••••••••••');
  const [wizEncryption, setWizEncryption] = useState<'TLS' | 'SSL'>('TLS');
  
  const [testEmailTarget, setTestEmailTarget] = useState('sarah.j@apexstaffing.com');
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testLogs, setTestLogs] = useState<string[]>([]);

  // ==========================================
  // TEAM MANAGEMENT STATES
  // ==========================================
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Owner' | 'Admin' | 'Recruiter' | 'HR Executive' | 'Viewer'>('Recruiter');
  const [inviteDept, setInviteDept] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Edit / View states
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingMember, setViewingMember] = useState<TeamMember | null>(null);

  // Save General profile
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    addActivityLog('System', `Updated workspace profile for '${companyName}'.`);
    showToast('✓ Settings updated successfully!', 'success');
    setTimeout(() => setSavedMessage(false), 2000);
  };

  // ==========================================
  // EMAIL WIZARD ACTIONS
  // ==========================================
  const handleSelectProvider = (prov: 'Gmail' | 'Outlook' | 'SMTP' | 'Microsoft 365') => {
    setWizProvider(prov);
    if (prov === 'Gmail') {
      setWizHost('smtp.gmail.com');
      setWizPort('587');
    } else if (prov === 'Outlook') {
      setWizHost('smtp.office365.com');
      setWizPort('587');
    } else if (prov === 'Microsoft 365') {
      setWizHost('smtp.office365.com');
      setWizPort('587');
    } else {
      setWizHost('');
      setWizPort('');
    }
    setWizardStep(2);
  };

  const handleTestConnection = () => {
    setTestingStatus('testing');
    setTestLogs([
      'Initializing SMTP socket connection...',
      `Connecting to host ${wizHost}:${wizPort}...`,
      `Negotiating secure ${wizEncryption} handshake...`
    ]);

    setTimeout(() => {
      setTestLogs(prev => [...prev, 'TLS Handshake completed successfully.']);
      
      setTimeout(() => {
        setTestLogs(prev => [...prev, `Authenticating with outbox username: ${wizUsername}...`]);
        
        setTimeout(() => {
          if (wizUsername.includes('@') && wizPassword.length > 3) {
            setTestLogs(prev => [
              ...prev, 
              'SMTP credentials approved.', 
              `Dispatching mock handshake packet to ${testEmailTarget}...`,
              'Socket response code: 250 (OK).'
            ]);
            setTestingStatus('success');
            showToast('✓ SMTP Connection Verified!', 'success');
          } else {
            setTestLogs(prev => [
              ...prev, 
              'ERROR: SMTP Authentication Failed (535 Invalid Credentials).',
              'Socket response code: 535.'
            ]);
            setTestingStatus('failed');
            showToast('❌ Outbox authentication failed.', 'error');
          }
        }, 1000);
      }, 800);
    }, 800);
  };

  const handleSaveEmailConfig = () => {
    const isSuccess = testingStatus === 'success';
    
    setEmailConfig({
      provider: wizProvider,
      smtpHost: wizHost,
      port: wizPort,
      username: wizUsername,
      password: wizPassword,
      encryption: wizEncryption,
      isConnected: isSuccess
    });

    if (isSuccess) {
      addActivityLog('System', `Verified outbound SMTP connection via ${wizProvider}.`);
      setNotifications(prev => [
        { id: 'n_' + Date.now(), text: `Email configuration updated: Outbox verified via ${wizProvider}.`, time: 'Just now', read: false },
        ...prev
      ]);
      showToast('✓ Connection saved and activated!', 'success');
    } else {
      showToast('⚠️ Configuration saved, but connection remains unverified.', 'error');
    }
    setWizardStep(1);
    setTestingStatus('idle');
  };

  // ==========================================
  // TEAM MANAGEMENT ACTIONS
  // ==========================================
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('❌ Name and Email are required.', 'error');
      return;
    }

    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      
      const newMember: TeamMember = {
        id: 'tm_' + Date.now(),
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        status: 'Pending',
        department: inviteDept || 'HR Recruitment',
        lastLogin: 'Never'
      };

      setTeamMembers(prev => [...prev, newMember]);
      
      addActivityLog('Team', `Invited new team member: ${inviteName} (${inviteRole}).`);
      setNotifications(prev => [
        { id: 'n_' + Date.now(), text: `Team invitation dispatched to ${inviteEmail}.`, time: 'Just now', read: false },
        ...prev
      ]);

      showToast(`✓ Invitation sent successfully to ${inviteName}!`, 'success');
      setShowInviteModal(false);
      
      // Reset form
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Recruiter');
      setInviteDept('');
      setInviteMsg('');
    }, 1200);
  };

  const handleToggleMemberStatus = (id: string) => {
    setTeamMembers(prev => prev.map(m => {
      if (m.id === id) {
        const nextStatus = m.status === 'Disabled' ? 'Active' : 'Disabled';
        showToast(`✓ Member status changed to ${nextStatus}`, 'success');
        addActivityLog('Team', `Changed status of team member ${m.name} to ${nextStatus}.`);
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  const handleResetPassword = (name: string) => {
    showToast(`✓ Reset password link sent to ${name}!`, 'success');
    addActivityLog('Team', `Dispatched secure password override token to ${name}.`);
  };

  const handleResendInvite = (name: string) => {
    showToast(`✓ Re-routed invitation packet to ${name}!`, 'success');
    addActivityLog('Team', `Resent credentials invite to ${name}.`);
  };

  const handleRemoveMember = (id: string, name: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
    showToast(`✓ Removed ${name} from corporate team.`, 'success');
    addActivityLog('Team', `Deleted ${name} from ATS user database.`);
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setTeamMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
    showToast(`✓ Member ${editingMember.name} updated.`, 'success');
    addActivityLog('Team', `Updated user credentials / permissions for ${editingMember.name}.`);
    setEditingMember(null);
  };

  // Roles permissions descriptions map
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    Owner: ['Full billing access', 'Database read/write/delete', 'Manage team members', 'Export candidate data', 'Adjust model sourcing parameters'],
    Admin: ['Database read/write', 'Manage jobs and templates', 'Add/edit candidates', 'Configure team integrations', 'View reports'],
    Recruiter: ['View/edit candidates', 'Advance applicants in pipelines', 'Outbox email & WhatsApp', 'Schedule interviews', 'Create general tasks'],
    'HR Executive': ['View candidates', 'Export candidate profiles', 'Read jobs matching metrics', 'Log screening activities'],
    Viewer: ['Read-only candidate lists', 'View dashboard metrics', 'Monitor pipeline states']
  };

  return (
    <div className="space-y-6 animate-fade-in" id="settings-view">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Workspace Settings</h1>
          <p className="text-xs text-slate-500 mt-1">Manage agency team rosters, configure verified email connections, and set up notification preferences.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-4 min-h-[500px]">
        
        {/* Left Navigation bar */}
        <div className="md:col-span-1 border-r border-slate-100 p-4 space-y-1 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Sliders className="h-4 w-4" />
            General Profile
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors ${activeTab === 'appearance' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Paintbrush className="h-4 w-4" />
            Appearance (Theme)
          </button>
          
          <button
            onClick={() => setActiveTab('email')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors ${activeTab === 'email' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Mail className="h-4 w-4" />
            Email Setup Wizard
            {!emailConfig.isConnected && (
              <span className="ml-auto h-2 w-2 rounded-full bg-rose-500" title="SMTP Not Configured" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Users className="h-4 w-4" />
            Team Members
            <span className="ml-auto px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded font-mono font-medium">
              {teamMembers.length}
            </span>
          </button>


          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors ${activeTab === 'notifications' ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
        </div>

        {/* Right Settings Pane */}
        <div className="md:col-span-3 p-6 flex flex-col justify-between">
          
          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <ThemeBuilderView 
              currentThemeId={currentThemeId} 
              onThemeChanged={onThemeChanged} 
              showToast={showToast} 
            />
          )}
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Corporate Information</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Assigned Recruiter</label>
                    <input
                      type="text"
                      value={recruiterName}
                      onChange={(e) => setRecruiterName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-slate-50/50 font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">Corporate Branding Presets</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">All reports, candidate profiles, and outreach bundles compiled inside the ATS will utilize these headers automatically.</p>
                  
                  <div className="p-3.5 bg-slate-50/50 border border-slate-100 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">Custom Logo Emblem</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Vector SVG logo used for outbound email headers.</p>
                    </div>
                    <button type="button" className="px-2.5 py-1 text-[11px] font-semibold border border-slate-200 bg-white hover:bg-slate-50 rounded">
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
          )}

          {/* EMAIL SETUP WIZARD */}
          {activeTab === 'email' && (
            <div className="space-y-5 animate-fade-in flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-sans">Email Integration Setup</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Guided connection wizard for verified outbound recruiting correspondence.</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          wizardStep === step 
                            ? 'w-6 bg-blue-600' 
                            : wizardStep > step 
                              ? 'w-2 bg-blue-300' 
                              : 'w-2 bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Step Content */}
                <div className="py-4 text-xs">
                  
                  {/* STEP 1: Choose Provider */}
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-xs text-slate-600 font-medium">Step 1: Select your primary corporate mail provider</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleSelectProvider('Gmail')}
                          className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-sm">G</div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600">Google Workspace / Gmail</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Integrate using secure Gmail Outbox APIs or SMTP.</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => handleSelectProvider('Microsoft 365')}
                          className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">M</div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600">Microsoft Office 365</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Direct connections for standard Outlook corporate mail.</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => handleSelectProvider('Outlook')}
                          className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm">O</div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600">Outlook.com</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Standard personal outlook credentials connection.</p>
                          </div>
                        </button>

                        <button 
                          onClick={() => handleSelectProvider('SMTP')}
                          className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                        >
                          <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">S</div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600">Custom SMTP Server</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Supply custom ports, hostnames, and encryption layers.</p>
                          </div>
                        </button>
                      </div>

                      {/* Connection status card */}
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${emailConfig.isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
                          <div>
                            <p className="font-semibold text-slate-900">Current Integration Status</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {emailConfig.isConnected ? `Connected via ${emailConfig.provider} (${emailConfig.username})` : 'Disconnected / Verification Needed'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Configure Credentials */}
                  {wizardStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-600 font-medium">Step 2: Authenticate outbound server ({wizProvider})</p>
                        <button onClick={() => setWizardStep(1)} className="text-[10px] text-blue-600 hover:underline">Change Provider</button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">SMTP Host / Endpoint</label>
                          <input 
                            type="text" 
                            value={wizHost}
                            onChange={(e) => setWizHost(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. smtp.mailserver.com"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Port</label>
                          <input 
                            type="text" 
                            value={wizPort}
                            onChange={(e) => setWizPort(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                            placeholder="587"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Outbound Username (Email)</label>
                          <input 
                            type="email" 
                            value={wizUsername}
                            onChange={(e) => setWizUsername(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                            placeholder="username@domain.com"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">App-Specific Password / Token</label>
                          <input 
                            type="password" 
                            value={wizPassword}
                            onChange={(e) => setWizPassword(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••••••••"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Encryption Protocol</label>
                        <div className="flex gap-4 mt-1.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="encryption" 
                              checked={wizEncryption === 'TLS'}
                              onChange={() => setWizEncryption('TLS')}
                              className="text-blue-600 focus:ring-0"
                            />
                            <span className="font-semibold text-slate-700">TLS (Port 587 - Recommended)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="radio" 
                              name="encryption" 
                              checked={wizEncryption === 'SSL'}
                              onChange={() => setWizEncryption('SSL')}
                              className="text-blue-600 focus:ring-0"
                            />
                            <span className="font-semibold text-slate-700">SSL (Port 465)</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setWizardStep(1)}
                          className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold"
                        >
                          Back
                        </button>
                        <button 
                          onClick={() => setWizardStep(3)}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                        >
                          Next: Test Connection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Test Connection */}
                  {wizardStep === 3 && (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-xs text-slate-600 font-medium">Step 3: Verification Sandbox</p>
                      
                      <p className="text-slate-500 leading-relaxed">
                        To guarantee corporate deliverability, dispatch a verified outbox socket handshake. Specify a test recipient below:
                      </p>

                      <div className="grid grid-cols-3 gap-3 items-end bg-slate-50/50 p-3 border border-slate-100 rounded-lg">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Send Verification Handshake To</label>
                          <input 
                            type="email" 
                            value={testEmailTarget}
                            onChange={(e) => setTestEmailTarget(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button 
                          onClick={handleTestConnection}
                          disabled={testingStatus === 'testing'}
                          className="w-full py-1.5 font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 rounded-lg flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {testingStatus === 'testing' ? 'Testing...' : 'Dispatch Handshake'}
                        </button>
                      </div>

                      {/* Logs Screen */}
                      {testingStatus !== 'idle' && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Socket Communication Stream</h4>
                          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[10px] leading-relaxed max-h-40 overflow-auto shadow-inner space-y-1">
                            {testLogs.map((logStr, i) => (
                              <p key={i} className={logStr.includes('ERROR') ? 'text-red-400' : logStr.includes('successfully') || logStr.includes('Verified') || logStr.includes('250') ? 'text-emerald-400 animate-pulse' : 'text-slate-300'}>
                                {`> ${logStr}`}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setWizardStep(2)}
                          disabled={testingStatus === 'testing'}
                          className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold"
                        >
                          Back
                        </button>
                        <button 
                          onClick={() => setWizardStep(4)}
                          disabled={testingStatus === 'testing' || testingStatus === 'idle'}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                        >
                          Next: Review & Save
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Save & Apply */}
                  {wizardStep === 4 && (
                    <div className="space-y-4 animate-fade-in">
                      <p className="text-xs text-slate-600 font-medium">Step 4: Save Configuration</p>
                      
                      <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-3">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">Handshake Verified Successfully!</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Your mail pipeline is fully verified to perform direct recruiting transmissions without entering sandboxes.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600 border-t border-blue-100/50">
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 block uppercase">SMTP Provider</span>
                            <span className="font-semibold text-slate-800">{wizProvider}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 block uppercase">Host Endpoint</span>
                            <span className="font-semibold text-slate-800">{wizHost}:{wizPort}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 block uppercase">Auth Username</span>
                            <span className="font-semibold text-slate-800">{wizUsername}</span>
                          </div>
                          <div>
                            <span className="font-mono text-[9px] text-slate-400 block uppercase">Handshake Status</span>
                            <span className="font-semibold text-emerald-600 flex items-center gap-1 font-mono">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              VERIFIED
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setWizardStep(3)}
                          className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold"
                        >
                          Back
                        </button>
                        <button 
                          onClick={handleSaveEmailConfig}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                        >
                          Save & Activate Outbox
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* SMTP Glossary / Help Column */}
              <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  recruiter-friendly smtp glossary
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-500 mt-2 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-800 block">What is SMTP?</span>
                    The Simple Mail Transfer Protocol is the digital post office protocol your recruiter uses to push communication log triggers out of the platform.
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">Host & Port?</span>
                    The host is your provider's server address (e.g. Google's is smtp.gmail.com). Port 587 is the secure lockbox pathway.
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">App-Specific Password?</span>
                    An advanced security code generated inside your email provider settings (Gmail/Outlook) which bypasses MFA safeguards safely.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEAM MEMBERS */}
          {activeTab === 'team' && (
            <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 font-sans">Corporate Agency Roster</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Control operational roles, resend invites, and configure permissions across your recruitment staff.</p>
                  </div>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Invite Team Member
                  </button>
                </div>

                {/* Team Roster Grid Layout */}
                <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-mono uppercase tracking-wider border-b border-slate-150">
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
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs">
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
                              <span className="text-[9px] font-mono px-1 py-0.5 bg-slate-100 border border-slate-150 text-slate-500 rounded uppercase">
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
                                className="p-1 text-slate-400 hover:text-slate-600"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingMember(member)}
                                title="Edit Role"
                                className="p-1 text-slate-400 hover:text-blue-600"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              {member.status === 'Pending' ? (
                                <button 
                                  onClick={() => handleResendInvite(member.name)}
                                  title="Resend Invitation"
                                  className="p-1 text-slate-400 hover:text-amber-600"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleResetPassword(member.name)}
                                  title="Reset Password"
                                  className="p-1 text-slate-400 hover:text-indigo-600"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleToggleMemberStatus(member.id)}
                                title={member.status === 'Disabled' ? 'Enable user' : 'Disable user'}
                                className={`p-1 ${member.status === 'Disabled' ? 'text-slate-400 hover:text-emerald-600' : 'text-slate-400 hover:text-rose-500'}`}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              {member.role !== 'Owner' && (
                                <button 
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                  title="Remove Member"
                                  className="p-1 text-slate-400 hover:text-red-600"
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
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-blue-500" />
                  recruitment agency role permissions guide
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-[10px] text-slate-500 leading-relaxed pt-1">
                  {Object.keys(ROLE_PERMISSIONS).map(roleKey => (
                    <div key={roleKey} className="border-r border-slate-150/60 last:border-none pr-2">
                      <p className="font-bold text-slate-800">{roleKey}</p>
                      <ul className="list-disc list-inside space-y-0.5 mt-1 text-[9px] text-slate-400">
                        {ROLE_PERMISSIONS[roleKey].slice(0, 3).map((perm, pi) => (
                          <li key={pi} className="truncate">{perm}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Recruiter Alert Triggers</h2>
              <p className="text-xs text-slate-500 leading-relaxed">Customize when to notify recruiters via screen alerts or automatic logs.</p>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={notifyOnApply}
                    onChange={(e) => setNotifyOnApply(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">New Candidate Uploads</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Post an activity feed entry whenever a resume completes parsing successfully.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={notifyOnMatch}
                    onChange={(e) => setNotifyOnMatch(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-slate-200 rounded focus:ring-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">Match Score Alerts</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Notify the recruiting panel when a parsed candidate returns a Match Score exceeding 90%.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ==========================================
          TEAM MANAGEMENT POPUP MODALS
          ========================================== */}

      {/* 1. INVITE MEMBER POPUP */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleInviteSubmit}
            className="bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden animate-scale-up text-xs text-slate-600"
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
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Liam Chen"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="liam.c@agency.com"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Role Designation</label>
                  <select 
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <input 
                    type="text" 
                    value={inviteDept}
                    onChange={(e) => setInviteDept(e.target.value)}
                    placeholder="e.g. Executive Staff"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Personal Greeting (Optional)</label>
                <textarea 
                  rows={3}
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                  placeholder="Welcome to our hiring dashboard! Looking forward to reviewing candidates together."
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
              <button 
                type="button" 
                onClick={() => setShowInviteModal(false)}
                className="px-3.5 py-1.5 font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isInviting}
                className="px-4 py-1.5 font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
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
        </div>
      )}

      {/* 2. VIEW PERMISSIONS MODAL */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden animate-scale-up text-xs text-slate-600">
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
              <button onClick={() => setViewingMember(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                  {viewingMember.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{viewingMember.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{viewingMember.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Authorized Operational Rights</h4>
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

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
              <button 
                onClick={() => setViewingMember(null)}
                className="px-4 py-1.5 font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. EDIT ROLE MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-transparent backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveMemberEdit}
            className="bg-white rounded-xl shadow-lg border border-slate-200/80 max-w-sm w-full overflow-hidden animate-scale-up text-xs text-slate-600"
          >
            <div className="h-14 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Edit2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Modify Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Editing: {editingMember.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editingMember.name}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={editingMember.email}
                  onChange={(e) => setEditingMember(prev => prev ? { ...prev, email: e.target.value } : null)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Role Designation</label>
                  <select 
                    value={editingMember.role}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin">Admin</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Department</label>
                  <input 
                    type="text" 
                    value={editingMember.department}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, department: e.target.value } : null)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 gap-2">
              <button 
                type="button" 
                onClick={() => setEditingMember(null)}
                className="px-3.5 py-1.5 font-semibold border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
