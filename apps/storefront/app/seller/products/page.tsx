'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  createdAt: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export default function SellerProductsPage() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [stock, setStock] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = window.sessionStorage.getItem('therynox_seller_token') || window.sessionStorage.getItem('therynox_access_token');
    if (saved) setToken(saved);
  }, []);

  const loadProducts = useCallback(async (accessToken: string) => {
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/seller/products`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Products load થઈ શક્યા નથી. Seller role ચેક કરો.');
      setProducts(Array.isArray(payload.products) ? payload.products : []);
      window.sessionStorage.setItem('therynox_seller_token', accessToken);
      window.sessionStorage.setItem('therynox_access_token', accessToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API સાથે connection થઈ શક્યું નથી.');
    } finally { setLoading(false); }
  }, []);

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token.trim()) { setError('પહેલાં Seller JWT token દાખલ કરો.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/seller/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, description, price: Number(price), stock: Number(stock), ...(imageUrl.trim() ? { imageUrl: imageUrl.trim() } : {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Product create થઈ શક્યો નથી.');
      setNotice('Product સફળતાપૂર્વક ઉમેરાયો.');
      setName(''); setSlug(''); setDescription(''); setPrice('0'); setStock('0'); setImageUrl('');
      await loadProducts(token.trim());
    } catch (e) { setError(e instanceof Error ? e.message : 'Product create request નિષ્ફળ ગઈ.'); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (productId: string) => {
    if (!window.confirm('આ product delete કરવો છે?')) return;
    setError(''); setNotice('');
    try {
      const response = await fetch(`${API_BASE}/seller/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token.trim()}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Product delete થઈ શક્યો નથી.');
      setNotice('Product delete થયો.');
      await loadProducts(token.trim());
    } catch (e) { setError(e instanceof Error ? e.message : 'Delete request નિષ્ફળ ગઈ.'); }
  };

  return (
    <main className="products-shell">
      <header className="products-header">
        <a className="products-brand" href="/">T<span>•</span> THERYNOX</a>
        <a href="/admin/sellers">Admin seller review</a>
      </header>
      <section className="products-content">
        <div className="products-eyebrow">SELLER WORKSPACE</div>
        <div className="products-title-row">
          <div><h1>Product management</h1><p>Create and manage the products in your shop.</p></div>
          <div className="products-count"><strong>{products.length.toString().padStart(2, '0')}</strong><span>Products</span></div>
        </div>

        <section className="products-token-panel">
          <label htmlFor="seller-token">Seller JWT access token</label>
          <div className="products-token-row">
            <input id="seller-token" type="password" autoComplete="off" placeholder="Paste token from an approved Seller login" value={token} onChange={e => setToken(e.target.value)} />
            <button onClick={() => loadProducts(token.trim())} disabled={loading || !token.trim()}>{loading ? 'Loading…' : 'Connect & load'}</button>
          </div>
          <small>Only an approved SELLER account can manage products. Token stays in this browser session.</small>
        </section>

        {error && <div className="products-feedback products-error" role="alert">{error}</div>}
        {notice && <div className="products-feedback products-success" role="status">{notice}</div>}

        <div className="products-grid">
          <section className="products-panel">
            <h2>Add a product</h2>
            <p className="products-muted">Start with the product name, price and available stock.</p>
            <form className="product-form" onSubmit={createProduct}>
              <label>Product name<input required minLength={2} maxLength={120} value={name} onChange={e => { setName(e.target.value); if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')); }} placeholder="e.g. Classic Cotton T-Shirt" /></label>
              <label>Product slug<input required minLength={2} maxLength={160} value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="classic-cotton-t-shirt" /></label>
              <label>Description<textarea required maxLength={5000} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the product…" /></label>
              <div className="product-form-two"><label>Price (₹)<input required type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></label><label>Stock quantity<input required type="number" min="0" step="1" value={stock} onChange={e => setStock(e.target.value)} /></label></div>
              <label>Image URL (optional)<input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" /></label>
              <button className="product-submit" type="submit" disabled={saving}>{saving ? 'Saving…' : '＋ Create product'}</button>
            </form>
          </section>

          <section className="products-panel">
            <div className="products-list-heading"><div><h2>Your products</h2><p className="products-muted">Products belonging to the signed-in seller.</p></div><button className="products-refresh" onClick={() => loadProducts(token.trim())} disabled={loading || !token.trim()}>↻</button></div>
            {!token.trim() ? <div className="products-empty">Connect your seller account to see products.</div> : loading ? <div className="products-empty">Loading products…</div> : products.length === 0 ? <div className="products-empty">No products yet. Add your first product using the form.</div> : <div className="products-list">{products.map(product => <article className="product-row" key={product.id}><div className="product-thumb">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>{product.name.slice(0, 1).toUpperCase()}</span>}</div><div className="product-row-main"><strong>{product.name}</strong><span>/{product.slug}</span><small>Stock: {product.stock} · Added {new Date(product.createdAt).toLocaleDateString()}</small></div><div className="product-row-price"><strong>₹{Number(product.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong><button onClick={() => deleteProduct(product.id)}>Delete</button></div></article>)}</div>}
          </section>
        </div>
      </section>
    </main>
  );
}
