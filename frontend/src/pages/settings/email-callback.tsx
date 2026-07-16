/**
 * /settings/email-callback
 * OAuth popup receiver page.
 * 
 * After the user logs in with Google/Microsoft, they are redirected here.
 * This page reads the code + state from the URL, posts them to the opener
 * via window.postMessage, then closes itself.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function EmailCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    // Wait for Next.js router to be ready (query params available)
    if (!router.isReady) return;

    const { code, state, error, error_description, provider, mock } = router.query;

    // Determine provider from state or URL query
    const detectedProvider =
      (provider as string) ||
      (typeof state === 'string' && state.includes('gmail') ? 'gmail' : undefined) ||
      'gmail';

    if (error) {
      const errMsg = (error_description as string) || (error as string) || 'OAuth login failed';
      setStatus('error');
      setMessage(errMsg);

      if (window.opener) {
        window.opener.postMessage(
          { type: 'oauth-callback', provider: detectedProvider, error: errMsg },
          window.location.origin
        );
        setTimeout(() => window.close(), 1500);
      }
      return;
    }

    if (!code) {
      const errMsg = 'No authorization code received from provider.';
      setStatus('error');
      setMessage(errMsg);
      if (window.opener) {
        window.opener.postMessage(
          { type: 'oauth-callback', provider: detectedProvider, error: errMsg },
          window.location.origin
        );
        setTimeout(() => window.close(), 1500);
      }
      return;
    }

    // Success — post code + state back to opener
    setStatus('success');
    setMessage('Authentication successful! Closing window...');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'oauth-callback',
          provider: detectedProvider,
          code: code as string,
          state: state as string,
          mock: mock as string | undefined,
        },
        window.location.origin
      );
      setTimeout(() => window.close(), 1000);
    } else {
      // Fallback: not opened as popup — redirect back to settings
      setMessage('Authentication complete. Redirecting to settings...');
      setTimeout(() => router.replace('/settings'), 2000);
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto" />
            <p className="text-slate-300 text-sm font-medium">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-400 text-sm font-semibold">Connected Successfully</p>
            <p className="text-slate-400 text-xs">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400 text-sm font-semibold">Authentication Failed</p>
            <p className="text-slate-400 text-xs">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
