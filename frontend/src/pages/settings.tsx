import React from 'react';
import { useApp } from '@/context/AppContext';
import SettingsView from '@/components/SettingsView';
import { TeamMember, EmailConfig } from '@/types';

export default function SettingsPage() {
  const {
    teamMembers,
    emailConfig,
    handleAddTeamMember,
    handleUpdateTeamMember,
    handleDeleteTeamMember,
    handleSaveEmailConfig,
    addActivityLog,
    showToast,
    isLoading
  } = useApp();

  const setTeamMembersWrapper = async (action: any) => {
    let nextTeamMembers: TeamMember[] = [];
    if (typeof action === 'function') {
      nextTeamMembers = action(teamMembers);
    } else {
      nextTeamMembers = action;
    }

    if (nextTeamMembers.length > teamMembers.length) {
      const added = nextTeamMembers.find(m => !teamMembers.some(tm => tm.id === m.id));
      if (added) await handleAddTeamMember(added);
    } else if (nextTeamMembers.length < teamMembers.length) {
      const deleted = teamMembers.find(m => !nextTeamMembers.some(tm => tm.id === m.id));
      if (deleted) await handleDeleteTeamMember(deleted.id);
    } else {
      for (const m of nextTeamMembers) {
        const original = teamMembers.find(tm => tm.id === m.id);
        if (original && JSON.stringify(original) !== JSON.stringify(m)) {
          await handleUpdateTeamMember(m);
        }
      }
    }
  };

  const setEmailConfigWrapper = async (action: any) => {
    let nextConfig: EmailConfig;
    if (typeof action === 'function') {
      nextConfig = action(emailConfig);
    } else {
      nextConfig = action;
    }
    await handleSaveEmailConfig(nextConfig);
  };

  return (
    <SettingsView
      teamMembers={teamMembers}
      setTeamMembers={setTeamMembersWrapper as any}
      emailConfig={emailConfig}
      setEmailConfig={setEmailConfigWrapper as any}
      addActivityLog={addActivityLog}
      setNotifications={() => {}} // dummy notifications updater
      showToast={showToast}
      isLoading={isLoading}
      currentThemeId={typeof window !== 'undefined' ? localStorage.getItem('apex-theme') || 'slate' : 'slate'}
      onThemeChanged={(themeId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('apex-theme', themeId);
          window.location.reload(); // reload to apply theme cleanly
        }
      }}
    />
  );
}
