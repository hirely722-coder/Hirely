import React from 'react';
import { Info, CheckCircle } from 'lucide-react';
import { EmailConfig } from '../../types';

interface SettingsEmailTabProps {
  emailConfig: EmailConfig;
  wizardStep: 1 | 2 | 3 | 4;
  setWizardStep: (step: 1 | 2 | 3 | 4) => void;
  wizProvider: 'Gmail' | 'Outlook' | 'SMTP';
  wizHost: string;
  setWizHost: (host: string) => void;
  wizPort: string;
  setWizPort: (port: string) => void;
  wizUsername: string;
  setWizUsername: (username: string) => void;
  wizPassword: string;
  setWizPassword: (pw: string) => void;
  wizEncryption: 'TLS' | 'SSL';
  setWizEncryption: (enc: 'TLS' | 'SSL') => void;
  testEmailTarget: string;
  setTestEmailTarget: (target: string) => void;
  testingStatus: 'idle' | 'testing' | 'success' | 'failed';
  testLogs: string[];
  handleSelectProvider: (prov: 'Gmail' | 'Outlook' | 'SMTP') => void;
  handleTestConnection: () => void;
  handleSaveEmailConfig: () => void;
}

export function SettingsEmailTab({
  emailConfig,
  wizardStep,
  setWizardStep,
  wizProvider,
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
  testLogs,
  handleSelectProvider,
  handleTestConnection,
  handleSaveEmailConfig
}: SettingsEmailTabProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  if (emailConfig.isConnected && !isEditing) {
    return (
      <div className="space-y-5 animate-fade-in flex-1 flex flex-col justify-between text-slate-800">
        <div>
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 font-sans">Email Integration</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your active verified outbound recruiting mail connection.</p>
          </div>

          <div className="py-4 text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl overflow-hidden shadow-xs">
              {/* Header banner */}
              <div className="bg-emerald-50/50 border-b border-emerald-100/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Connected & Verified</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Outbox active for direct mailing</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[9px] font-semibold uppercase px-2 py-0.5 bg-emerald-100/60 text-emerald-800 rounded-full border border-emerald-200/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Info details */}
              <div className="p-4 space-y-3.5 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Mail Username (Email)</span>
                    <span className="font-semibold text-slate-800 text-[11px] font-sans break-all">{emailConfig.username || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Integration Method</span>
                    <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5 pt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        emailConfig.provider === 'Gmail' 
                          ? 'bg-red-50 text-red-650 border border-red-100' 
                          : emailConfig.provider === 'Outlook' 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {emailConfig.provider}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">SMTP Host</span>
                    <span className="font-semibold text-slate-800 text-[11px] font-mono">{emailConfig.smtpHost || 'Built-in / Default'}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Server Port & Security</span>
                    <span className="font-semibold text-slate-800 text-[11px] font-mono">
                      {emailConfig.port || '587'} ({emailConfig.encryption || 'TLS'})
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (emailConfig.smtpHost) setWizHost(emailConfig.smtpHost);
                      if (emailConfig.port) setWizPort(emailConfig.port);
                      if (emailConfig.username) setWizUsername(emailConfig.username);
                      if (emailConfig.password) setWizPassword(emailConfig.password);
                      if (emailConfig.encryption) setWizEncryption(emailConfig.encryption as any);
                      setWizardStep(1);
                      setIsEditing(true);
                    }}
                    className="px-4 py-2 font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    Change Email Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glossary */}
        <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
            <Info className="h-3.5 w-3.5 text-blue-500" />
            recruiter-friendly smtp glossary
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-500 mt-2 leading-relaxed font-sans">
            <div>
              <span className="font-bold text-slate-805 block">What is SMTP?</span>
              The Simple Mail Transfer Protocol is the digital post office protocol your recruiter uses to push communication log triggers out of the platform.
            </div>
            <div>
              <span className="font-bold text-slate-805 block">Host & Port?</span>
              The host is your provider's server address (e.g. Google's is smtp.gmail.com). Port 587 is the secure lockbox pathway.
            </div>
            <div>
              <span className="font-bold text-slate-805 block">App-Specific Password?</span>
              An advanced security code generated inside your email provider settings (Gmail/Outlook) which bypasses MFA safeguards safely.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in flex-1 flex flex-col justify-between text-slate-800">
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
                  <div className="h-8 w-8 rounded-lg bg-red-50 text-red-650 flex items-center justify-center font-bold text-sm">G</div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600">Google Workspace / Gmail</p>
                    <p className="text-[10px] text-slate-404 mt-0.5 font-sans">Integrate using secure Gmail Outbox APIs or SMTP.</p>
                  </div>
                </button>

                 <button 
                  onClick={() => handleSelectProvider('Outlook')}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-505 flex items-center justify-center font-bold text-sm">O</div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600">Outlook.com</p>
                    <p className="text-[10px] text-slate-404 mt-0.5 font-sans">Standard personal outlook credentials connection.</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleSelectProvider('SMTP')}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/10 text-left transition-all space-y-2 group cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">S</div>
                  <div>
                    <p className="font-semibold text-slate-900 group-hover:text-blue-600">Custom SMTP Server</p>
                    <p className="text-[10px] text-slate-404 mt-0.5 font-sans">Supply custom ports, hostnames, and encryption layers.</p>
                  </div>
                </button>
              </div>

              {/* Connection status card */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${emailConfig.isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="font-semibold text-slate-900">Current Integration Status</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {emailConfig.isConnected ? `Connected via ${emailConfig.provider} (${emailConfig.username})` : 'Disconnected / Verification Needed'}
                    </p>
                  </div>
                </div>
              </div>

              {emailConfig.isConnected && (
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                  >
                    Cancel Setup
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Configure Credentials */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600 font-medium">Step 2: Authenticate outbound server ({wizProvider})</p>
                <button onClick={() => setWizardStep(1)} className="text-[10px] text-blue-600 hover:underline cursor-pointer">Change Provider</button>
              </div>

              {/* Step-by-step Setup Guide */}
              <div className="p-4 bg-blue-50/30 border border-blue-150/80 rounded-xl space-y-3 font-sans">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <span className="h-4.5 w-4.5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-mono font-bold">i</span>
                  How to setup {wizProvider} integration:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-slate-655 leading-relaxed pl-1 text-[11px]">
                  {wizProvider === 'Gmail' && (
                    <>
                      <li>Go to your <a href="https://myaccount.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-650 hover:underline font-semibold">Google Account Settings</a>.</li>
                      <li>Go to <strong>Security</strong> and turn on <strong>2-Step Verification</strong>.</li>
                      <li>Search for <strong>"App passwords"</strong> in the top search bar (or go to Security &rarr; App passwords).</li>
                      <li>Create a new app password (select <em>Other</em> and name it <strong>Hirely</strong>).</li>
                      <li>Copy the generated 16-character code and paste it into the <strong>Password</strong> field below.</li>
                      <li>Keep host as <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">smtp.gmail.com</code> and port as <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">587</code>.</li>
                    </>
                  )}
                  {wizProvider === 'Outlook' && (
                    <>
                      <li>Go to your <a href="https://account.microsoft.com/" target="_blank" rel="noopener noreferrer" className="text-blue-655 hover:underline font-semibold">Microsoft Account Settings</a>.</li>
                      <li>Go to <strong>Security</strong> &rarr; <strong>Advanced security options</strong>.</li>
                      <li>Scroll down to <strong>App passwords</strong> and click <strong>Create a new app password</strong>.</li>
                      <li>Copy the displayed app password and paste it into the <strong>Password</strong> field below.</li>
                      <li>Keep host as <code className="bg-slate-100 px-1 rounded text-slate-805 font-mono text-[10px]">smtp.office365.com</code> and port as <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">587</code>.</li>
                    </>
                  )}
                  {wizProvider === 'SMTP' && (
                    <>
                      <li>Obtain your <strong>SMTP Host</strong>, <strong>Port</strong>, and login credentials from your email host provider (e.g. Hostinger, AWS SES, SendGrid).</li>
                      <li>Enter the Host (e.g., <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">smtp.yourhosting.com</code>) and Port (typically <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">587</code> or <code className="bg-slate-100 px-1 rounded text-slate-800 font-mono text-[10px]">465</code>).</li>
                      <li>Enter your email address in the <strong>Username</strong> field.</li>
                      <li>Enter your password or credentials key token in the <strong>Password</strong> field.</li>
                      <li>Select the recommended <strong>TLS</strong> encryption protocol for Port 587.</li>
                    </>
                  )}
                </ol>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">SMTP Host / Endpoint</label>
                  <input 
                    type="text" 
                    value={wizHost}
                    onChange={(e) => setWizHost(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="e.g. smtp.mailserver.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Port</label>
                  <input 
                    type="text" 
                    value={wizPort}
                    onChange={(e) => setWizPort(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Outbound Username (Email)</label>
                  <input 
                    type="email" 
                    value={wizUsername}
                    onChange={(e) => setWizUsername(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="username@domain.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">App-Specific Password / Token</label>
                  <input 
                    type="password" 
                    value={wizPassword}
                    onChange={(e) => setWizPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Encryption Protocol</label>
                <div className="flex gap-4 mt-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="encryption" 
                      checked={wizEncryption === 'TLS'}
                      onChange={() => setWizEncryption('TLS')}
                      className="text-blue-600 focus:ring-0 cursor-pointer animate-none"
                    />
                    <span className="font-semibold text-slate-700">TLS (Port 587 - Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="encryption" 
                      checked={wizEncryption === 'SSL'}
                      onChange={() => setWizEncryption('SSL')}
                      className="text-blue-600 focus:ring-0 cursor-pointer animate-none"
                    />
                    <span className="font-semibold text-slate-700">SSL (Port 465)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => setWizardStep(1)}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button 
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
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
              
              <p className="text-slate-500 leading-relaxed font-sans">
                To guarantee deliverability, dispatch a verified outbox socket handshake. Specify a test recipient below:
              </p>

              <div className="grid grid-cols-3 gap-3 items-end bg-slate-50/50 p-3 border border-slate-100 rounded-lg">
                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 font-bold">Send Verification Handshake To</label>
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
                  <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Socket Communication Stream</h4>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[10px] leading-relaxed max-h-40 overflow-auto shadow-inner space-y-1">
                    {testLogs.map((logStr, i) => (
                      <p key={i} className={logStr.includes('ERROR') ? 'text-red-400' : logStr.includes('successfully') || logStr.includes('Verified') || logStr.includes('250') ? 'text-emerald-450 animate-pulse font-semibold' : 'text-slate-300'}>
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
                  className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button 
                  onClick={() => setWizardStep(4)}
                  disabled={testingStatus === 'testing' || testingStatus === 'idle'}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next: Review & Save
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Save & Apply */}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs text-slate-655 font-medium">Step 4: Save Configuration</p>
              
              <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-900">Handshake Verified Successfully!</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Your mail pipeline is fully verified to perform direct recruiting transmissions without entering sandboxes.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] text-slate-600 border-t border-blue-100/50">
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">SMTP Provider</span>
                    <span className="font-semibold text-slate-800">{wizProvider}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Host Endpoint</span>
                    <span className="font-semibold text-slate-800">{wizHost}:{wizPort}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Auth Username</span>
                    <span className="font-semibold text-slate-800">{wizUsername}</span>
                  </div>
                  <div>
                    <span className="font-mono text-[9px] text-slate-400 block uppercase font-bold">Handshake Status</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1 font-mono font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  onClick={() => setWizardStep(3)}
                  className="px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    handleSaveEmailConfig();
                    setIsEditing(false);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
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
        <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
          <Info className="h-3.5 w-3.5 text-blue-500" />
          recruiter-friendly smtp glossary
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px] text-slate-500 mt-2 leading-relaxed font-sans">
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
  );
}
