import React from 'react';
import { Sliders, Paintbrush, Mail, Users, Bell, Database, Shield, Lock, History } from 'lucide-react';
import { TeamMember, EmailConfig } from '../types';
import ThemeBuilderView from './ThemeBuilderView';
import { useSettingsState } from './settings/useSettingsState';
import { SettingsGeneralTab } from './settings/SettingsGeneralTab';
import { SettingsEmailTab } from './settings/SettingsEmailTab';
import { SettingsTeamTab } from './settings/SettingsTeamTab';
import { SettingsNotificationsTab } from './settings/SettingsNotificationsTab';
import { SettingsCustomFieldsTab } from './settings/SettingsCustomFieldsTab';
import { SettingsTeamModals } from './settings/SettingsTeamModals';
import { SettingsRbacTab } from './settings/SettingsRbacTab';
import { SettingsFeatureLocksTab } from './settings/SettingsFeatureLocksTab';
import { SettingsSecurityLogsTab } from './settings/SettingsSecurityLogsTab';

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
  isLoading?: boolean;
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
  onThemeChanged,
  isLoading = false
}: SettingsViewProps) {
  const state = useSettingsState({
    teamMembers,
    setTeamMembers,
    emailConfig,
    setEmailConfig,
    addActivityLog,
    setNotifications,
    showToast
  });

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
            onClick={() => state.setActiveTab('general')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'general' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Sliders className="h-4 w-4" />
            General Profile
          </button>

          <button
            onClick={() => state.setActiveTab('appearance')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'appearance' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Paintbrush className="h-4 w-4" />
            Appearance (Theme)
          </button>
          
          <button
            onClick={() => state.setActiveTab('email')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'email' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Setup Wizard
            {!emailConfig.isConnected && (
              <span className="ml-auto h-2 w-2 rounded-full bg-rose-500 animate-pulse" title="SMTP Not Configured" />
            )}
          </button>

          <button
            onClick={() => state.setActiveTab('team')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'team' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Team Members
            <span className="ml-auto px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded font-mono font-medium">
              {teamMembers.length}
            </span>
          </button>

          <button
            onClick={() => state.setActiveTab('notifications')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'notifications' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>

          <button
            onClick={() => state.setActiveTab('custom_fields')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'custom_fields' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Database className="h-4 w-4" />
            Custom Fields
          </button>

          <button
            onClick={() => state.setActiveTab('rbac')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'rbac' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Shield className="h-4 w-4" />
            Roles & Permissions
          </button>

          <button
            onClick={() => state.setActiveTab('locks')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'locks' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Lock className="h-4 w-4" />
            Feature Management
          </button>

          <button
            onClick={() => state.setActiveTab('logs')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'logs' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            Security Audit Logs
          </button>
        </div>

        {/* Right Settings Pane */}
        <div className="md:col-span-3 p-6 flex flex-col justify-between">
          {isLoading ? (
            <div className="space-y-6 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-48 bg-slate-200 rounded" />
                <div className="h-3 w-72 bg-slate-100 rounded" />
              </div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-16 bg-slate-100 rounded" />
                    <div className="h-9 w-full bg-slate-50 border border-slate-100 rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="h-9 w-24 bg-slate-200 rounded-lg ml-auto" />
            </div>
          ) : (
            <>
              {/* APPEARANCE TAB */}
              {state.activeTab === 'appearance' && (
                <ThemeBuilderView 
              currentThemeId={currentThemeId} 
              onThemeChanged={onThemeChanged} 
              showToast={showToast} 
            />
          )}
          
          {/* GENERAL TAB */}
          {state.activeTab === 'general' && (
            <SettingsGeneralTab
              companyName={state.companyName}
              setCompanyName={state.setCompanyName}
              recruiterName={state.recruiterName}
              setRecruiterName={state.setRecruiterName}
              savedMessage={state.savedMessage}
              handleSaveGeneral={state.handleSaveGeneral}
            />
          )}

          {/* EMAIL SETUP WIZARD */}
          {state.activeTab === 'email' && (
            <SettingsEmailTab
              emailConfig={emailConfig}
              wizardStep={state.wizardStep}
              setWizardStep={state.setWizardStep}
              wizProvider={state.wizProvider}
              wizHost={state.wizHost}
              setWizHost={state.setWizHost}
              wizPort={state.wizPort}
              setWizPort={state.setWizPort}
              wizUsername={state.wizUsername}
              setWizUsername={state.setWizUsername}
              wizPassword={state.wizPassword}
              setWizPassword={state.setWizPassword}
              wizEncryption={state.wizEncryption}
              setWizEncryption={state.setWizEncryption}
              testEmailTarget={state.testEmailTarget}
              setTestEmailTarget={state.setTestEmailTarget}
              testingStatus={state.testingStatus}
              testLogs={state.testLogs}
              handleSelectProvider={state.handleSelectProvider}
              handleTestConnection={state.handleTestConnection}
              handleSaveEmailConfig={state.handleSaveEmailConfig}
            />
          )}

          {/* TEAM MEMBERS */}
          {state.activeTab === 'team' && (
            <SettingsTeamTab
              teamMembers={teamMembers}
              setShowInviteModal={state.setShowInviteModal}
              setViewingMember={state.setViewingMember}
              setEditingMember={state.setEditingMember}
              handleResendInvite={state.handleResendInvite}
              handleResetPassword={state.handleResetPassword}
              handleToggleMemberStatus={state.handleToggleMemberStatus}
              handleRemoveMember={state.handleRemoveMember}
            />
          )}

          {/* NOTIFICATIONS */}
          {state.activeTab === 'notifications' && (
            <SettingsNotificationsTab
              notifyOnApply={state.notifyOnApply}
              setNotifyOnApply={state.setNotifyOnApply}
              notifyOnMatch={state.notifyOnMatch}
              setNotifyOnMatch={state.setNotifyOnMatch}
              resumeNotificationEnabled={state.resumeNotificationEnabled}
              setResumeNotificationEnabled={state.setResumeNotificationEnabled}
              resumeNotificationEmail={state.resumeNotificationEmail}
              setResumeNotificationEmail={state.setResumeNotificationEmail}
              telegramChatId={state.telegramChatId}
              telegramToken={state.telegramToken}
              telegramNotificationEnabled={state.telegramNotificationEnabled}
              setTelegramNotificationEnabled={state.setTelegramNotificationEnabled}
              handleGenerateTelegramToken={state.handleGenerateTelegramToken}
              handleDisconnectTelegram={state.handleDisconnectTelegram}
              handleSaveNotifications={state.handleSaveNotifications}
              isSavingNotifications={state.isSavingNotifications}
            />
          )}

          {/* CUSTOM FIELDS */}
          {state.activeTab === 'custom_fields' && (
            <SettingsCustomFieldsTab />
          )}

          {/* ROLES & PERMISSIONS */}
          {state.activeTab === 'rbac' && (
            <SettingsRbacTab />
          )}

          {/* FEATURE MANAGEMENT */}
          {state.activeTab === 'locks' && (
            <SettingsFeatureLocksTab />
          )}

          {/* SECURITY AUDIT LOGS */}
          {state.activeTab === 'logs' && (
            <SettingsSecurityLogsTab />
          )}

            </>
          )}

        </div>

      </div>

      <SettingsTeamModals
        showInviteModal={state.showInviteModal}
        setShowInviteModal={state.setShowInviteModal}
        inviteName={state.inviteName}
        setInviteName={state.setInviteName}
        inviteEmail={state.inviteEmail}
        setInviteEmail={state.setInviteEmail}
        invitePassword={state.invitePassword}
        setInvitePassword={state.setInvitePassword}
        inviteRole={state.inviteRole}
        setInviteRole={state.setInviteRole}
        inviteDept={state.inviteDept}
        setInviteDept={state.setInviteDept}
        inviteMsg={state.inviteMsg}
        setInviteMsg={state.setInviteMsg}
        isInviting={state.isInviting}
        handleInviteSubmit={state.handleInviteSubmit}
        viewingMember={state.viewingMember}
        setViewingMember={state.setViewingMember}
        editingMember={state.editingMember}
        setEditingMember={state.setEditingMember}
        handleSaveMemberEdit={state.handleSaveMemberEdit}
      />

    </div>
  );
}
