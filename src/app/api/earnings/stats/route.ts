import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock stats data
    const mockStats = {
      totalEarnings: 3,
      withEps: 3,
      withRevenue: 3,
      sizeDistribution: [
        {
          size: 'Large',
          _count: { size: 3 },
          _sum: { marketCap: 7400000000000 }
        }
      ],
      topGainers: [
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          priceChangePercent: 3.08,
          marketCapDiffBillions: 50.0
        },
        {
          ticker: 'GOOGL',
          companyName: 'Alphabet Inc.',
          priceChangePercent: 1.64,
          marketCapDiffBillions: 15.0
        },
        {
          ticker: 'MSFT',
          companyName: 'Microsoft Corporation',
          priceChangePercent: 1.18,
          marketCapDiffBillions: 25.0
        }
      ],
      topLosers: [
        {
          ticker: 'MSFT',
          companyName: 'Microsoft Corporation',
          priceChangePercent: 1.18,
          marketCapDiffBillions: 25.0
        },
        {
          ticker: 'GOOGL',
          companyName: 'Alphabet Inc.',
          priceChangePercent: 1.64,
          marketCapDiffBillions: 15.0
        },
        {
          ticker: 'AAPL',
          companyName: 'Apple Inc.',
          priceChangePercent: 3.08,
          marketCapDiffBillions: 50.0
        }
      ]
    };

    return NextResponse.json({
      success: true,
      data: mockStats,
    });
  } catch (error) {
    console.error('Error fetching earnings stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch earnings statistics',
    }, { status: 500 });
  }
}
