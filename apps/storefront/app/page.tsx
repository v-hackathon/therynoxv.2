import Link from 'next/link';

const features = [
  { number: '01', title: 'Discover products', text: 'Explore products from independent sellers in one marketplace.' },
  { number: '02', title: 'Your own storefront', text: 'Sellers can manage products, prices and available stock.' },
  { number: '03', title: 'Secure by design', text: 'Accounts and protected workspaces use the Therynox API.' },
];

export default function HomePage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="landing-logo"><span className="logo-mark">T</span><span>THERYNOX<span className="logo-dot">.</span></span></Link>
        <div className="landing-nav-links"><a href="#features">Why Therynox</a><Link href="/login">Sign in</Link><Link className="nav-cta" href="/register">Create account <span>↗</span></Link></div>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="landing-eyebrow"><span className="eyebrow-line"/> THE NEXT CHAPTER OF COMMERCE</div>
          <h1>Good things<br/>belong <span>together.</span></h1>
          <p className="hero-description">A marketplace built to bring great products, ambitious sellers and curious customers together.</p>
          <div className="hero-actions"><Link className="primary-cta" href="/register">Get started <span>↗</span></Link><Link className="secondary-cta" href="/login">I already have an account <span>→</span></Link></div>
          <div className="hero-proof"><span className="proof-dot"/><span>Your next favourite find starts here.</span></div>
        </div>
        <div className="hero-art" aria-label="Abstract Therynox marketplace artwork">
          <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-glow"/>
          <div className="art-card art-card-back"><span>CURATED FINDS</span><strong>Made to<br/>stand out.</strong><div className="art-lines"><i/><i/><i/></div></div>
          <div className="art-product"><div className="product-shape"><div className="shape-handle"/><div className="shape-body"/></div><div className="art-product-caption"><span>THE DAILY EDIT</span><strong>Objects with a story.</strong></div></div>
          <div className="art-floating-badge"><span>✳</span><div><strong>One marketplace.</strong><small>Many possibilities.</small></div></div>
          <div className="art-number">T<span>•</span> 001 / MARKETPLACE</div>
        </div>
        <div className="hero-bottom-label"><span>01 — BUILT FOR EVERYONE</span><span>SCROLL TO EXPLORE ↓</span></div>
      </section>
      <section className="landing-features" id="features"><div className="features-heading"><div className="landing-eyebrow">A BETTER WAY TO SHOP & SELL</div><h2>Commerce, without<br/><span>the extra noise.</span></h2></div><div className="feature-grid">{features.map(feature => <article className="feature-card" key={feature.number}><span className="feature-number">{feature.number}</span><h3>{feature.title}</h3><p>{feature.text}</p><span className="feature-arrow">↗</span></article>)}</div></section>
      <footer className="landing-footer"><Link href="/" className="landing-logo"><span className="logo-mark">T</span><span>THERYNOX<span className="logo-dot">.</span></span></Link><span>One marketplace. Many possibilities.</span><div><Link href="/login">Sign in</Link><Link href="/register">Join Therynox</Link></div></footer>
    </main>
  );
}
