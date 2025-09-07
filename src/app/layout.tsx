import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Earnings Table - Stock Earnings & Corporate Guidance Dashboard',
  description: 'Live earnings table with corporate guidance data. Track today\'s stock earnings, EPS beats/misses, revenue surprises, and future guidance from companies.',
  keywords: 'earnings table, stock earnings, corporate guidance, earnings guidance, EPS guidance, revenue guidance, earnings forecast, stock market guidance, financial dashboard, earnings outlook, corporate earnings, future earnings',
  authors: [{ name: 'Earnings Table Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Earnings Table - Stock Earnings & Corporate Guidance Dashboard',
    description: 'Live earnings table with corporate guidance data. Track today\'s stock earnings, EPS beats/misses, revenue surprises, and future guidance from companies.',
    type: 'website',
    url: 'https://earningstable.com',
    siteName: 'Earnings Table',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Earnings Table - Stock Earnings & Corporate Guidance Dashboard',
    description: 'Live earnings table with corporate guidance data. Track today\'s stock earnings, EPS beats/misses, revenue surprises, and future guidance from companies.',
    site: '@earnings_table',
    creator: '@earnings_table',
  },
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes',
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://earningstable.com" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
