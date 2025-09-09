// Check dates in database
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDates() {
  try {
    console.log("📅 Checking dates in database...");

    // Check earnings dates
    const earningsDates = await prisma.earningsTickersToday.groupBy({
      by: ["reportDate"],
      _count: { ticker: true },
      orderBy: { reportDate: "desc" },
    });

    console.log("📊 Earnings dates:");
    earningsDates.forEach((date) => {
      console.log(
        `   ${date.reportDate.toISOString().split("T")[0]}: ${
          date._count.ticker
        } records`
      );
    });

    // Check market dates
    const marketDates = await prisma.todayEarningsMovements.groupBy({
      by: ["reportDate"],
      _count: { ticker: true },
      orderBy: { reportDate: "desc" },
    });

    console.log("📈 Market dates:");
    marketDates.forEach((date) => {
      console.log(
        `   ${date.reportDate.toISOString().split("T")[0]}: ${
          date._count.ticker
        } records`
      );
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
