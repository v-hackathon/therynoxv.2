'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
type AuthUser = { id: string; name: string; email: string; role: string; sellerStatus?: string };
type AuthResponse = { message?: string | string[]; accessToken?: string; user?: AuthUser };

function messageFromPayload(payload: AuthResponse, fallback: string) {
  return Array.isArray(payload.message) ? payload.message.join('. ') : payload.message || fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        signal: controller.signal,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as AuthResponse;
      if (!response.ok || !payload.accessToken || !payload.user) {
        if (response.status === 401) throw new Error('Email or password is incorrect. Check your details and try again.');
        if (response.status === 429) throw new Error('Too many attempts. Please wait a moment before trying again.');
        throw new Error(messageFromPayload(payload, `Sign-in failed (${response.status}). Please try again.`));
      }
      // Keep the short-lived access token in tab-scoped storage; never persist it in localStorage.
      sessionStorage.setItem('therynox_access_token', payload.accessToken);
      sessionStorage.setItem('therynox_user', JSON.stringify(payload.user));
      const dashboardByRole: Record<string, string> = {
        SUPER_ADMIN: '/super-admin',
        MAIN_ADMIN: '/main-admin',
        ADMIN: '/admin',
        CEO: '/ceo',
        MANAGER: '/manager',
        ADMIN_STAFF: '/staff',
        SUPPLIER: '/supplier',
      };
      if (payload.user.role === 'SELLER' && payload.user.sellerStatus !== 'APPROVED') {
        router.replace('/seller/apply');
      } else {
        router.replace(dashboardByRole[payload.user.role] || (payload.user.role === 'SELLER' ? '/seller/products' : '/account'));
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        setError('The sign-in request timed out. Check that the API is running, then try again.');
      } else if (cause instanceof TypeError) {
        setError('Could not connect to the Therynox API. Check that the backend is running and the API URL is correct.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.');
      }
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-page-light">
      <header className="auth-topbar">
        <Link href="/" className="auth-brand" aria-label="Therynox home"><span className="auth-brand-mark">T</span><span>THERYNOX<span className="auth-brand-dot">.</span></span></Link>
        <Link href="/" className="auth-back">← Back to store</Link>
      </header>
      <section className="auth-layout auth-layout-light">
        <div className="auth-story auth-story-light">
          <div className="auth-trust-pill"><span /> INDIA'S MULTI-VENDOR MARKETPLACE</div>
          <h1>Your world.<br />Your finds.<br /><span>Your Therynox.</span></h1>
          <p>Sign in to track orders, save your favourites and manage your marketplace journey — all from one place.</p>
          <div className="auth-benefits">
            <div><span className="auth-benefit-icon">✓</span><span><strong>One secure account</strong><small>Access your marketplace workspace</small></span></div>
            <div><span className="auth-benefit-icon">↗</span><span><strong>Built for every role</strong><small>Customer, seller and admin access</small></span></div>
          </div>
          <div className="auth-story-foot"><span className="auth-mini-mark">T</span><span>Commerce, thoughtfully connected.</span></div>
        </div>
        <div className="auth-card auth-card-light">
          <div className="auth-card-top"><span className="auth-card-kicker">WELCOME BACK</span><span className="auth-step">SECURE SIGN IN</span></div>
          <h2>Sign in to your account</h2>
          <p className="auth-subtitle">Enter your registered email and password to continue.</p>
          <form onSubmit={submit} className="auth-form auth-form-light" noValidate>
            <label htmlFor="email">Email address
              <input id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" aria-describedby="email-help" />
            </label>
            <label htmlFor="password">Password
              <span className="auth-password-wrap"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} placeholder="Enter your password" /><button type="button" className="auth-show-password" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            {capsLock && <p className="auth-inline-hint" role="status">Caps Lock is on.</p>}
            {error && <div className="auth-error auth-error-light" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading || !email.trim() || !password}>{loading ? <><span className="auth-spinner" /> Signing you in…</> : <>Sign in securely <span>↗</span></>}</button>
          </form>
          <div className="auth-divider"><span /> <small>NEW TO THERYNOX?</small> <span /></div>
          <Link href="/register" className="auth-create-account">Create a marketplace account <span>→</span></Link>
          <p className="auth-security auth-security-light"><span>♧</span> Your access token stays in this browser tab. Never share passwords or access tokens.</p>
        </div>
      </section>
      <footer className="auth-footer auth-footer-light"><span>© {new Date().getFullYear()} THERYNOX COMMERCE OS</span><span>MADE FOR INDIA <b>·</b> BUILT FOR WHAT'S NEXT</span><Link href="/register">Create account</Link></footer>
    </main>
  );
}
