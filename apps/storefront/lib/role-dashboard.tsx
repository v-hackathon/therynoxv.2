'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'MAIN_ADMIN' | 'CEO' | 'MANAGER' | 'ADMIN_STAFF' | 'SELLER' | 'SUPPLIER' | 'CUSTOMER';
type UserSession = { id?: string; name?: string; email?: string; role?: string; sellerStatus?: string };
type DashboardConfig = { role: DashboardRole; title: string; description: string; cards: Array<{ title: string; description: string; href?: string }> };

const dashboardConfigs: Record<DashboardRole, DashboardConfig> = {
  SUPER_ADMIN: { role: 'SUPER_ADMIN', title: 'Super Admin Dashboard', description: 'Platform-wide control, governance and system health.', cards: [{ title: 'Platform overview', description: 'Review marketplace-wide activity and operational status.' }, { title: 'Role & access governance', description: 'Manage privileged access through approved administration workflows.' }, { title: 'Security & configuration', description: 'Review security controls and platform configuration.' }] },
  MAIN_ADMIN: { role: 'MAIN_ADMIN', title: 'Main Admin Dashboard', description: 'Manage day-to-day marketplace operations within assigned permissions.', cards: [{ title: 'Seller applications', description: 'Review seller onboarding queue.', href: '/admin/sellers' }, { title: 'Product moderation', description: 'Review submitted products.', href: '/admin/products' }, { title: 'Marketplace operations', description: 'Monitor catalog and operational workflows.' }] },
  ADMIN: { role: 'ADMIN', title: 'Admin Dashboard', description: 'Manage marketplace operations within your assigned permissions.', cards: [{ title: 'Seller applications', description: 'Review seller onboarding queue.', href: '/admin/sellers' }, { title: 'Product moderation', description: 'Review submitted products.', href: '/admin/products' }, { title: 'Catalog operations', description: 'Review categories and product quality.' }] },
  CEO: { role: 'CEO', title: 'CEO Dashboard', description: 'Business overview and high-level performance reporting.', cards: [{ title: 'Business performance', description: 'Track key marketplace performance indicators.' }, { title: 'Revenue overview', description: 'Review approved financial summaries when available.' }, { title: 'Growth & operations', description: 'Monitor seller, customer and catalog growth.' }] },
  MANAGER: { role: 'MANAGER', title: 'Manager Dashboard', description: 'Coordinate assigned team and operational work.', cards: [{ title: 'Team workload', description: 'Review assigned team tasks and queues.' }, { title: 'Operational queue', description: 'Monitor work assigned to your department.' }, { title: 'Team performance', description: 'Review operational progress and blockers.' }] },
  ADMIN_STAFF: { role: 'ADMIN_STAFF', title: 'Admin Staff Dashboard', description: 'Complete assigned operations with limited access.', cards: [{ title: 'My assigned tasks', description: 'Work on tasks assigned to your account.' }, { title: 'Review queue', description: 'Access only the queues permitted for your role.' }, { title: 'Activity history', description: 'Review your recent operational activity.' }] },
  SELLER: { role: 'SELLER', title: 'Seller Dashboard', description: 'Manage your catalog, inventory and marketplace activity.', cards: [{ title: 'My products', description: 'Create and manage your product listings.', href: '/seller/products' }, { title: 'Product catalog', description: 'Browse approved catalog items.', href: '/seller/catalog' }, { title: 'Seller profile', description: 'Review your seller onboarding information.', href: '/seller/apply' }] },
  SUPPLIER: { role: 'SUPPLIER', title: 'Supplier Dashboard', description: 'Manage supplier catalog and stock workflows.', cards: [{ title: 'Supplier catalog', description: 'Manage items available for sourcing.' }, { title: 'Stock availability', description: 'Review supplier inventory and availability.' }, { title: 'Purchase orders', description: 'Track purchase orders when the workflow is enabled.' }] },
  CUSTOMER: { role: 'CUSTOMER', title: 'Customer Account', description: 'Manage shopping activity and account preferences.', cards: [{ title: 'My account', description: 'View your account information.', href: '/account' }, { title: 'Browse marketplace', description: 'Discover available products.', href: '/' }, { title: 'Seller onboarding', description: 'Apply to become a seller.', href: '/seller/apply' }] },
};

const homeByRole: Record<string, string> = { SUPER_ADMIN: '/super-admin', MAIN_ADMIN: '/main-admin', ADMIN: '/admin', CEO: '/ceo', MANAGER: '/manager', ADMIN_STAFF: '/staff', SELLER: '/seller/products', SUPPLIER: '/supplier', CUSTOMER: '/account' };

export default function RoleDashboard({ role }: { role: DashboardRole }) {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [ready, setReady] = useState(false);
  const config = dashboardConfigs[role];
  useEffect(() => {
    let session: UserSession | null = null;
    try { session = JSON.parse(sessionStorage.getItem('therynox_user') || 'null') as UserSession | null; } catch { session = null; }
    const token = sessionStorage.getItem('therynox_access_token');
    if (!token || !session?.role) { router.replace('/login'); return; }
    if (session.role !== role) { router.replace(homeByRole[session.role] || '/account'); return; }
    if (role === 'SELLER' && session.sellerStatus !== 'APPROVED') { router.replace('/seller/apply'); return; }
    setUser(session); setReady(true);
  }, [role, router]);
  if (!ready) return <main className="role-dashboard-loading" aria-live="polite">Checking your secure workspace…</main>;
  return <main className="role-dashboard-page">
    <header className="role-dashboard-topbar"><Link href="/" className="role-dashboard-brand"><span>T</span> THERYNOX</Link><div className="role-dashboard-user"><span className="role-dashboard-avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</span><span><strong>{user?.name || 'User'}</strong><small>{config.role.replaceAll('_', ' ')}</small></span><button onClick={() => { sessionStorage.removeItem('therynox_access_token'); sessionStorage.removeItem('therynox_user'); router.replace('/login'); }}>Sign out</button></div></header>
    <div className="role-dashboard-layout"><aside className="role-dashboard-sidebar"><div className="role-sidebar-eyebrow">WORKSPACE</div><div className="role-sidebar-current">{config.role.replaceAll('_', ' ')}</div><Link href="/">Storefront</Link>{config.role === 'ADMIN' || config.role === 'MAIN_ADMIN' || config.role === 'SUPER_ADMIN' ? <><Link href="/admin/sellers">Seller applications</Link><Link href="/admin/products">Product moderation</Link></> : null}{config.role === 'SELLER' ? <><Link href="/seller/products">My products</Link><Link href="/seller/catalog">Catalog</Link></> : null}{config.role === 'CUSTOMER' ? <Link href="/account">My account</Link> : null}</aside>
    <section className="role-dashboard-main"><div className="role-dashboard-kicker">THERYNOX COMMERCE OS</div><h1>{config.title}</h1><p className="role-dashboard-description">Welcome{user?.name ? `, ${user.name}` : ''}. {config.description}</p><div className="role-dashboard-status"><span className="role-status-dot"/> Signed in securely <span className="role-status-divider">·</span> {config.role.replaceAll('_', ' ')}</div><div className="role-dashboard-grid">{config.cards.map((card) => <article className="role-dashboard-card" key={card.title}><div className="role-card-icon">{card.title.slice(0, 1)}</div><h2>{card.title}</h2><p>{card.description}</p>{card.href ? <Link href={card.href}>Open workspace <span>→</span></Link> : <span className="role-card-planned">Workspace module</span>}</article>)}</div><p className="role-dashboard-note">Access is limited by your account role. Sensitive actions must also be authorized by the API.</p></section></div>
  </main>;
}
