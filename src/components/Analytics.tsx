'use client';

import Script from 'next/script';

interface AnalyticsProps {
  measurementId: string;
}

export function Analytics({ measurementId }: AnalyticsProps) {
  return (
    <>
      {/* Google Analytics */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_title: document.title,
            page_location: window.location.href,
            send_page_view: true
          });
        `}
      </Script>
    </>
  );
}

// Custom event tracking functions
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
      page_title: title || document.title,
      page_location: url,
    });
  }
};

// Earnings-specific tracking functions
export const trackEarningsView = (ticker: string, companyName: string) => {
  trackEvent('earnings_view', 'earnings', `${ticker} - ${companyName}`);
};

export const trackTableSort = (column: string, direction: 'asc' | 'desc') => {
  trackEvent('table_sort', 'interaction', `${column}_${direction}`);
};

export const trackTableFilter = (filterType: string, value: string) => {
  trackEvent('table_filter', 'interaction', `${filterType}: ${value}`);
};

export const trackStatsCardClick = (cardType: string) => {
  trackEvent('stats_card_click', 'interaction', cardType);
};

export const trackRefresh = () => {
  trackEvent('data_refresh', 'interaction', 'manual_refresh');
};

export const trackViewToggle = (view: 'eps_revenue' | 'guidance') => {
  trackEvent('view_toggle', 'interaction', view);
};

export const trackCardClick = (cardType: string) => {
  trackEvent('card_click', 'interaction', cardType);
};

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: {
        page_title?: string;
        page_location?: string;
        send_page_view?: boolean;
        event_category?: string;
        event_label?: string;
        value?: number;
      }
    ) => void;
  }
}
