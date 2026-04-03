import Link from 'next/link';
import { notFound } from 'next/navigation';
import { blogPosts, getBlogPost, getBlogPostSlugs } from '@/data/blogPosts';
import { siteConfig } from '@/config/site';
import PageNav from '@/components/PageNav';

const { domain, displayName, primaryColor } = siteConfig;

export function generateStaticParams() {
  return getBlogPostSlugs().map(slug => ({ slug }));
}

export function generateMetadata({ params }) {
  const post = getBlogPost(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | ${displayName}`,
    description: post.excerpt,
    alternates: { canonical: `${domain}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `${domain}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
    },
  };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPostPage({ params }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: post.author,
      jobTitle: post.authorTitle,
    },
    publisher: {
      '@type': 'Organization',
      name: displayName,
      url: domain,
    },
    datePublished: post.publishedAt,
    mainEntityOfPage: `${domain}/blog/${post.slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: domain },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${domain}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${domain}/blog/${post.slug}` },
    ],
  };

  // Related posts: same category, excluding current
  const related = blogPosts
    .filter(p => p.slug !== post.slug && p.category === post.category)
    .slice(0, 2);
  const morePosts = related.length < 2
    ? [...related, ...blogPosts.filter(p => p.slug !== post.slug && !related.includes(p)).slice(0, 2 - related.length)]
    : related;

  return (
    <div style={{ minHeight: '100vh', background: '#F0F9FF', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <PageNav />

      {/* Article header */}
      <div style={{ background: 'linear-gradient(160deg, #ffffff 0%, #E0F2FE 100%)', borderBottom: '1px solid #BAE6FD', padding: '40px 20px 36px' }}>
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav style={{ fontSize: 13, color: '#64748B', marginBottom: 18 }}>
            <Link href="/" style={{ color: '#64748B', textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <Link href="/blog" style={{ color: '#64748B', textDecoration: 'none' }}>Blog</Link>
            <span style={{ margin: '0 8px' }}>›</span>
            <span style={{ color: '#0C1A2E' }}>{post.category}</span>
          </nav>

          <div style={{ display: 'inline-block', background: '#E0F2FE', color: primaryColor, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, marginBottom: 14 }}>
            {post.category}
          </div>

          <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, color: '#0C1A2E', margin: '0 0 16px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', lineHeight: 1.25 }}>
            {post.title}
          </h1>

          <p style={{ fontSize: 17, color: '#475569', margin: '0 0 24px', lineHeight: 1.6 }}>
            {post.excerpt}
          </p>

          {/* Author / meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: primaryColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
              {post.author.split(' ').map(w => w[0]).join('')}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0C1A2E' }}>{post.author}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{post.authorTitle} · {displayName}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#64748B' }}>{formatDate(post.publishedAt)}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{post.readMinutes} min read</div>
            </div>
          </div>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '40px 20px 60px' }}>
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
          style={{
            fontSize: 16,
            lineHeight: 1.75,
            color: '#1E293B',
          }}
        />

        {/* CTA box */}
        <div style={{ background: '#0369A1', borderRadius: 14, padding: '28px 28px', margin: '48px 0 0', color: '#fff', textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
            Find a Verified Auto Glass Shop Near You
          </p>
          <p style={{ fontSize: 14, margin: '0 0 18px', opacity: 0.85 }}>
            Compare shops by rating, insurance direct billing, and mobile service availability.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#fff', color: '#0369A1', fontWeight: 700, fontSize: 14, padding: '11px 24px', borderRadius: 9, textDecoration: 'none' }}>
            Search Shops →
          </Link>
        </div>

        {/* Related posts */}
        {morePosts.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0C1A2E', margin: '0 0 20px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
              More Guides
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {morePosts.map(rp => (
                <Link key={rp.slug} href={`/blog/${rp.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', padding: '18px', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 11, color: primaryColor, fontWeight: 700, marginBottom: 8 }}>{rp.category}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0C1A2E', lineHeight: 1.35, marginBottom: 8 }}>{rp.title}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{formatDate(rp.publishedAt)} · {rp.readMinutes} min read</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <Link href="/blog" style={{ fontSize: 14, fontWeight: 600, color: primaryColor, textDecoration: 'none' }}>
                View all guides →
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .blog-content h2 {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0C1A2E;
          margin: 2rem 0 0.75rem;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          line-height: 1.3;
        }
        .blog-content h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0C1A2E;
          margin: 1.5rem 0 0.5rem;
        }
        .blog-content p {
          margin: 0 0 1.1rem;
        }
        .blog-content ul, .blog-content ol {
          margin: 0 0 1.1rem;
          padding-left: 1.5rem;
        }
        .blog-content li {
          margin-bottom: 0.4rem;
        }
        .blog-content strong {
          color: #0C1A2E;
          font-weight: 600;
        }
        .blog-content a {
          color: #0369A1;
          text-decoration: underline;
          text-decoration-color: #BAE6FD;
          text-underline-offset: 3px;
        }
        .blog-content a:hover {
          text-decoration-color: #0369A1;
        }
        .blog-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0 1.5rem;
          font-size: 14px;
        }
        .blog-content th {
          background: #E0F2FE;
          color: #0369A1;
          font-weight: 700;
          padding: 8px 12px;
          text-align: left;
          border-bottom: 2px solid #BAE6FD;
        }
        .blog-content td {
          padding: 8px 12px;
          border-bottom: 1px solid #E2E8F0;
          color: #334155;
        }
        .blog-content tr:last-child td {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
}
