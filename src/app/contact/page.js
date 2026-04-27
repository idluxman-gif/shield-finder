import Link from 'next/link';
import PageNav from '@/components/PageNav';
import { siteConfig } from '@/config/site';

const { domain } = siteConfig;

export const metadata = {
  title: `Contact Us | ShieldFinder`,
  description: 'Get in touch with ShieldFinder. Report incorrect listings, suggest new auto glass shops, or ask a question.',
  alternates: { canonical: `${domain}/contact/` },
};

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#F0F9FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PageNav />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 48px' }}>
        <nav style={{ marginBottom: 20, fontSize: 12, color: '#94A3B8' }}>
          <Link href="/" style={{ color: '#94A3B8', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <span style={{ color: '#64748B' }}>Contact</span>
        </nav>

        <h1 style={{ margin: '0 0 20px', fontSize: 28, fontWeight: 900, color: '#0C1A2E', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          Contact Us
        </h1>

        <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.8 }}>
          <p>We&rsquo;d love to hear from you. Whether you&rsquo;re a driver with a question, a shop owner who wants to be listed, or someone who spotted an error &mdash; your message helps us make ShieldFinder better for everyone.</p>

          <div style={{ background: '#fff', border: '1px solid #BAE6FD', borderRadius: 12, padding: 24, margin: '20px 0' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0C1A2E', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Get in Touch</h2>
            <p style={{ margin: '0 0 4px' }}>
              <strong>Email:</strong>{' '}
              <a href="mailto:info@shieldfinder.com" style={{ color: '#0369A1' }}>info@shieldfinder.com</a>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>We typically respond within 1&ndash;2 business days.</p>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>For Drivers</h2>
          <p>Found outdated information for a shop? Notice a listing that doesn&rsquo;t look like an auto glass shop? Send us an email with the shop name and what needs to be corrected. We&rsquo;ll verify and update it.</p>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>For Shop Owners</h2>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', margin: '16px 0 8px' }}>Want Your Shop Added?</h3>
          <p>If you operate an auto glass repair shop and don&rsquo;t see your business listed, send us an email with your shop name, address, phone number, website, and services offered. We&rsquo;ll verify the information and add your listing at no charge.</p>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C1A2E', margin: '16px 0 8px' }}>Want Your Shop Removed?</h3>
          <p>If your shop is listed and you&rsquo;d like it removed, email us with a removal request. We process removal requests promptly, typically within 2&ndash;3 business days.</p>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0C1A2E', margin: '32px 0 12px', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>Report a Problem</h2>
          <p>If something on the site isn&rsquo;t working &mdash; a broken link, a search issue, incorrect hours, or anything else &mdash; please reach out at <a href="mailto:info@shieldfinder.com" style={{ color: '#0369A1' }}>info@shieldfinder.com</a> so we can fix it.</p>

          <p style={{ marginTop: 24, fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>Thank you for helping us build the most accurate auto glass directory on the web.</p>
        </div>
      </div>
    </div>
  );
}
