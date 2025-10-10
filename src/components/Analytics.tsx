// Analytics tracking utilities
export function trackCardClick(cardType: string) {
  console.log(`[ANALYTICS] Card clicked: ${cardType}`);
  // In a real application, you would send this to your analytics service
  // Example: gtag('event', 'card_click', { card_type: cardType });
}