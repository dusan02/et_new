import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test data - namiesto databázy použijeme mock dáta
    const mockData = [
      {
        id: 1,
        reportDate: new Date().toISOString(),
        ticker: 'AAPL',
        reportTime: 'AMC',
        epsActual: 1.52,
        epsEstimate: 1.50,
        revenueActual: 123000000000,
        revenueEstimate: 120000000000,
        sector: 'Technology',
               movement: {
                 id: 1,
                 ticker: 'AAPL',
                 companyName: 'Apple Inc.',
                 currentPrice: 175.50,
                 previousClose: 170.25,
                 marketCap: 2800000000000,
                 size: 'Large',
                 marketCapDiff: 50000000000,
                 marketCapDiffBillions: 50.0,
                 priceChangePercent: 3.08,
                 sharesOutstanding: 16000000000,
               },
               // NEW: Guidance fields (hybrid approach)
               epsGuidance: 1.55,
               revenueGuidance: 125000000000,
               guidancePeriod: 'quarterly',
               guidanceConfidence: 85,
               guidanceSource: 'benzinga',
               guidanceMethod: 'gaap',
               epsGuideSurprise: 3.3,
               epsGuideBasis: 'estimate',
               epsGuideExtreme: false,
               revenueGuideSurprise: 4.2,
               revenueGuideBasis: 'estimate',
               revenueGuideExtreme: false
      },
      {
        id: 2,
        reportDate: new Date().toISOString(),
        ticker: 'MSFT',
        reportTime: 'BMO',
        epsActual: 2.35,
        epsEstimate: 2.30,
        revenueActual: 56000000000,
        revenueEstimate: 55000000000,
        sector: 'Technology',
               movement: {
                 id: 2,
                 ticker: 'MSFT',
                 companyName: 'Microsoft Corporation',
                 currentPrice: 380.25,
                 previousClose: 375.80,
                 marketCap: 2800000000000,
                 size: 'Large',
                 marketCapDiff: 25000000000,
                 marketCapDiffBillions: 25.0,
                 priceChangePercent: 1.18,
                 sharesOutstanding: 7500000000,
               },
               // NEW: Guidance fields (hybrid approach)
               epsGuidance: 2.40,
               revenueGuidance: 57000000000,
               guidancePeriod: 'quarterly',
               guidanceConfidence: 90,
               guidanceSource: 'benzinga',
               guidanceMethod: 'gaap',
               epsGuideSurprise: 4.3,
               epsGuideBasis: 'estimate',
               epsGuideExtreme: false,
               revenueGuideSurprise: 3.6,
               revenueGuideBasis: 'estimate',
               revenueGuideExtreme: false
      },
      {
        id: 3,
        reportDate: new Date().toISOString(),
        ticker: 'GOOGL',
        reportTime: 'AMC',
        epsActual: 1.89,
        epsEstimate: 1.85,
        revenueActual: 86000000000,
        revenueEstimate: 85000000000,
        sector: 'Technology',
               movement: {
                 id: 3,
                 ticker: 'GOOGL',
                 companyName: 'Alphabet Inc.',
                 currentPrice: 142.80,
                 previousClose: 140.50,
                 marketCap: 1800000000000,
                 size: 'Large',
                 marketCapDiff: 15000000000,
                 marketCapDiffBillions: 15.0,
                 priceChangePercent: 1.64,
                 sharesOutstanding: 12500000000,
               },
               // NEW: Guidance fields (hybrid approach) - EXTREME VALUE EXAMPLE
               epsGuidance: 1.95,
               revenueGuidance: 88000000000,
               guidancePeriod: 'yearly', // This will trigger smart period detection
               guidanceConfidence: 45, // Low confidence due to period mismatch
               guidanceSource: 'benzinga',
               guidanceMethod: 'gaap',
               epsGuideSurprise: 350.0, // EXTREME VALUE >300%
               epsGuideBasis: 'estimate',
               epsGuideExtreme: true,
               revenueGuideSurprise: 280.0, // EXTREME VALUE >300%
               revenueGuideBasis: 'estimate',
               revenueGuideExtreme: true
      }
    ];

    return NextResponse.json({
      success: true,
      data: mockData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching earnings data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch earnings data',
    }, { status: 500 });
  }
}
