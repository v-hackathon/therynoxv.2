'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const fieldStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', borderRadius: 10, border: '1px solid #333', background: '#111', color: '#fff', marginTop: 7 };
const labelStyle: React.CSSProperties = { display: 'block', color: '#ddd', fontSize: 13, marginBottom: 14 };
export default function SellerApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ businessName: '', legalName: '', businessType: 'INDIVIDUAL', phone: '', website: '', addressLine1: '', city: '', state: 'Gujarat', postalCode: '', gstin: '' });
  function update(key: keyof typeof form, value: string) { setForm(old => ({ ...old, [key]: value })); }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const token = sessionStorage.getItem('therynox_access_token');
    if (!token) { router.push('/login'); return; }
    setLoading(true);
    try {
      const payload = { ...form, phone: form.phone || undefined, website: form.website || undefined, gstin: form.gstin ? form.gstin.toUpperCase() : undefined };
      const response = await fetch(`${API_BASE}/auth/seller/apply`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Application could not be submitted.');
      router.push('/account');
    } catch (err) { setError(err instanceof Error ? err.message : 'Request failed.'); }
    finally { setLoading(false); }
  }
  return <main className="account-page"><header className="account-header"><Link href="/" className="landing-logo"><span className="logo-mark">T</span><span>THERYNOX<span className="logo-dot">.</span></span></Link><Link href="/account" className="account-logout">Back to account ↗</Link></header><section className="account-content" style={{ maxWidth: 760 }}><div className="landing-eyebrow">SELLER ONBOARDING · PHASE 2</div><h1>Build your<br/><span>store.</span></h1><p className="account-muted">Submit your business details for review. Only provide information requested here; do not upload identity documents or payment details on this form.</p><form onSubmit={submit} style={{ marginTop: 28, padding: 24, border: '1px solid #292929', borderRadius: 18, background: '#0b0b0b' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}><label style={labelStyle}>Business / store name *<input required minLength={2} maxLength={120} value={form.businessName} onChange={e=>update('businessName',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>Legal name *<input required minLength={2} maxLength={120} value={form.legalName} onChange={e=>update('legalName',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>Business type *<select value={form.businessType} onChange={e=>update('businessType',e.target.value)} style={fieldStyle}><option value="INDIVIDUAL">Individual</option><option value="SOLE_PROPRIETORSHIP">Sole proprietorship</option><option value="PARTNERSHIP">Partnership</option><option value="PRIVATE_LIMITED">Private limited</option><option value="OTHER">Other</option></select></label><label style={labelStyle}>Phone (optional)<input type="tel" maxLength={25} value={form.phone} onChange={e=>update('phone',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>Website (optional)<input type="url" placeholder="https://example.com" value={form.website} onChange={e=>update('website',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>GSTIN (optional)<input maxLength={15} autoCapitalize="characters" value={form.gstin} onChange={e=>update('gstin',e.target.value.toUpperCase())} style={fieldStyle} /></label><label style={{...labelStyle,gridColumn:'1 / -1'}}>Address line *<input required minLength={5} maxLength={180} value={form.addressLine1} onChange={e=>update('addressLine1',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>City *<input required minLength={2} maxLength={100} value={form.city} onChange={e=>update('city',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>State *<input required minLength={2} maxLength={100} value={form.state} onChange={e=>update('state',e.target.value)} style={fieldStyle} /></label><label style={labelStyle}>Postal code *<input required minLength={5} maxLength={10} value={form.postalCode} onChange={e=>update('postalCode',e.target.value)} style={fieldStyle} /></label></div>{error && <p role="alert" className="auth-error">{error}</p>}<button type="submit" className="account-primary-link" disabled={loading} style={{ cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Submitting application…' : 'Submit seller application ↗'}</button><p className="account-muted" style={{ fontSize: 12, marginTop: 14 }}>Submitting does not grant seller access. An admin must review and approve your application.</p></form></section></main>;
}
