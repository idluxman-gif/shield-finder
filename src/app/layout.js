import './globals.css';
import Script from 'next/script';
import SiteFooter from '@/components/SiteFooter';
import { siteConfig } from '@/config/site';

export const metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: siteConfig.seo.title,
  description: siteConfig.seo.description,
  keywords: siteConfig.seo.keywords,
  alternates: { canonical: siteConfig.domain },
  verification: { google: siteConfig.seo.googleVerification },
  openGraph: {
    title: siteConfig.seo.ogTitle,
    description: siteConfig.seo.ogDescription,
    type: 'website',
    url: siteConfig.domain,
  },
};

export default function RootLayout({ children }) {
  const { ga4Id, adsenseClient } = siteConfig.analytics;
  return (
    <html lang="en">
      <head />
      <body>
        {children}
        <SiteFooter />
        {ga4Id && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${ga4Id}');
              `}
            </Script>
          </>
        )}
        {adsenseClient && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
