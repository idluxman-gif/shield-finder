"use client";
import { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { MapPin, Search, Shield, Phone, Star } from "lucide-react";
import AdUnit from "@/components/AdUnit";
import { siteConfig } from "@/config/site";
import { shops as D, getStatePath, getCityPath, stateNames, getStateSlug } from "@/data/shops";

const S = D;
const AS = [...new Set(S.map(s => s.s))].sort();
const insCount = S.filter(s => s.ins).length;
const avgRating = (S.reduce((a, s) => a + s.r, 0) / S.length).toFixed(1);

const stateStats = (() => {
  const m = {};
  S.forEach(s => {
    if (!m[s.s]) m[s.s] = { n: 0, name: stateNames[s.s] || s.s };
    m[s.s].n++;
  });
  return Object.entries(m).map(([code, v]) => ({ code, name: v.name, n: v.n })).sort((a, b) => b.n - a.n);
})();

const topCities = (() => {
  const m = {};
  S.forEach(s => {
    const k = s.s + '|' + s.c;
    if (!m[k]) m[k] = { city: s.c, state: s.s, n: 0 };
    m[k].n++;
  });
  return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 12);
})();

const blogPreviews = [
  { slug: 'windshield-replacement-cost', title: 'How Much Does Windshield Replacement Cost?', date: 'Mar 15, 2026' },
  { slug: 'does-car-insurance-cover-windshield-replacement', title: 'Does Car Insurance Cover Windshield Replacement?', date: 'Mar 12, 2026' },
  { slug: 'chip-repair-vs-windshield-replacement', title: 'Chip Repair vs. Windshield Replacement: Which Do You Need?', date: 'Mar 10, 2026' },
];

// ── SVG Windshield Illustration ──────────────────────────────────────────────
const WindshieldSVG = () => (
  <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ maxWidth: '100%' }}>
    {/* Car body silhouette */}
    <ellipse cx="210" cy="260" rx="190" ry="20" fill="rgba(255,255,255,0.06)" />
    <path d="M30 200 L60 140 L90 100 L150 80 L270 80 L330 100 L360 140 L390 200 L390 240 L30 240 Z" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    {/* Windshield frame */}
    <path d="M80 195 L105 125 L130 100 L290 100 L315 125 L340 195 Z" fill="rgba(6,182,212,0.08)" stroke="rgba(6,182,212,0.35)" strokeWidth="2" />
    {/* Glass reflection highlights */}
    <path d="M120 190 L138 140 L155 118 L200 110" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M140 190 L160 145 L178 122 L220 112" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" />
    {/* Repair tool */}
    <circle cx="210" cy="152" r="22" fill="rgba(6,182,212,0.15)" stroke="rgba(6,182,212,0.5)" strokeWidth="2" />
    <circle cx="210" cy="152" r="8" fill="rgba(6,182,212,0.3)" stroke="rgba(6,182,212,0.8)" strokeWidth="1.5" />
    <line x1="210" y1="130" x2="210" y2="124" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round" />
    <line x1="228" y1="152" x2="234" y2="152" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round" />
    <line x1="210" y1="174" x2="210" y2="180" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round" />
    <line x1="192" y1="152" x2="186" y2="152" stroke="rgba(6,182,212,0.7)" strokeWidth="2" strokeLinecap="round" />
    {/* Crack lines */}
    <path d="M200 142 L185 130 L178 125" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round" />
    <path d="M220 144 L235 132 L242 126" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" strokeLinecap="round" />
    {/* Tech person silhouette */}
    <circle cx="150" cy="155" r="14" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <path d="M136 200 Q150 175 164 200" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    {/* Stars */}
    {[{x:310,y:110},{x:325,y:130},{x:305,y:148}].map((p,i) => (
      <text key={i} x={p.x} y={p.y} fontSize="11" fill="rgba(245,158,11,0.7)" textAnchor="middle">★</text>
    ))}
    {/* Shield badge */}
    <path d="M355 90 L355 72 L370 68 L385 72 L385 90 Q370 102 355 90 Z" fill="rgba(3,105,161,0.3)" stroke="rgba(6,182,212,0.5)" strokeWidth="1.5" />
    <text x="370" y="84" fontSize="9" fill="rgba(6,182,212,0.9)" textAnchor="middle" fontWeight="bold">✓</text>
  </svg>
);

