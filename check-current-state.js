const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    const earnings = await prisma.earningsTickersToday.count();
    const market = await prisma.marketData.count();

    console.log("📊 Current database state:");
    console.log(`Earnings: ${earnings} records`);
    console.log(`MarketData: ${market} records`);

    // Check which tickers have market cap
    const marketData = await prisma.marketData.findMany({
      select: { ticker: true, marketCap: true, currentPrice: true },
    });

    const withMarketCap = marketData.filter(
      (m) => m.marketCap && m.marketCap > 0
    );
    const withoutMarketCap = marketData.filter(
      (m) => !m.marketCap || m.marketCap <= 0
    );

    console.log(`\n🎯 Market cap analysis:`);
    console.log(`With market cap: ${withMarketCap.length}`);
    console.log(`Without market cap: ${withoutMarketCap.length}`);

    if (withoutMarketCap.length > 0) {
      console.log(`\n❌ Tickers without market cap:`);
      withoutMarketCap.forEach((m) =>
        console.log(
          `  ${m.ticker}: cap=${m.marketCap}, price=${m.currentPrice}`
        )
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
