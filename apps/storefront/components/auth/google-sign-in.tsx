'use client';

import { useEffect, useRef, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

type AuthUser = { id: string; therynoxId?: string; name: string; email: string; role: string; sellerStatus?: string };
type AuthResponse = { message?: string | string[]; accessToken?: string; user?: AuthUser };
type GoogleCredentialResponse = { credential: string };
type GoogleAccounts = {
  id: {
    initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
    renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
  };
};
declare global { interface Window { google?: { accounts: GoogleAccounts } } }

function getMessage(payload: AuthResponse, fallback: string) {
  return Array.isArray(payload.message) ? payload.message.join('. ') : payload.message || fallback;
}

export function GoogleSignInButton({ onAuthenticated }: { onAuthenticated: (payload: AuthResponse) => void }) {
  const buttonHost = useRef<HTMLDivElement>(null);
  const onAuthenticatedRef = useRef(onAuthenticated);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => { onAuthenticatedRef.current = onAuthenticated; }, [onAuthenticated]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.querySelector<HTMLScriptElement>('script[data-therynox-google="true"]');
    if (window.google?.accounts) { setScriptReady(true); return; }
    const script = existing || document.createElement('script');
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.therynoxGoogle = 'true';
      document.head.appendChild(script);
    }
    const onLoad = () => setScriptReady(true);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.google?.accounts || !buttonHost.current || !GOOGLE_CLIENT_ID) return;
    buttonHost.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setLoading(true); setError('');
        try {
          const response = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ credential }), cache: 'no-store',
          });
          const payload = await response.json().catch(() => ({})) as AuthResponse;
          if (!response.ok || !payload.accessToken || !payload.user) throw new Error(getMessage(payload, 'Google sign-in failed. Please try again.'));
          sessionStorage.setItem('therynox_access_token', payload.accessToken);
          sessionStorage.setItem('therynox_user', JSON.stringify(payload.user));
          onAuthenticatedRef.current(payload);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Google sign-in failed. Please try again.');
        } finally { setLoading(false); }
      },
    });
    window.google.accounts.id.renderButton(buttonHost.current, { type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: Math.max(240, Math.min(360, buttonHost.current.clientWidth || 320)), logo_alignment: 'left' });
  }, [scriptReady]);

  if (!GOOGLE_CLIENT_ID) {
    return <div className="google-auth-wrap">
      <button type="button" className="google-auth-fallback" onClick={() => setError('Google sign-in needs a Google OAuth Web client ID. Follow AUTHENTICATION_SETUP.md to configure it.')}>
        <span className="google-auth-g">G</span> Continue with Google
      </button>
      {error && <p className="auth-error auth-error-light" role="alert">{error}</p>}
    </div>;
  }

  return <div className="google-auth-wrap">
    <div ref={buttonHost} className="google-auth-provider-button" aria-label="Continue with Google" />
    {loading && <p className="auth-inline-hint" role="status">Verifying your Google account…</p>}
    {error && <p className="auth-error auth-error-light" role="alert">{error}</p>}
    {!scriptReady && <p className="auth-inline-hint" role="status">Loading Google sign-in…</p>}
  </div>;
}
