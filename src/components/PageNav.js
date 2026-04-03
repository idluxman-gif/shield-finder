import Link from 'next/link';

export default function PageNav() {
  return (
    <nav style={{
      background: '#0369A1',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 12px rgba(3,105,161,0.18)',
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          🛡️ Shield<span style={{ color: '#67E8F9' }}>Finder</span>
        </span>
      </Link>
      <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
        <Link href="/" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Directory</Link>
        <Link href="/blog" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Blog</Link>
        <Link href="/about" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>About</Link>
        <Link href="/contact" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Contact</Link>
      </div>
    </nav>
  );
}
