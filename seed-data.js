const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log("Seeding test data...");

    // Create test earnings data
    const testEarnings = [
      {
        reportDate: new Date(),
        ticker: "AAPL",
        reportTime: "AMC",
        epsActual: 1.52,
        epsEstimate: 1.5,
        revenueActual: BigInt(123000000000),
        revenueEstimate: BigInt(120000000000),
        sector: "Technology",
        epsGuidance: 1.55,
        revenueGuidance: BigInt(125000000000),
        guidancePeriod: "quarterly",
        guidanceConfidence: 85,
        guidanceSource: "benzinga",
        guidanceMethod: "gaap",
        epsGuideSurprise: 3.3,
        epsGuideBasis: "estimate",
        epsGuideExtreme: false,
        revenueGuideSurprise: 4.2,
        revenueGuideBasis: "estimate",
        revenueGuideExtreme: false,
      },
      {
        reportDate: new Date(),
        ticker: "MSFT",
        reportTime: "BMO",
        epsActual: 2.35,
        epsEstimate: 2.3,
        revenueActual: BigInt(56000000000),
        revenueEstimate: BigInt(55000000000),
        sector: "Technology",
        epsGuidance: 2.4,
        revenueGuidance: BigInt(57000000000),
        guidancePeriod: "quarterly",
        guidanceConfidence: 90,
        guidanceSource: "benzinga",
        guidanceMethod: "gaap",
        epsGuideSurprise: 4.3,
        epsGuideBasis: "estimate",
        epsGuideExtreme: false,
        revenueGuideSurprise: 3.6,
        revenueGuideBasis: "estimate",
        revenueGuideExtreme: false,
      },
      {
        reportDate: new Date(),
        ticker: "GOOGL",
        reportTime: "AMC",
        epsActual: 1.89,
        epsEstimate: 1.85,
        revenueActual: BigInt(86000000000),
        revenueEstimate: BigInt(85000000000),
        sector: "Technology",
        epsGuidance: 1.95,
        revenueGuidance: BigInt(88000000000),
        guidancePeriod: "yearly",
        guidanceConfidence: 45,
        guidanceSource: "benzinga",
        guidanceMethod: "gaap",
        epsGuideSurprise: 350.0,
        epsGuideBasis: "estimate",
        epsGuideExtreme: true,
        revenueGuideSurprise: 280.0,
        revenueGuideBasis: "estimate",
        revenueGuideExtreme: true,
      },
    ];

    // Create test movement data
    const testMovements = [
      {
        ticker: "AAPL",
        companyName: "Apple Inc.",
        currentPrice: 175.5,
        previousClose: 170.25,
        marketCap: BigInt(2800000000000),
        size: "Large",
        marketCapDiff: BigInt(50000000000),
        marketCapDiffBillions: 50.0,
        priceChangePercent: 3.08,
        sharesOutstanding: BigInt(16000000000),
      },
      {
        ticker: "MSFT",
        companyName: "Microsoft Corporation",
        currentPrice: 380.25,
        previousClose: 375.8,
        marketCap: BigInt(2800000000000),
        size: "Large",
        marketCapDiff: BigInt(25000000000),
        marketCapDiffBillions: 25.0,
        priceChangePercent: 1.18,
        sharesOutstanding: BigInt(7500000000),
      },
      {
        ticker: "GOOGL",
        companyName: "Alphabet Inc.",
        currentPrice: 142.8,
        previousClose: 140.5,
        marketCap: BigInt(1800000000000),
        size: "Large",
        marketCapDiff: BigInt(15000000000),
        marketCapDiffBillions: 15.0,
        priceChangePercent: 1.64,
        sharesOutstanding: BigInt(12500000000),
      },
    ];

    // Clear existing data
    await prisma.earningsTickersToday.deleteMany({});
    await prisma.todayEarningsMovements.deleteMany({});

    // Create movements first
    for (const movement of testMovements) {
      await prisma.todayEarningsMovements.create({
        data: movement,
      });
    }

    // Create earnings data
    for (const earning of testEarnings) {
      await prisma.earningsTickersToday.create({
        data: earning,
      });
    }

    console.log("Test data seeded successfully!");
    console.log("Created 3 earnings records with movement data");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
