const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testAPIQuery() {
  try {
    const today = new Date("2025-10-08T00:00:00.000Z");

    // Test the exact query that the API should be using
    const result = await prisma.earningsTickersToday.findMany({
      where: { reportDate: today },
      select: {
        ticker: true,
        reportTime: true,
        epsActual: true,
        epsEstimate: true,
        revenueActual: true,
        revenueEstimate: true,
        sector: true,
        dataSource: true,
        fiscalPeriod: true,
        fiscalYear: true,
        companyType: true,
        primaryExchange: true,
        marketData: {
          select: {
            currentPrice: true,
            previousClose: true,
            priceChangePercent: true,
            marketCap: true,
            size: true,
            companyName: true,
            companyType: true,
            primaryExchange: true,
          },
        },
      },
      orderBy: { ticker: "asc" },
      take: 3,
    });

    console.log("API Query Result:");
    result.forEach((row) => {
      console.log(`${row.ticker}: marketData=${row.marketData ? "YES" : "NO"}`);
      if (row.marketData) {
        console.log(`  currentPrice: ${row.marketData.currentPrice}`);
        console.log(`  previousClose: ${row.marketData.previousClose}`);
        console.log(
          `  priceChangePercent: ${row.marketData.priceChangePercent}`
        );
      }
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIQuery();
