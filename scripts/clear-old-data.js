// Clear old data script
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearOldData() {
  try {
    console.log("🧹 Clearing old data...");

    // Get today's date in NY timezone
    function getNYDate() {
      return new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      );
    }

    function getTodayStart() {
      const today = getNYDate();
      return new Date(today.getFullYear(), today.getMonth(), today.getDate());
    }

    const today = getTodayStart();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    console.log("📅 Today:", today.toISOString().split("T")[0]);
    console.log("📅 Yesterday:", yesterday.toISOString().split("T")[0]);

    // Clear yesterday's data
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: { reportDate: yesterday },
    });

    const deletedMarket = await prisma.todayEarningsMovements.deleteMany({
      where: { reportDate: yesterday },
    });

    console.log("✅ Deleted:");
    console.log(`   - Earnings: ${deletedEarnings.count} records`);
    console.log(`   - Market: ${deletedMarket.count} records`);

    // Show current data counts
    const todayEarnings = await prisma.earningsTickersToday.count({
      where: { reportDate: today },
    });

    const todayMarket = await prisma.todayEarningsMovements.count({
      where: { reportDate: today },
    });

    console.log("📊 Current data:");
    console.log(`   - Today's earnings: ${todayEarnings} records`);
    console.log(`   - Today's market: ${todayMarket} records`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearOldData();
