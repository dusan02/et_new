import { useEffect } from 'react';

// TypeScript declarations for gtag
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Analytics tracking utilities
export function trackCardClick(cardType: string) {
  console.log(`[ANALYTICS] Card clicked: ${cardType}`);
  // In a real application, you would send this to your analytics service
  // Example: gtag('event', 'card_click', { card_type: cardType });
}

// Analytics component for Google Analytics
export function Analytics({ measurementId }: { measurementId: string }) {
  useEffect(() => {
    // Initialize Google Analytics
    if (typeof window !== 'undefined' && measurementId) {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', measurementId);
    }
  }, [measurementId]);

  return null;
}