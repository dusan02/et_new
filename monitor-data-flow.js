// Monitoring script for data flow analysis
const {
  getNYDate,
  getNYTimeString,
  isMarketHours,
} = require("./src/lib/dates.ts");

console.log("🔍 DATA FLOW MONITORING");
console.log("========================");
console.log(`🕐 Current NY time: ${getNYTimeString()}`);
console.log(`📈 Market hours: ${isMarketHours() ? "OPEN" : "CLOSED"}`);
console.log("");

// Test API endpoints
async function testAPI() {
  try {
    console.log("🧪 Testing API endpoints...");

    // Test earnings API
    const earningsResponse = await fetch("http://localhost:3000/api/earnings");
    const earningsData = await earningsResponse.json();

    console.log("📊 Earnings API:");
    console.log(`  Status: ${earningsResponse.status}`);
    console.log(`  Data count: ${earningsData.data?.length || 0}`);
    console.log(`  Cached: ${earningsData.meta?.cached || false}`);
    console.log(`  Duration: ${earningsData.meta?.duration || "N/A"}`);
    console.log(`  Date: ${earningsData.meta?.date || "N/A"}`);

    // Test stats API
    const statsResponse = await fetch(
      "http://localhost:3000/api/earnings/stats"
    );
    const statsData = await statsResponse.json();

    console.log("📈 Stats API:");
    console.log(`  Status: ${statsResponse.status}`);
    console.log(`  Total earnings: ${statsData.totalEarnings || 0}`);
    console.log(`  With EPS: ${statsData.withEps || 0}`);
    console.log(`  With Revenue: ${statsData.withRevenue || 0}`);
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
}

// Test database connection
async function testDatabase() {
  try {
    console.log("🗄️ Testing database connection...");

    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    // Test basic query
    const count = await prisma.earningsTickersToday.count();
    console.log(`  Earnings records: ${count}`);

    const marketCount = await prisma.todayEarningsMovements.count();
    console.log(`  Market records: ${marketCount}`);

    const guidanceCount = await prisma.benzingaGuidance.count();
    console.log(`  Guidance records: ${guidanceCount}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
  }
}

// Main monitoring function
async function monitor() {
  console.log("🚀 Starting data flow monitoring...\n");

  await testDatabase();
  console.log("");

  await testAPI();
  console.log("");

  console.log("✅ Monitoring complete!");
  console.log("");
  console.log("💡 TIPS:");
  console.log("  - Check if new worker is running: cd src/queue && npm start");
  console.log("  - Monitor logs in terminal for API calls");
  console.log("  - Check cache hit/miss ratio in API responses");
  console.log("  - Verify NY timezone is working correctly");
}

// Run monitoring
monitor().catch(console.error);
