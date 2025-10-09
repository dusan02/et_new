const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log("🔍 Checking database data...");

    // Check earnings data
    const earnings = await prisma.earningsTickersToday.findMany({
      where: { reportDate: new Date("2025-10-08") },
      include: { marketData: true },
      take: 3,
    });

    console.log("📊 Earnings records:", earnings.length);
    earnings.forEach((e) => {
      console.log(`  ${e.ticker}: marketData=${e.marketData ? "YES" : "NO"}`);
      if (e.marketData) {
        console.log(
          `    Price: ${e.marketData.currentPrice}, Change: ${e.marketData.priceChangePercent}%`
        );
      }
    });

    // Check market data separately
    const market = await prisma.marketData.findMany({
      where: { reportDate: new Date("2025-10-08") },
      take: 3,
    });

    console.log("📈 Market records:", market.length);
    market.forEach((m) => {
      console.log(
        `  ${m.ticker}: Price=${m.currentPrice}, Change=${m.priceChangePercent}%`
      );
    });

    // Check if there's a relationship issue
    console.log("\n🔗 Checking relationship...");
    const testEarning = await prisma.earningsTickersToday.findFirst({
      where: {
        reportDate: new Date("2025-10-08"),
        ticker: "AZZ",
      },
      include: { marketData: true },
    });

    if (testEarning) {
      console.log(
        `AZZ earnings: ${testEarning.ticker}, marketData: ${
          testEarning.marketData ? "FOUND" : "MISSING"
        }`
      );
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
