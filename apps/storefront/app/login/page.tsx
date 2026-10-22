'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '../../components/auth/google-sign-in';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
type AuthUser = { id: string; therynoxId?: string; name: string; email: string; role: string; sellerStatus?: string };
type AuthResponse = { message?: string | string[]; accessToken?: string; user?: AuthUser };
type RememberedAccount = { id: string; name: string; email: string; therynoxId?: string };
const REMEMBERED_ACCOUNTS_KEY = 'therynox_remembered_accounts';

function messageFromPayload(payload: AuthResponse, fallback: string) {
  return Array.isArray(payload.message) ? payload.message.join('. ') : payload.message || fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accountChooserOpen, setAccountChooserOpen] = useState(false);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);

  function rememberAccount(user: AuthUser) {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS_KEY) || '[]') as RememberedAccount[];
      const next = [{ id: user.id, name: user.name, email: user.email, therynoxId: user.therynoxId }, ...saved.filter(item => item.id !== user.id)].slice(0, 5);
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
      setRememberedAccounts(next);
    } catch { /* Storage can be disabled; sign-in must still work. */ }
  }

  function openTherynoxChooser() {
    try { setRememberedAccounts(JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS_KEY) || '[]') as RememberedAccount[]); }
    catch { setRememberedAccounts([]); }
    setAccountChooserOpen(true);
  }

  function chooseTherynoxAccount(account: RememberedAccount) {
    const activeToken = sessionStorage.getItem('therynox_access_token');
    const activeUser = sessionStorage.getItem('therynox_user');
    if (activeToken && activeUser) {
      try {
        const parsed = JSON.parse(activeUser) as AuthUser;
        if (parsed.id === account.id) { setAccountChooserOpen(false); finishSignIn(parsed); return; }
      } catch { /* Continue with identifier-based sign-in. */ }
    }
    // A remembered account is only an identifier, not proof of authentication.
    // Prefill the registered email and focus the password field so selection has a visible next step.
    setEmail(account.email);
    setMode('password');
    setPassword('');
    setOtp('');
    setOtpSent(false);
    setError('');
    setNotice(`Selected ${account.name || 'your Therynox account'}. Enter your password or choose Email OTP to continue securely.`);
    setAccountChooserOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById('password')?.focus();
      document.getElementById('password')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function finishSignIn(user: AuthUser) {
    rememberAccount(user);
    const dashboardByRole: Record<string, string> = {
      SUPER_ADMIN: '/super-admin', MAIN_ADMIN: '/main-admin', ADMIN: '/admin', CEO: '/ceo',
      MANAGER: '/manager', ADMIN_STAFF: '/staff', SUPPLIER: '/supplier',
    };
    if (user.role === 'SELLER' && user.sellerStatus !== 'APPROVED') router.replace('/seller/apply');
    else router.replace(dashboardByRole[user.role] || (user.role === 'SELLER' ? '/seller/products' : '/account'));
  }

  function handleGoogleAuthenticated(payload: AuthResponse) {
    if (payload.user) finishSignIn(payload.user);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    setNotice('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier: email.trim(), password }),
        signal: controller.signal,
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as AuthResponse;
      if (!response.ok || !payload.accessToken || !payload.user) {
        if (response.status === 401) throw new Error('Email/Therynox ID or password is incorrect. Check your details and try again.');
        if (response.status === 429) throw new Error('Too many attempts. Please wait a moment before trying again.');
        throw new Error(messageFromPayload(payload, `Sign-in failed (${response.status}). Please try again.`));
      }
      // Keep the short-lived access token in tab-scoped storage; never persist it in localStorage.
      sessionStorage.setItem('therynox_access_token', payload.accessToken);
      sessionStorage.setItem('therynox_user', JSON.stringify(payload.user));
      finishSignIn(payload.user);
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

  async function requestOtp() {
    if (loading || !email.trim()) return;
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/auth/otp/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier: email.trim() }), cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as AuthResponse;
      if (!response.ok) throw new Error(messageFromPayload(payload, 'Could not request a sign-in code. Please try again.'));
      setOtpSent(true); setNotice('If this Therynox account exists, a sign-in code has been sent to its registered email address.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not request a sign-in code.'); }
    finally { setLoading(false); }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !/^[0-9]{6}$/.test(otp)) return;
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/auth/otp/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identifier: email.trim(), code: otp }), cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({})) as AuthResponse;
      if (!response.ok || !payload.accessToken || !payload.user) throw new Error(messageFromPayload(payload, 'The code is invalid or expired. Request a new code.'));
      sessionStorage.setItem('therynox_access_token', payload.accessToken);
      sessionStorage.setItem('therynox_user', JSON.stringify(payload.user));
      finishSignIn(payload.user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify the code.'); }
    finally { setLoading(false); }
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
          <p className="auth-subtitle">Choose your preferred secure sign-in method.</p>
          <button type="button" className="therynox-one-tap" onClick={openTherynoxChooser}><span className="therynox-one-tap-mark">T</span><span>Continue with Therynox</span><span className="therynox-one-tap-arrow">↗</span></button>
          <GoogleSignInButton onAuthenticated={handleGoogleAuthenticated} />
          <div className="auth-divider"><span /> <small>OR USE EMAIL / THERYNOX ID</small> <span /></div>
          <div role="group" aria-label="Sign-in method" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,margin:'18px 0'}}>
            <button type="button" onClick={() => {setMode('password');setError('');setNotice('');}} aria-pressed={mode==='password'} className="auth-submit" style={{opacity:mode==='password'?1:.65}}>Password</button>
            <button type="button" onClick={() => {setMode('otp');setError('');setNotice('');}} aria-pressed={mode==='otp'} className="auth-submit" style={{opacity:mode==='otp'?1:.65}}>Email OTP</button>
          </div>
          {mode === 'password' ? <form onSubmit={submit} className="auth-form auth-form-light" noValidate>
            <label htmlFor="email">Email or Therynox ID
              <input id="email" name="identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com or THY-ABCD2345" />
            </label>
            <label htmlFor="password">Password
              <span className="auth-password-wrap"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={72} value={password} onChange={e => setPassword(e.target.value)} onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} placeholder="Enter your password" /><button type="button" className="auth-show-password" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></span>
            </label>
            {capsLock && <p className="auth-inline-hint" role="status">Caps Lock is on.</p>}
            {notice && <div className="auth-success" role="status">{notice}</div>}
            {error && <div className="auth-error auth-error-light" role="alert">{error}</div>}
            <button type="submit" className="auth-submit" disabled={loading || !email.trim() || !password}>{loading ? <><span className="auth-spinner" /> Signing you in…</> : <>Sign in securely <span>↗</span></>}</button>
          </form> : <form onSubmit={verifyOtp} className="auth-form auth-form-light" noValidate>
            <label htmlFor="otp-email">Email or Therynox ID<input id="otp-email" type="text" autoComplete="username" autoCapitalize="none" required minLength={3} maxLength={254} value={email} onChange={e => {setEmail(e.target.value);setOtpSent(false);setOtp('');}} placeholder="you@example.com or THY-ABCD2345" /></label>
            {otpSent && <label htmlFor="otp-code">Six-digit sign-in code<input id="otp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" /></label>}
            {error && <div className="auth-error auth-error-light" role="alert">{error}</div>}
            {notice && <div className="auth-success" role="status">{notice}</div>}
            {!otpSent ? <button type="button" className="auth-submit" onClick={requestOtp} disabled={loading || email.trim().length < 3}>{loading ? 'Sending code…' : 'Send sign-in code'} <span>↗</span></button> : <><button type="submit" className="auth-submit" disabled={loading || !/^[0-9]{6}$/.test(otp)}>{loading ? 'Verifying…' : 'Verify code and sign in'} <span>↗</span></button><button type="button" className="auth-create-account" onClick={requestOtp} disabled={loading}>Resend code</button></>}
          </form>}
          <div className="auth-divider"><span /> <small>NEW TO THERYNOX?</small> <span /></div>
          <Link href="/register" className="auth-create-account">Create a marketplace account <span>→</span></Link>
          <p className="auth-security auth-security-light"><span>♧</span> Your access token stays in this browser tab. Never share passwords or access tokens.</p>
        </div>
      </section>
      {accountChooserOpen && <div className="therynox-chooser-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAccountChooserOpen(false); }}>
        <section className="therynox-chooser" role="dialog" aria-modal="true" aria-labelledby="therynox-chooser-title">
          <div className="therynox-chooser-brand"><span className="auth-brand-mark">T</span><span>THERYNOX<span className="auth-brand-dot">.</span></span><button type="button" onClick={() => setAccountChooserOpen(false)} aria-label="Close account chooser">×</button></div>
          <h2 id="therynox-chooser-title">Choose a Therynox account</h2>
          <p>Continue with an account you have used on this browser.</p>
          {rememberedAccounts.length ? <div className="therynox-chooser-list">{rememberedAccounts.map(account => <button type="button" key={account.id} className="therynox-chooser-account" onClick={() => chooseTherynoxAccount(account)}><span className="therynox-account-avatar">{(account.name || account.email || 'T').slice(0,1).toUpperCase()}</span><span><strong>{account.name || 'Therynox account'}</strong><small>{account.email}</small>{account.therynoxId && <small>{account.therynoxId}</small>}</span><span className="therynox-chooser-chevron">›</span></button>)}</div> : <div className="therynox-chooser-empty"><span className="therynox-account-avatar">T</span><strong>No saved Therynox accounts yet</strong><small>Sign in once with your email or Therynox ID, and this browser can remember the account for next time.</small></div>}
          <button type="button" className="therynox-chooser-another" onClick={() => { setAccountChooserOpen(false); document.getElementById('email')?.focus(); }}>Use another account <span>→</span></button>
          <small className="therynox-chooser-note">For your security, saved accounts remember only your account details—not your password or OTP.</small>
        </section>
      </div>}
      <footer className="auth-footer auth-footer-light"><span>© {new Date().getFullYear()} THERYNOX COMMERCE OS</span><span>MADE FOR INDIA <b>·</b> BUILT FOR WHAT'S NEXT</span><Link href="/register">Create account</Link></footer>
    </main>
  );
}
