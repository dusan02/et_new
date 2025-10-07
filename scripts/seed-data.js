const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedData() {
  try {
    console.log("Seeding test data...");

    // Use the same date logic as the API (from src/lib/dates.ts)
    // This mimics getTodayStart() function
    const getNYDate = () => {
      const now = new Date();
      const nyFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const parts = nyFormatter.formatToParts(now);
      const year = parseInt(parts.find((p) => p.type === "year").value);
      const month = parseInt(parts.find((p) => p.type === "month").value) - 1;
      const day = parseInt(parts.find((p) => p.type === "day").value);
      const hour = parseInt(parts.find((p) => p.type === "hour").value);
      const minute = parseInt(parts.find((p) => p.type === "minute").value);
      const second = parseInt(parts.find((p) => p.type === "second").value);

      return new Date(year, month, day, hour, minute, second);
    };

    const getTodayStart = () => {
      const nyDate = getNYDate();
      const year = nyDate.getFullYear();
      const month = String(nyDate.getMonth() + 1).padStart(2, "0");
      const day = String(nyDate.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      return new Date(dateString + "T00:00:00.000Z");
    };

    const today = getTodayStart();
    console.log("Using date:", today.toISOString());

    // Create test earnings data
    const testEarnings = [
      {
        reportDate: today,
        ticker: "AAPL",
        reportTime: "AMC",
        epsActual: 1.52,
        epsEstimate: 1.5,
        revenueActual: BigInt(123000000000),
        revenueEstimate: BigInt(120000000000),
        sector: "Technology",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance fields commented out
        // epsGuidance: 1.55,
        // revenueGuidance: BigInt(125000000000),
        // guidancePeriod: "quarterly",
        // guidanceConfidence: 85,
        // guidanceSource: "benzinga",
        // guidanceMethod: "gaap",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance surprise fields commented out
        // epsGuideSurprise: 3.3,
        // epsGuideBasis: "estimate",
        // epsGuideExtreme: false,
        // revenueGuideSurprise: 4.2,
        // revenueGuideBasis: "estimate",
        // revenueGuideExtreme: false,
      },
      {
        reportDate: today,
        ticker: "MSFT",
        reportTime: "BMO",
        epsActual: 2.35,
        epsEstimate: 2.3,
        revenueActual: BigInt(56000000000),
        revenueEstimate: BigInt(55000000000),
        sector: "Technology",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance fields commented out
        // epsGuidance: 2.4,
        // revenueGuidance: BigInt(57000000000),
        // guidancePeriod: "quarterly",
        // guidanceConfidence: 90,
        // guidanceSource: "benzinga",
        // guidanceMethod: "gaap",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance surprise fields commented out
        // epsGuideSurprise: 4.3,
        // epsGuideBasis: "estimate",
        // epsGuideExtreme: false,
        // revenueGuideSurprise: 3.6,
        // revenueGuideBasis: "estimate",
        // revenueGuideExtreme: false,
      },
      {
        reportDate: today,
        ticker: "GOOGL",
        reportTime: "AMC",
        epsActual: 1.89,
        epsEstimate: 1.85,
        revenueActual: BigInt(86000000000),
        revenueEstimate: BigInt(85000000000),
        sector: "Technology",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance fields commented out
        // epsGuidance: 1.95,
        // revenueGuidance: BigInt(88000000000),
        // guidancePeriod: "yearly",
        // guidanceConfidence: 45,
        // guidanceSource: "benzinga",
        // guidanceMethod: "gaap",
        // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance surprise fields commented out
        // epsGuideSurprise: 350.0,
        // epsGuideBasis: "estimate",
        // epsGuideExtreme: true,
        // revenueGuideSurprise: 280.0,
        // revenueGuideBasis: "estimate",
        // revenueGuideExtreme: true,
      },
    ];

    // Create test movement data
    const testMovements = [
      {
        ticker: "AAPL",
        reportDate: today,
        companyName: "Apple Inc.",
        currentPrice: 175.5,
        previousClose: 170.25,
        marketCap: BigInt(2800000000000),
        size: "Large",
        marketCapDiff: 3.08,
        marketCapDiffBillions: 50.0,
        priceChangePercent: 3.08,
        sharesOutstanding: BigInt(16000000000),
      },
      {
        ticker: "MSFT",
        reportDate: today,
        companyName: "Microsoft Corporation",
        currentPrice: 380.25,
        previousClose: 375.8,
        marketCap: BigInt(2800000000000),
        size: "Large",
        marketCapDiff: 1.18,
        marketCapDiffBillions: 25.0,
        priceChangePercent: 1.18,
        sharesOutstanding: BigInt(7500000000),
      },
      {
        ticker: "GOOGL",
        reportDate: today,
        companyName: "Alphabet Inc.",
        currentPrice: 142.8,
        previousClose: 140.5,
        marketCap: BigInt(1800000000000),
        size: "Large",
        marketCapDiff: 1.64,
        marketCapDiffBillions: 15.0,
        priceChangePercent: 1.64,
        sharesOutstanding: BigInt(12500000000),
      },
    ];

    // Clear existing data
    await prisma.earningsTickersToday.deleteMany({});
    await prisma.todayEarningsMovements.deleteMany({});
    await prisma.marketData.deleteMany({});

    // Create movements first
    for (const movement of testMovements) {
      await prisma.todayEarningsMovements.create({
        data: movement,
      });
    }

    // Create market data (API uses MarketData table)
    for (const movement of testMovements) {
      await prisma.marketData.create({
        data: {
          ticker: movement.ticker,
          reportDate: movement.reportDate,
          companyName: movement.companyName,
          currentPrice: movement.currentPrice,
          previousClose: movement.previousClose,
          priceChangePercent: movement.priceChangePercent,
          marketCap: Number(movement.marketCap), // Convert BigInt to Number
          size: movement.size,
          marketCapDiff: movement.marketCapDiff,
          marketCapDiffBillions: movement.marketCapDiffBillions,
          sharesOutstanding: Number(movement.sharesOutstanding), // Convert BigInt to Number
          companyType: movement.companyType,
          primaryExchange: movement.primaryExchange,
        },
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
