// Clean database script - remove all old data
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function cleanDatabase() {
  try {
    console.log("🧹 Cleaning database...");

    // Get today's date in NY timezone
    function getNYDate() {
      return new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
      );
    }

    function getTodayStart() {
      const today = getNYDate();
      // Create date string in YYYY-MM-DD format for NY timezone
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;
      return new Date(dateString + "T00:00:00.000Z");
    }

    const today = getTodayStart();
    console.log("📅 Today:", today.toISOString().split("T")[0]);

    // Delete ALL data first
    console.log("🗑️ Deleting all earnings data...");
    const deletedAllEarnings = await prisma.earningsTickersToday.deleteMany({});

    console.log("🗑️ Deleting all market data...");
    const deletedAllMarket = await prisma.todayEarningsMovements.deleteMany({});

    console.log("✅ Deleted:");
    console.log(`   - Earnings: ${deletedAllEarnings.count} records`);
    console.log(`   - Market: ${deletedAllMarket.count} records`);

    console.log(
      "🎉 Database cleaned! Now run fetch-data-now.js to get fresh data."
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