export default function HomePage() {
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState(false);
  const stateRef = useRef(null);

  const handleSearch = () => {
    if (!q.trim()) {
      stateRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const ql = q.trim().toLowerCase();
    // Find a matching state
    const stateCode = AS.find(s => stateNames[s]?.toLowerCase().includes(ql) || s.toLowerCase() === ql);
    if (stateCode) {
      window.location.href = getStatePath(stateCode);
      return;
    }
    // Find matching city
    const cityMatch = topCities.find(c => c.city.toLowerCase().includes(ql));
    if (cityMatch) {
      window.location.href = getCityPath(cityMatch.state, cityMatch.city);
      return;
    }
    // Fallback: scroll to state grid
    stateRef.current?.scrollIntoView({ behavior: "smooth" });
    setSearched(true);
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#F0F9FF', minHeight: '100vh' }}>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav style={{ background: "#0369A1", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(3,105,161,0.3)" }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            🛡️ Shield<span style={{ color: "#67E8F9" }}>Finder</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
          <Link href="/blog" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontWeight: 500 }}>Blog</Link>
          <Link href="/about" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontWeight: 500 }}>About</Link>
          <Link href="/contact" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontWeight: 500 }}>Contact</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #082F49 0%, #0C4A6E 45%, #0369A1 100%)",
        position: "relative",
        overflow: "hidden",
        padding: "0 24px",
      }}>
        {/* Subtle dot grid texture */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          pointerEvents: "none",
        }} />
        {/* Glow spot */}
        <div style={{
          position: "absolute", top: "-20%", right: "15%",
          width: 400, height: 400,
          background: "radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 40, minHeight: 420, padding: "60px 0" }}>
          {/* Left content */}
          <div style={{ flex: "1 1 480px", zIndex: 1 }}>
            {/* Trust badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", background: "rgba(6,182,212,0.15)", borderRadius: 20, border: "1px solid rgba(6,182,212,0.3)", marginBottom: 20 }}>
              <Shield size={13} color="#67E8F9" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#67E8F9", letterSpacing: "0.02em" }}>{S.length.toLocaleString()}+ Verified Shops · All 50 States</span>
            </div>

            <h1 style={{ margin: "0 0 16px", fontSize: "clamp(28px,4vw,50px)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Find Auto Glass Repair<br />
              <span style={{ color: "#67E8F9" }}>Shops Near You</span>
            </h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", maxWidth: 460, margin: "0 0 32px", lineHeight: 1.6 }}>
              Compare windshield replacement, chip repair, and ADAS recalibration shops. Insurance direct billing available.
            </p>

            {/* Search bar */}
            <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", maxWidth: 540, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "6px 6px 6px 18px", gap: 10 }}>
                <MapPin size={18} color="#0369A1" style={{ flexShrink: 0 }} />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="City or state (e.g. Miami FL, Texas)..."
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "#0C1A2E", padding: "10px 0", background: "transparent", minWidth: 0 }}
                />
                <button
                  onClick={handleSearch}
                  style={{ padding: "12px 24px", background: "#0369A1", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#0284C7"}
                  onMouseLeave={e => e.currentTarget.style.background = "#0369A1"}
                >
                  <Search size={15} color="#fff" /> Find Shops
                </button>
              </div>
            </div>

            {/* Service pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
              {["✓ Insurance Direct", "🚗 Mobile Service", "🔧 ADAS Recalibration", "⚡ Same-Day"].map(label => (
                <span key={label} style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.1)", padding: "4px 11px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.18)" }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right illustration — hidden on small screens */}
          <div style={{ flex: "0 0 420px", display: "flex", justifyContent: "flex-end", zIndex: 1 }} className="hero-illustration">
            <WindshieldSVG />
          </div>
        </div>
      </div>

      {/* ── Trust Stats Bar ──────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #BAE6FD", boxShadow: "0 2px 8px rgba(3,105,161,0.05)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { value: S.length.toLocaleString() + "+", label: "Verified Shops", icon: "🏪" },
            { value: "50", label: "States Covered", icon: "🗺️" },
            { value: insCount.toLocaleString() + "+", label: "Insurance Direct", icon: "✓" },
            { value: avgRating + "★", label: "Avg Rating", icon: "⭐" },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: "22px 16px", textAlign: "center",
              borderRight: i < 3 ? "1px solid #E0F2FE" : "none",
            }}>
              <div style={{ fontSize: 11, marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0369A1", lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginTop: 3 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <AdUnit client={siteConfig.analytics.adsenseClient} slot={siteConfig.analytics.adSlots?.homepageBelowHero} style={{ maxWidth: 900, margin: "0 auto", padding: "8px 24px" }} />

      {/* ── Browse by State ──────────────────────────────────────────────────── */}
      <div ref={stateRef} style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0C1A2E", margin: "0 0 8px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          Browse by State
        </h2>
        <p style={{ fontSize: 14, color: "#64748B", margin: "0 0 24px" }}>
          Find auto glass repair shops in your state — all 50 states covered.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {stateStats.map(st => (
            <Link key={st.code} href={getStatePath(st.code)}
              style={{ padding: "12px 16px", background: "#fff", border: "1px solid #BAE6FD", borderRadius: 10, textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0369A1"; e.currentTarget.style.background = "#F0F9FF"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#BAE6FD"; e.currentTarget.style.background = "#fff"; }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1A2E" }}>{st.name}</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>{st.n} shops</div>
              </div>
              <span style={{ background: "#E0F2FE", color: "#0369A1", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{st.code}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top Cities ───────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderTop: "1px solid #BAE6FD", borderBottom: "1px solid #BAE6FD", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0C1A2E", margin: "0 0 20px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            Popular Cities
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {topCities.map(c => (
              <Link key={c.state + '|' + c.city} href={getCityPath(c.state, c.city)}
                style={{ padding: "8px 14px", background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 20, textDecoration: "none", fontSize: 13, fontWeight: 600, color: "#0369A1", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#E0F2FE"; e.currentTarget.style.borderColor = "#0369A1"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#F0F9FF"; e.currentTarget.style.borderColor = "#BAE6FD"; }}>
                {c.city}, {c.state}
                <span style={{ fontSize: 11, color: "#64748B", marginLeft: 5 }}>{c.n}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <AdUnit client={siteConfig.analytics.adsenseClient} slot={siteConfig.analytics.adSlots?.homepageBelowListings} style={{ maxWidth: 1100, margin: "0 auto", padding: "8px 24px" }} />

      {/* ── How It Works ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0C1A2E", margin: "0 0 24px", textAlign: "center", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          How ShieldFinder Works
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { icon: <Search size={26} color="#0369A1" />, title: "Search Your City", desc: "Enter your city, state, or zip to find auto glass shops near you." },
            { icon: <Shield size={26} color="#0369A1" />, title: "Compare Shops", desc: "Filter by insurance direct billing, mobile service, and ADAS recalibration." },
            { icon: <Phone size={26} color="#0369A1" />, title: "Call Directly", desc: "Contact shops directly — no middleman, no referral fees." },
          ].map(step => (
            <div key={step.title} style={{ padding: 24, background: "#fff", borderRadius: 16, border: "1px solid #BAE6FD", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>{step.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0C1A2E", margin: "0 0 6px", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{step.title}</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Blog Preview ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderTop: "1px solid #BAE6FD", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0C1A2E", margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
              Auto Glass Guides
            </h2>
            <Link href="/blog" style={{ fontSize: 13, color: "#0369A1", textDecoration: "none", fontWeight: 600 }}>All articles →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {blogPreviews.map(post => (
              <Link key={post.slug} href={`/blog/${post.slug}`}
                style={{ padding: 20, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 14, textDecoration: "none", display: "block", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#0369A1"; e.currentTarget.style.background = "#E0F2FE"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#BAE6FD"; e.currentTarget.style.background = "#F0F9FF"; }}>
                <p style={{ fontSize: 11, color: "#64748B", margin: "0 0 8px", fontWeight: 600 }}>{post.date}</p>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0C1A2E", margin: 0, lineHeight: 1.4, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>{post.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#082F49", padding: "32px 24px", color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>🛡️ ShieldFinder</span>
            <p style={{ margin: "6px 0 0", fontSize: 12 }}>The most complete directory of auto glass repair shops in the US.</p>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <Link href="/about" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>About</Link>
            <Link href="/blog" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Blog</Link>
            <Link href="/privacy-policy" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>Terms</Link>
          </div>
          <p style={{ margin: 0, fontSize: 11 }}>© 2026 ShieldFinder.com</p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .hero-illustration { display: none !important; }
          [style*="grid-template-columns: repeat(4, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 480px) {
          [style*="grid-template-columns: repeat(2, 1fr)"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
