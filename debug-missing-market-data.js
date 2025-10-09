const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugMissingMarketData() {
  try {
    console.log("🔍 Debugging missing market data...");

    // Get all earnings for today
    const allEarnings = await prisma.earningsTickersToday.findMany({
      where: { reportDate: new Date("2025-10-08") },
      include: { marketData: true },
      orderBy: { ticker: "asc" },
    });

    console.log(`📊 Total earnings records: ${allEarnings.length}`);

    const withMarketData = allEarnings.filter((e) => e.marketData);
    const withoutMarketData = allEarnings.filter((e) => !e.marketData);

    console.log(`✅ With market data: ${withMarketData.length}`);
    console.log(`❌ Without market data: ${withoutMarketData.length}`);

    if (withoutMarketData.length > 0) {
      console.log("\n❌ Tickers without market data:");
      withoutMarketData.forEach((e) => {
        console.log(`  - ${e.ticker} (${e.companyName || "N/A"})`);
      });
    }

    if (withMarketData.length > 0) {
      console.log("\n✅ Tickers with market data:");
      withMarketData.forEach((e) => {
        console.log(
          `  - ${e.ticker}: $${e.marketData.currentPrice} (${e.marketData.priceChangePercent}%)`
        );
      });
    }

    // Check if market data exists separately for missing tickers
    console.log("\n🔍 Checking if market data exists separately...");
    for (const earning of withoutMarketData) {
      const marketData = await prisma.marketData.findFirst({
        where: {
          ticker: earning.ticker,
          reportDate: new Date("2025-10-08"),
        },
      });

      if (marketData) {
        console.log(
          `⚠️  ${earning.ticker}: Market data exists but not linked!`
        );
        console.log(
          `    Market data: $${marketData.currentPrice} (${marketData.priceChangePercent}%)`
        );
      } else {
        console.log(`❌ ${earning.ticker}: No market data found at all`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugMissingMarketData();
