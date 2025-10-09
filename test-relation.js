const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testRelation() {
  try {
    const today = new Date("2025-10-08T00:00:00.000Z");

    // Test the relation directly
    const earnings = await prisma.earningsTickersToday.findFirst({
      where: {
        ticker: "AONC",
        reportDate: today,
      },
      include: { marketData: true },
    });

    console.log("Earnings record:");
    console.log("  ticker:", earnings?.ticker);
    console.log("  reportDate:", earnings?.reportDate);
    console.log("  marketData:", earnings?.marketData);

    // Test if market data exists separately
    const marketData = await prisma.marketData.findFirst({
      where: {
        ticker: "AONC",
        reportDate: today,
      },
    });

    console.log("\nMarket data record:");
    console.log("  ticker:", marketData?.ticker);
    console.log("  reportDate:", marketData?.reportDate);
    console.log("  currentPrice:", marketData?.currentPrice);

    // Test the exact query from API
    const apiQuery = await prisma.earningsTickersToday.findMany({
      where: { reportDate: today },
      select: {
        ticker: true,
        marketData: {
          select: {
            currentPrice: true,
            previousClose: true,
            priceChangePercent: true,
          },
        },
      },
      take: 3,
    });

    console.log("\nAPI Query Result:");
    apiQuery.forEach((row) => {
      console.log(
        `  ${row.ticker}: marketData=${row.marketData ? "YES" : "NO"}`
      );
      if (row.marketData) {
        console.log(`    currentPrice: ${row.marketData.currentPrice}`);
        console.log(`    previousClose: ${row.marketData.previousClose}`);
        console.log(
          `    priceChangePercent: ${row.marketData.priceChangePercent}`
        );
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRelation();
