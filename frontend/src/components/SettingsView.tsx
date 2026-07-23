import React from 'react';
import { Sliders, Paintbrush, Mail, Users, Bell, Database, Shield, Lock, History, CreditCard, Sparkles, X, Check, Briefcase, Boxes } from 'lucide-react';
import { TeamMember, EmailConfig } from '../types';
import ThemeBuilderView from './ThemeBuilderView';
import { useSettingsState } from './settings/useSettingsState';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import AnimatedModal from './AnimatedModal';
import { SettingsGeneralTab } from './settings/SettingsGeneralTab';
import { SettingsEmailTab } from './settings/SettingsEmailTab';
import { EmailIntegrationTab } from './settings/EmailIntegrationTab';
import { SettingsTeamTab } from './settings/SettingsTeamTab';
import { SettingsNotificationsTab } from './settings/SettingsNotificationsTab';
import { SettingsCustomFieldsTab } from './settings/SettingsCustomFieldsTab';
import { SettingsTeamModals } from './settings/SettingsTeamModals';
import { SettingsRbacTab } from './settings/SettingsRbacTab';
import { SettingsFeatureLocksTab } from './settings/SettingsFeatureLocksTab';
import { SettingsSecurityLogsTab } from './settings/SettingsSecurityLogsTab';
import { RecruiterManagementTab } from './settings/RecruiterManagementTab';
import { SettingsModulesTab } from './settings/SettingsModulesTab';

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
  const { subscriptionPlan, isTrialActive, getTrialDaysRemaining, user, token, setShowUpgradeSuccess, currentUserRole } = useApp();
  const [isPricingModalOpen, setIsPricingModalOpen] = React.useState(false);
  const [isUpgrading, setIsUpgrading] = React.useState(false);

  const state = useSettingsState({
    teamMembers,
    setTeamMembers,
    emailConfig,
    setEmailConfig,
    addActivityLog,
    setNotifications,
    showToast,
    token
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
            onClick={() => state.setActiveTab('modules')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'modules'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40'
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Boxes className="h-4 w-4" />
            Modules & Add-ons
          </button>
          
          {/*
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
          */}

          <button
            onClick={() => state.setActiveTab('email_integration' as any)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === ('email_integration' as any)
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40'
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Integration
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

          {(currentUserRole === 'Owner' || currentUserRole === 'Admin') && (
            <button
              onClick={() => state.setActiveTab('recruiters')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                state.activeTab === 'recruiters' 
                  ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                  : 'text-slate-55 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Recruiter Sourcing
            </button>
          )}

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

          <button
            onClick={() => state.setActiveTab('billing')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
              state.activeTab === 'billing' 
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/40' 
                : 'text-slate-505 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Billing & Plan
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

              {/* MODULES & ADD-ONS TAB */}
              {state.activeTab === 'modules' && (
                <SettingsModulesTab showToast={showToast} />
              )}
          
          {/* GENERAL TAB */}
          {state.activeTab === 'general' && (
            <SettingsGeneralTab
              companyName={state.companyName}
              setCompanyName={state.setCompanyName}
              savedMessage={state.savedMessage}
              handleSaveGeneral={state.handleSaveGeneral}
            />
          )}

          {/* EMAIL INTEGRATION (OAuth) */}
          {state.activeTab === ('email_integration' as any) && (
            <EmailIntegrationTab showToast={showToast} />
          )}

          {/* EMAIL SETUP WIZARD (SMTP legacy) */}
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

          {/* RECRUITER MANAGEMENT */}
          {state.activeTab === 'recruiters' && (
            <RecruiterManagementTab />
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

          {/* BILLING TAB */}
          {state.activeTab === 'billing' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">Subscription Billing Details</h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">View your current workspace pricing tier and active licenses.</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider font-mono">Current Status</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">
                      {isTrialActive() ? '7-Day Free Trial (Active)' : `Active Subscription (${subscriptionPlan?.slug || 'starter'})`}
                    </span>
                  </div>
                  {isTrialActive() ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 border border-indigo-100/50 text-indigo-700">
                      <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" /> Free Trial
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-100/50 text-emerald-700">
                      Paid Plan
                    </span>
                  )}
                </div>

                {isTrialActive() && (
                  <div className="border-t border-slate-200/60 pt-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-500 font-medium font-sans">Trial Expiration:</span>{' '}
                      <span className="font-bold text-slate-800 font-mono">
                        {subscriptionPlan?.trialEndDate ? new Date(subscriptionPlan.trialEndDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="text-indigo-600 font-bold font-mono">
                      {getTrialDaysRemaining()} Days Remaining
                    </div>
                  </div>
                )}
              </div>

              {isTrialActive() ? (
                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-indigo-950 block">Ready to upgrade?</span>
                    <span className="text-[10px] text-slate-500 block leading-normal">
                      Convert to a paid plan today to ensure continuous, uninterrupted access to all candidate details, custom template lists, and automation tools.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPricingModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-xs font-black transition-all hover:scale-[1.02] shadow-md cursor-pointer shrink-0"
                  >
                    Upgrade Plan
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-slate-800 block">Manage pricing plan settings</span>
                    <span className="text-[10px] text-slate-500 block leading-normal">
                      Update your credit card info or select standard and pro options.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsPricingModalOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black transition-all hover:bg-blue-700 cursor-pointer shrink-0"
                  >
                    Change Plan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pricing / Plan Upgrade Modal */}
          <AnimatedModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)}>
            {(animate) => (
              <div 
                className={`bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-3xl w-full overflow-hidden transition-all duration-200 transform ${
                  animate ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-900 font-sans uppercase">Select License Tier</h4>
                  <button 
                    type="button" 
                    onClick={() => setIsPricingModalOpen(false)} 
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <p className="text-xs text-slate-400 font-medium">Select a pricing model to upgrade this workspace</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Standard Plan */}
                    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 font-sans">Standard Plan</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">Perfect for small agencies requiring robust pipeline candidate trackers.</p>
                        <div className="text-xl font-mono font-black text-slate-900">₹2,000<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
                        <ul className="space-y-1 text-[10px] text-slate-500 font-medium">
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Up to 5 team members</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Unlimited jobs & candidates</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Dedicated Kanban board</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (isUpgrading) return;
                          setIsUpgrading(true);
                          try {
                            const orderRes = await fetch('/api/payments/create-order', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({ planSlug: 'starter' }),
                            });

                            if (!orderRes.ok) {
                              const errData = await orderRes.json();
                              throw new Error(errData.error || 'Failed to create order');
                            }
                            const orderData = await orderRes.json();

                            const options = {
                              key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                              amount: orderData.amount,
                              currency: orderData.currency,
                              name: "Hirly AI Platform",
                              description: "Upgrade License to STANDARD",
                              order_id: orderData.orderId,
                              handler: async function (response: any) {
                                const verifyRes = await fetch('/api/payments/verify-payment', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpaySignature: response.razorpay_signature,
                                    planSlug: 'starter'
                                  })
                                });

                                if (verifyRes.ok) {
                                  setShowUpgradeSuccess(true);
                                  setIsPricingModalOpen(false);
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 3500);
                                } else {
                                  const errData = await verifyRes.json();
                                  showToast(errData.error || 'Payment verification failed', 'error');
                                }
                              },
                              prefill: {
                                email: user?.email || '',
                                name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
                              },
                              theme: {
                                color: "#3161f5"
                              },
                              modal: {
                                ondismiss: function () {
                                  showToast('Upgrade cancelled by user.', 'error');
                                }
                              }
                            };

                            const rzp = new (window as any).Razorpay(options);
                            rzp.on('payment.failed', function (resp: any) {
                              showToast(`Payment failed: ${resp.error.description}`, 'error');
                            });
                            rzp.open();
                          } catch (err: any) {
                            showToast(err.message || 'Upgrade failed', 'error');
                          } finally {
                            setIsUpgrading(false);
                          }
                        }}
                        disabled={isUpgrading}
                        className={`w-full mt-5 py-2 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isUpgrading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUpgrading ? 'Loading...' : subscriptionPlan?.slug === 'starter' ? 'Repurchase Standard' : 'Choose Standard'}
                      </button>
                    </div>

                    {/* AI Pro Plan */}
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 flex flex-col justify-between relative">
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-blue-600 text-white text-[8px] font-bold uppercase rounded-full">Recommended</span>
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 font-sans">AI Pro Plan</h4>
                        <p className="text-[10px] text-slate-400 leading-relaxed">Full access to AI Parsing, automatic resume grading and voice commands.</p>
                        <div className="text-xl font-mono font-black text-slate-900">₹5,000<span className="text-[10px] text-slate-400 font-normal">/mo</span></div>
                        <ul className="space-y-1 text-[10px] text-slate-500 font-medium">
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Unlimited team members</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Voice AI command copilot</li>
                          <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600" /> Premium AI matching filters</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (isUpgrading) return;
                          setIsUpgrading(true);
                          try {
                            const orderRes = await fetch('/api/payments/create-order', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({ planSlug: 'growth' }),
                            });

                            if (!orderRes.ok) {
                              const errData = await orderRes.json();
                              throw new Error(errData.error || 'Failed to create order');
                            }
                            const orderData = await orderRes.json();

                            const options = {
                              key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
                              amount: orderData.amount,
                              currency: orderData.currency,
                              name: "Hirly AI Platform",
                              description: "Upgrade License to AI PRO",
                              order_id: orderData.orderId,
                              handler: async function (response: any) {
                                const verifyRes = await fetch('/api/payments/verify-payment', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                  },
                                  body: JSON.stringify({
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpaySignature: response.razorpay_signature,
                                    planSlug: 'growth'
                                  })
                                });

                                if (verifyRes.ok) {
                                  setShowUpgradeSuccess(true);
                                  setIsPricingModalOpen(false);
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 3500);
                                } else {
                                  const errData = await verifyRes.json();
                                  showToast(errData.error || 'Payment verification failed', 'error');
                                }
                              },
                              prefill: {
                                email: user?.email || '',
                                name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
                              },
                              theme: {
                                color: "#3161f5"
                              },
                              modal: {
                                ondismiss: function () {
                                  showToast('Upgrade cancelled by user.', 'error');
                                }
                              }
                            };

                            const rzp = new (window as any).Razorpay(options);
                            rzp.on('payment.failed', function (resp: any) {
                              showToast(`Payment failed: ${resp.error.description}`, 'error');
                            });
                            rzp.open();
                          } catch (err: any) {
                            showToast(err.message || 'Upgrade failed', 'error');
                          } finally {
                            setIsUpgrading(false);
                          }
                        }}
                        disabled={isUpgrading}
                        className={`w-full mt-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isUpgrading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isUpgrading ? 'Loading...' : subscriptionPlan?.slug === 'growth' ? 'Repurchase AI Pro' : 'Choose AI Pro'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </AnimatedModal>

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
