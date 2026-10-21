'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

const passwordRules = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter (A–Z)', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter (a–z)', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number (0–9)', test: (value: string) => /[0-9]/.test(value) },
  { label: 'One special character (!@#$…)', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const ruleResults = useMemo(() => passwordRules.map(rule => rule.test(password)), [password]);
  const strength = ruleResults.filter(Boolean).length;
  const passwordStrong = strength === passwordRules.length && new TextEncoder().encode(password).length <= 72;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!passwordStrong) {
      setError('Please meet all password requirements. Password must be no more than 72 bytes.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Could not create account.');
      setNotice('Account created. Signing you in…');
      const loginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const login = await loginResponse.json().catch(() => ({}));
      if (!loginResponse.ok || !login.accessToken || !login.user) {
        router.push('/login');
        return;
      }
      sessionStorage.setItem('therynox_access_token', login.accessToken);
      sessionStorage.setItem('therynox_user', JSON.stringify(login.user));
      router.push('/account');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to the Therynox API.');
    } finally {
      setLoading(false);
    }
  }

  const strengthLabel = strength <= 2 ? 'Weak' : strength <= 4 ? 'Almost there' : passwordStrong ? 'Strong' : 'Too long';
  const strengthColor = passwordStrong ? '#65d98a' : strength <= 2 ? '#ff746b' : '#ffb45f';

  return <main className="auth-page auth-page-light">
    <header className="auth-topbar"><Link href="/" className="auth-brand" aria-label="Therynox home"><span className="auth-brand-mark">T</span><span>THERYNOX<span className="auth-brand-dot">.</span></span></Link><Link href="/" className="auth-back">← Back to store</Link></header>
    <section className="auth-layout auth-layout-light">
      <div className="auth-story auth-story-light">
        <div className="auth-trust-pill"><span /> JOIN INDIA’S MULTI-VENDOR MARKETPLACE</div>
        <div className="landing-eyebrow"><span className="eyebrow-line"/> YOUR NEXT CHAPTER STARTS HERE</div>
        <h1>Find your<br/>kind of <span>good.</span></h1>
        <p>Create an account to discover products and become part of the Therynox marketplace.</p>
        <div className="auth-story-note"><span>✳</span> Join a marketplace built to bring people together.</div>
      </div>
      <div className="auth-card auth-card-light">
        <div className="auth-card-top"><span className="auth-card-kicker">JOIN THE MARKETPLACE</span><span className="auth-step">01 / CREATE</span></div>
        <h2>Create account</h2>
        <p className="auth-subtitle">A few details and you’re ready to get started.</p>
        <form onSubmit={submit} className="auth-form auth-form-light">
          <label htmlFor="name">Full name<input id="name" autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
          <label htmlFor="email">Email address<input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label htmlFor="password">Password
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" aria-describedby="password-help" />
          </label>
          <div className="password-strength" id="password-help" aria-live="polite">
            <div className="password-strength-top"><span>Password strength</span><strong style={{ color: password ? strengthColor : '#77716b' }}>{password ? strengthLabel : 'Not entered'}</strong></div>
            <div className="password-strength-track"><span style={{ width: `${password ? (strength / passwordRules.length) * 100 : 0}%`, background: strengthColor }} /></div>
            <ul className="password-rules">
              {passwordRules.map((rule, index) => <li key={rule.label} className={ruleResults[index] ? 'rule-pass' : ''}><span>{ruleResults[index] ? '✓' : '○'}</span>{rule.label}</li>)}
            </ul>
            {password && new TextEncoder().encode(password).length > 72 && <p className="password-hint password-hint-error">Password is too long. Use at most 72 UTF-8 bytes.</p>}
          </div>
          <label htmlFor="confirmPassword">Confirm password<input id="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Enter password again" /></label>
          {confirmPassword && <p className={`password-hint ${passwordsMatch ? 'rule-pass' : 'password-hint-error'}`}>{passwordsMatch ? '✓ Passwords match' : 'Passwords do not match'}</p>}
          <label className="password-show-toggle"><input type="checkbox" checked={showPassword} onChange={e => setShowPassword(e.target.checked)} /> Show passwords</label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-success" role="status">{notice}</div>}
          <button type="submit" disabled={loading || !passwordStrong || !passwordsMatch}>{loading ? 'Creating account…' : 'Create your account'} <span>↗</span></button>
        </form>
        <div className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></div>
        <p className="auth-security">Passwords are stored as secure bcrypt hashes, never as plain text. New accounts start with customer access.</p>
      </div>
    </section>
    <footer className="auth-footer auth-footer-light"><span>© THERYNOX COMMERCE OS</span><span>BUILT FOR WHAT'S NEXT.</span></footer>
  </main>;
}
