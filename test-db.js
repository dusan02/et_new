const { PrismaClient } = require("@prisma/client");

async function testDb() {
  const prisma = new PrismaClient();

  try {
    console.log("Testing database connection...");

    // Test basic connection
    const count = await prisma.earningsTickersToday.count();
    console.log(`Total earnings records: ${count}`);

    // Test with date filter
    const today = new Date("2025-09-08");
    const countToday = await prisma.earningsTickersToday.count({
      where: { reportDate: today },
    });
    console.log(`Earnings records for 2025-09-08: ${countToday}`);

    // Test market data
    const marketCount = await prisma.todayEarningsMovements.count({
      where: { reportDate: today },
    });
    console.log(`Market data records for 2025-09-08: ${marketCount}`);

    // Test guidance data
    const guidanceCount = await prisma.benzingaGuidance.count();
    console.log(`Total guidance records: ${guidanceCount}`);
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDb();

