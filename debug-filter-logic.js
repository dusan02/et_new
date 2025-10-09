const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugFilterLogic() {
  try {
    console.log("🔍 Debugging filter logic...");

    // Get all earnings for today
    const allEarnings = await prisma.earningsTickersToday.findMany({
      where: { reportDate: new Date("2025-10-08") },
      orderBy: { ticker: "asc" },
    });

    console.log(`📊 Total earnings records: ${allEarnings.length}`);

    // Get all market data for today
    const allMarketData = await prisma.marketData.findMany({
      where: { reportDate: new Date("2025-10-08") },
      orderBy: { ticker: "asc" },
    });

    console.log(`📈 Total market records: ${allMarketData.length}`);

    // Check which earnings have market data
    const earningsWithMarket = allEarnings.filter((e) =>
      allMarketData.some((m) => m.ticker === e.ticker)
    );

    const earningsWithoutMarket = allEarnings.filter(
      (e) => !allMarketData.some((m) => m.ticker === e.ticker)
    );

    console.log(`✅ Earnings with market data: ${earningsWithMarket.length}`);
    console.log(
      `❌ Earnings without market data: ${earningsWithoutMarket.length}`
    );

    if (earningsWithoutMarket.length > 0) {
      console.log("\n❌ Tickers without market data:");
      earningsWithoutMarket.forEach((e) => {
        console.log(`  - ${e.ticker} (${e.companyName || "N/A"})`);
      });
    }

    // Check market cap data for existing market records
    console.log("\n📊 Market cap analysis for existing records:");
    allMarketData.forEach((m) => {
      const hasMarketCap = m.marketCap && m.marketCap > 0;
      const hasSharesOutstanding =
        m.sharesOutstanding && m.sharesOutstanding > 0;
      const hasCurrentPrice = m.currentPrice && m.currentPrice > 0;

      console.log(
        `  ${m.ticker}: cap=${m.marketCap}, shares=${m.sharesOutstanding}, price=${m.currentPrice}`
      );
      console.log(
        `    -> hasMarketCap: ${hasMarketCap}, hasSharesOutstanding: ${hasSharesOutstanding}, hasCurrentPrice: ${hasCurrentPrice}`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugFilterLogic();
