const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log("Testing database connection...");

    // Test earnings data
    const earningsCount = await prisma.earningsTickersToday.count();
    console.log(`Earnings records: ${earningsCount}`);

    // Test movement data
    const movementCount = await prisma.todayEarningsMovements.count();
    console.log(`Movement records: ${movementCount}`);

    // Test fetching data
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const earningsData = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: {
          gte: new Date(todayStr),
          lt: new Date(new Date(todayStr).getTime() + 24 * 60 * 60 * 1000),
        },
      },
      orderBy: {
        ticker: "asc",
      },
    });

    console.log(`Found ${earningsData.length} earnings records for today`);

    const movementData = await prisma.todayEarningsMovements.findMany();
    console.log(`Found ${movementData.length} movement records`);

    // Test data structure
    if (earningsData.length > 0) {
      console.log("Sample earnings record:", {
        id: earningsData[0].id,
        ticker: earningsData[0].ticker,
        reportTime: earningsData[0].reportTime,
        epsActual: earningsData[0].epsActual,
        epsEstimate: earningsData[0].epsEstimate,
      });
    }

    if (movementData.length > 0) {
      console.log("Sample movement record:", {
        ticker: movementData[0].ticker,
        companyName: movementData[0].companyName,
        currentPrice: movementData[0].currentPrice,
        priceChangePercent: movementData[0].priceChangePercent,
      });
    }
  } catch (error) {
    console.error("Database test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
