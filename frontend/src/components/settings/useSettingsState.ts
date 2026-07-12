import React, { useState } from 'react';
import { TeamMember, EmailConfig } from '../../types';

interface UseSettingsStateProps {
  teamMembers: TeamMember[];
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>;
  emailConfig: EmailConfig;
  setEmailConfig: React.Dispatch<React.SetStateAction<EmailConfig>>;
  addActivityLog: (type: string, description: string) => void;
  setNotifications: React.Dispatch<React.SetStateAction<{ id: string; text: string; time: string; read: boolean }[]>>;
  showToast: (text: string, type: 'success' | 'error') => void;
  token?: string | null;
}

export function useSettingsState({
  teamMembers,
  setTeamMembers,
  emailConfig,
  setEmailConfig,
  addActivityLog,
  setNotifications,
  showToast,
  token
}: UseSettingsStateProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'team' | 'email' | 'notifications' | 'custom_fields' | 'rbac' | 'locks' | 'logs' | 'billing'>('general');
  const [savedMessage, setSavedMessage] = useState(false);

  // General tab form values
  const [companyName, setCompanyName] = useState('Hirly - Recruitment');
  const [recruiterName, setRecruiterName] = useState('Sarah Jenkins');
  const [waNumber, setWaNumber] = useState('+1 (555) 304-4422');
  const [enableWhatsAppAutoAlert, setEnableWhatsAppAutoAlert] = useState(true);
  const [notifyOnApply, setNotifyOnApply] = useState(true);
  const [notifyOnMatch, setNotifyOnMatch] = useState(true);

  // Resume notification states loaded from emailConfig
  const [resumeNotificationEnabled, setResumeNotificationEnabled] = useState(false);
  const [resumeNotificationEmail, setResumeNotificationEmail] = useState('');
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramNotificationEnabled, setTelegramNotificationEnabled] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  React.useEffect(() => {
    if (emailConfig) {
      setResumeNotificationEnabled(emailConfig.resumeNotificationEnabled || false);
      setResumeNotificationEmail(emailConfig.resumeNotificationEmail || '');
      setTelegramChatId(emailConfig.telegramChatId || null);
      setTelegramToken(emailConfig.telegramToken || null);
      setTelegramNotificationEnabled(emailConfig.telegramNotificationEnabled || false);
    }
  }, [emailConfig]);

  const handleGenerateTelegramToken = async () => {
    const newToken = 'hl_' + Math.random().toString(36).substring(2, 10);
    try {
      const updatedConfig = {
        ...emailConfig,
        telegramToken: newToken
      };
      
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error('Failed to generate token');
      const data = await res.json();
      setEmailConfig(data);
      showToast('✓ Telegram linking code generated!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to generate connection code.', 'error');
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      const updatedConfig = {
        ...emailConfig,
        telegramChatId: null,
        telegramToken: null,
        telegramNotificationEnabled: false
      };
      
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) throw new Error('Failed to disconnect Telegram');
      const data = await res.json();
      setEmailConfig(data);
      showToast('✓ Telegram bot disconnected.', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to disconnect Telegram.', 'error');
    }
  };

  // Poll for Telegram connection status if token is generated but not linked yet
  React.useEffect(() => {
    if (!telegramToken || telegramChatId) return;

    const interval = setInterval(async () => {
      try {
        const { supabase } = await import('../../utils/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const res = await fetch('/api/email-config', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.telegramChatId) {
            setEmailConfig(data);
            showToast('✓ Telegram Bot linked successfully!', 'success');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling Telegram connection status:', err);
      }
    }, 3005);

    return () => clearInterval(interval);
  }, [telegramToken, telegramChatId, setEmailConfig]);

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNotifications(true);
    try {
      const { supabase } = await import('../../utils/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Fetch latest email-config to preserve current Telegram connection details
      const latestRes = await fetch('/api/email-config', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let currentDbConfig = emailConfig;
      if (latestRes.ok) {
        currentDbConfig = await latestRes.json();
      }

      // 2. Merge changes safely
      const updatedConfig = {
        ...currentDbConfig,
        resumeNotificationEnabled,
        resumeNotificationEmail,
        telegramNotificationEnabled
      };
      
      const res = await fetch('/api/email-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updatedConfig)
      });

      if (!res.ok) {
        throw new Error('Failed to save notification settings');
      }

      const data = await res.json();
      setEmailConfig(data);
      addActivityLog('System', `Updated resume upload email and Telegram notification settings.`);
      showToast('✓ Notification settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Failed to save notification settings.', 'error');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  // EMAIL SETUP WIZARD STATES
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizProvider, setWizProvider] = useState<'Gmail' | 'Outlook' | 'SMTP'>('Gmail');
  const [wizHost, setWizHost] = useState('smtp.gmail.com');
  const [wizPort, setWizPort] = useState('587');
  const [wizUsername, setWizUsername] = useState('sarah.j@apexstaffing.com');
  const [wizPassword, setWizPassword] = useState('••••••••••••');
  const [wizEncryption, setWizEncryption] = useState<'TLS' | 'SSL'>('TLS');
  
  const [testEmailTarget, setTestEmailTarget] = useState('sarah.j@apexstaffing.com');
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testLogs, setTestLogs] = useState<string[]>([]);

  // TEAM MANAGEMENT STATES
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
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

  // EMAIL WIZARD ACTIONS
  const handleSelectProvider = (prov: 'Gmail' | 'Outlook' | 'SMTP') => {
    setWizProvider(prov);
    if (prov === 'Gmail') {
      setWizHost('smtp.gmail.com');
      setWizPort('587');
    } else if (prov === 'Outlook') {
      setWizHost('smtp.office365.com');
      setWizPort('587');
    } else {
      setWizHost('');
      setWizPort('');
    }
    setWizardStep(2);
  };

  const handleTestConnection = async () => {
    setTestingStatus('testing');
    setTestLogs([
      'Initializing SMTP socket connection...',
      `Connecting to host ${wizHost}:${wizPort}...`,
      `Negotiating secure ${wizEncryption} handshake...`
    ]);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || '';

    try {
      const res = await fetch(`${backendUrl}/api/email-config/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider: wizProvider,
          smtpHost: wizHost,
          port: wizPort,
          username: wizUsername,
          password: wizPassword,
          encryption: wizEncryption,
          testEmailTarget
        })
      });

      // Guard against non-JSON responses (HTML error pages, etc.)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 120)}`);
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setTestLogs(data.logs || ['SMTP Connection Verified!']);
        setTestingStatus('success');
        showToast('✓ SMTP Connection Verified!', 'success');
      } else {
        setTestLogs(data.logs || ['ERROR: SMTP connection failed.', data.error || 'Unknown error']);
        setTestingStatus('failed');
        showToast(data.error ? `❌ ${data.error}` : '❌ Outbox authentication failed.', 'error');
      }
    } catch (err: any) {
      setTestLogs(prev => [...prev, `ERROR: ${err.message || 'Network error'}`]);
      setTestingStatus('failed');
      showToast('❌ Failed to test outbox connection.', 'error');
    }
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

  // TEAM MANAGEMENT ACTIONS
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
        lastLogin: 'Never',
        password: invitePassword || undefined
      };

      setTeamMembers(prev => [...prev, newMember]);
      addActivityLog('Team', `Invited new team member: ${inviteName} (${inviteRole}).`);
      setNotifications(prev => [
        { id: 'n_' + Date.now(), text: `Team invitation dispatched to ${inviteEmail}.`, time: 'Just now', read: false },
        ...prev
      ]);

      showToast(`✓ Invitation sent successfully to ${inviteName}!`, 'success');
      setShowInviteModal(false);
      
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
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

  return {
    activeTab,
    setActiveTab,
    savedMessage,
    companyName,
    setCompanyName,
    recruiterName,
    setRecruiterName,
    waNumber,
    setWaNumber,
    enableWhatsAppAutoAlert,
    setEnableWhatsAppAutoAlert,
    notifyOnApply,
    setNotifyOnApply,
    notifyOnMatch,
    setNotifyOnMatch,
    wizardStep,
    setWizardStep,
    wizProvider,
    setWizProvider,
    wizHost,
    setWizHost,
    wizPort,
    setWizPort,
    wizUsername,
    setWizUsername,
    wizPassword,
    setWizPassword,
    wizEncryption,
    setWizEncryption,
    testEmailTarget,
    setTestEmailTarget,
    testingStatus,
    setTestingStatus,
    testLogs,
    setTestLogs,
    showInviteModal,
    setShowInviteModal,
    inviteName,
    setInviteName,
    inviteEmail,
    setInviteEmail,
    invitePassword,
    setInvitePassword,
    inviteRole,
    setInviteRole,
    inviteDept,
    setInviteDept,
    inviteMsg,
    setInviteMsg,
    isInviting,
    setIsInviting,
    editingMember,
    setEditingMember,
    viewingMember,
    setViewingMember,
    handleSaveGeneral,
    handleSelectProvider,
    handleTestConnection,
    handleSaveEmailConfig,
    handleInviteSubmit,
    handleToggleMemberStatus,
    handleResetPassword,
    handleResendInvite,
    handleRemoveMember,
    handleSaveMemberEdit,
    resumeNotificationEnabled,
    setResumeNotificationEnabled,
    resumeNotificationEmail,
    setResumeNotificationEmail,
    telegramChatId,
    setTelegramChatId,
    telegramToken,
    setTelegramToken,
    telegramNotificationEnabled,
    setTelegramNotificationEnabled,
    isSavingNotifications,
    handleSaveNotifications,
    handleGenerateTelegramToken,
    handleDisconnectTelegram
  };
}
