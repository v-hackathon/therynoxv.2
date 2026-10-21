'use client';

import { useCallback, useEffect, useState } from 'react';

type SellerApplication = {
  id: string;
  name: string;
  email: string;
  sellerStatus: string;
  createdAt?: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export default function AdminSellersPage() {
  const [token, setToken] = useState('');
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = window.sessionStorage.getItem('therynox_admin_token');
    if (saved) setToken(saved);
  }, []);

  const loadApplications = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/admin/sellers/pending`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || (response.status === 403 ? 'આ account પાસે Admin permission નથી.' : 'Applications લોડ થઈ શક્યાં નથી.'));
      }
      const list = Array.isArray(payload) ? payload : (Array.isArray(payload.applications) ? payload.applications : Array.isArray(payload.users) ? payload.users : []);
      setApplications(list);
      window.sessionStorage.setItem('therynox_admin_token', accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API સાથે connection થઈ શક્યું નથી.');
    } finally {
      setLoading(false);
    }
  }, []);

  const review = async (userId: string, action: 'approve' | 'reject') => {
    if (!token.trim()) { setError('પહેલાં Admin JWT token દાખલ કરો.'); return; }
    setWorkingId(userId);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`${API_BASE}/admin/sellers/${encodeURIComponent(userId)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Application update થઈ શક્યું નથી.');
      setNotice(action === 'approve' ? 'Seller application approve થઈ ગઈ.' : 'Seller application reject થઈ ગઈ.');
      await loadApplications(token.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request નિષ્ફળ ગઈ.');
    } finally {
      setWorkingId('');
    }
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">T<span>•</span></a>
        <div className="sidebar-caption">WORKSPACE</div>
        <a className="sidebar-link" href="/">◫ <span>Overview</span></a>
        <a className="sidebar-link active" href="/admin/sellers">♙ <span>Seller applications</span></a>
        <div className="sidebar-bottom">THERYNOX COMMERCE OS<br /><span>Admin workspace</span></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div><div className="admin-breadcrumb">Workspace / Sellers</div><div className="admin-top-title">Seller management</div></div>
          <div className="admin-avatar">A</div>
        </header>

        <div className="admin-content">
          <div className="admin-heading-row">
            <div><div className="admin-eyebrow">MARKETPLACE OPERATIONS</div><h1>Seller applications</h1><p>Review new sellers before they can start selling on Therynox.</p></div>
            <button className="refresh-button" onClick={() => loadApplications(token.trim())} disabled={loading || !token.trim()}>{loading ? 'Loading…' : '↻ Refresh list'}</button>
          </div>

          <div className="admin-stats">
            <article className="stat-card"><span>Pending review</span><strong>{applications.length.toString().padStart(2, '0')}</strong><small>Applications awaiting a decision</small></article>
            <article className="stat-card"><span>Review workflow</span><strong>01 <i>/ 02</i></strong><small>Verify details, then approve or reject</small></article>
            <article className="stat-card accent-stat"><span>Access control</span><strong>Admin only</strong><small>Protected by JWT and role guard</small></article>
          </div>

          <section className="token-panel">
            <div className="panel-heading"><div><h2>Secure API connection</h2><p>Paste the access token from an Admin login. It is kept only in this browser session.</p></div><span className="secure-pill">● SECURE SESSION</span></div>
            <div className="token-row"><input aria-label="Admin JWT token" type="password" autoComplete="off" placeholder="Paste Admin JWT access token" value={token} onChange={e => setToken(e.target.value)} /><button onClick={() => loadApplications(token.trim())} disabled={loading || !token.trim()}>{loading ? 'Connecting…' : 'Connect & load'}</button></div>
          </section>

          {error && <div className="feedback error-feedback" role="alert">⚠ {error}</div>}
          {notice && <div className="feedback success-feedback" role="status">✓ {notice}</div>}

          <section className="applications-panel">
            <div className="panel-heading list-heading"><div><h2>Waiting for review</h2><p>Seller accounts currently marked as pending.</p></div><span className="count-pill">{applications.length} pending</span></div>
            {!token.trim() ? <div className="empty-state"><div className="empty-icon">⌁</div><h3>Connect your admin account</h3><p>Enter your Admin JWT above to load applications securely from your API.</p></div> : loading ? <div className="empty-state"><div className="loader-dot"/><h3>Loading applications</h3><p>Fetching pending sellers from the API…</p></div> : applications.length === 0 ? <div className="empty-state"><div className="empty-icon">✓</div><h3>All caught up</h3><p>No pending seller applications were returned by the API.</p></div> : <div className="seller-table-wrap"><table className="seller-table"><thead><tr><th>SELLER</th><th>STATUS</th><th>APPLIED</th><th className="action-column">DECISION</th></tr></thead><tbody>{applications.map(seller => <tr key={seller.id}><td><div className="seller-identity"><div className="seller-avatar">{seller.name?.trim()?.charAt(0)?.toUpperCase() || 'S'}</div><div><strong>{seller.name}</strong><span>{seller.email}</span><small>ID: {seller.id}</small></div></div></td><td><span className="pending-pill"><span/> Pending</span></td><td>{seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : '—'}</td><td><div className="decision-actions"><button className="reject-button" disabled={!!workingId} onClick={() => review(seller.id, 'reject')}>{workingId === seller.id ? 'Working…' : 'Reject'}</button><button className="approve-button" disabled={!!workingId} onClick={() => review(seller.id, 'approve')}>{workingId === seller.id ? 'Working…' : 'Approve'}</button></div></td></tr>)}</tbody></table></div>}
          </section>
          <footer className="admin-footer">Therynox Commerce OS <span>•</span> Seller review console <span className="footer-right">API: {API_BASE}</span></footer>
        </div>
      </section>
    </main>
  );
}
