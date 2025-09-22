import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Live Earnings Table | Today\'s Stock Earnings Dashboard',
  description: 'Real-time earnings table with live stock data, EPS beats/misses, and revenue surprises. Track today\'s earnings reports with market cap and price changes from public companies.',
  keywords: 'earnings table, stock earnings, financial dashboard, earnings outlook, corporate earnings, live earnings, real-time earnings, earnings calendar, earnings surprise, EPS beat, revenue beat, market cap, stock price, earnings data',
  authors: [{ name: 'Earnings Table Team' }],
  creator: 'Earnings Table Team',
  publisher: 'Earnings Table',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  alternates: {
    canonical: 'https://earningstable.com',
  },
  category: 'Finance',
  classification: 'Financial Dashboard',
  openGraph: {
    title: 'Live Earnings Table | Today\'s Stock Earnings Dashboard',
    description: 'Real-time earnings table with live stock data, EPS beats/misses, and revenue surprises. Track today\'s earnings reports with market cap and price changes from public companies.',
    type: 'website',
    url: 'https://earningstable.com',
    siteName: 'Earnings Table',
    locale: 'en_US',
    countryName: 'United States',
    images: [
      {
        url: 'https://earningstable.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Earnings Table - Live Stock Earnings Dashboard',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Earnings Table | Today\'s Stock Earnings Dashboard',
    description: 'Real-time earnings table with live stock data, EPS beats/misses, and revenue surprises. Track today\'s earnings reports with market cap and price changes from public companies.',
    site: '@earnings_table',
    creator: '@earnings_table',
    images: ['https://earningstable.com/og-image.png'],
  },
  verification: {
    google: 'google-site-verification=YOUR_ACTUAL_CODE_HERE',
    yandex: 'YOUR_YANDEX_CODE_HERE',
    yahoo: 'YOUR_YAHOO_CODE_HERE',
  },
  other: {
    'msapplication-TileColor': '#3b82f6',
    'theme-color': '#3b82f6',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Earnings Table',
    'application-name': 'Earnings Table',
    'msapplication-tooltip': 'Live Earnings Dashboard',
    'msapplication-starturl': '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 5.0,
  userScalable: true,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="canonical" href="https://earningstable.com" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Earnings Table",
              "description": "Real-time earnings table with live stock data, EPS beats/misses, and revenue surprises. Track today's earnings reports with market cap and price changes from public companies.",
              "url": "https://earningstable.com",
              "applicationCategory": "FinanceApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "creator": {
                "@type": "Organization",
                "name": "Earnings Table Team"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Earnings Table",
                "url": "https://earningstable.com"
              },
              "dateCreated": "2024-01-01",
              "dateModified": new Date().toISOString(),
              "inLanguage": "en-US",
              "isAccessibleForFree": true,
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "softwareVersion": "1.0.0",
              "featureList": [
                "Real-time earnings data",
                "EPS and revenue surprises",
                "Market cap and price changes",
                "Live stock data",
                "Earnings calendar",
                "Financial dashboard"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Earnings Table",
              "description": "Live earnings table with real-time stock information and earnings data",
              "url": "https://earningstable.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://earningstable.com?search={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              },
              "publisher": {
                "@type": "Organization",
                "name": "Earnings Table",
                "url": "https://earningstable.com"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "DataCatalog",
              "name": "Earnings Data Catalog",
              "description": "Comprehensive database of corporate earnings and financial data",
              "url": "https://earningstable.com",
              "keywords": "earnings, financial data, stock market, EPS, revenue",
              "provider": {
                "@type": "Organization",
                "name": "Earnings Table",
                "url": "https://earningstable.com"
              },
              "dataset": {
                "@type": "Dataset",
                "name": "Corporate Earnings Data",
                "description": "Real-time corporate earnings and financial metrics",
                "keywords": "earnings, EPS, revenue, market cap, stock price",
                "temporalCoverage": "2024-01-01/..",
                "spatialCoverage": "United States",
                "distribution": {
                  "@type": "DataDownload",
                  "encodingFormat": "JSON",
                  "contentUrl": "https://earningstable.com/api/earnings/today"
                }
              }
            })
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Analytics measurementId="G-E6DJ7N6W1L" />
      </body>
    </html>
  );
}

