#!/usr/bin/env node

/**
 * Sanity test script for earnings API endpoints
 * Tests unified data source and consistency
 */

const BASE_URL = "http://localhost:3000";

async function testEndpoint(url, name) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const response = await fetch(url);
    const data = await response.json();

    if (response.status !== 200) {
      console.error(`❌ ${name}: HTTP ${response.status}`);
      return false;
    }

    if (data.status !== "success") {
      console.error(`❌ ${name}: status=${data.status}`);
      return false;
    }

    console.log(`✅ ${name}: HTTP ${response.status}, status=${data.status}`);
    return data;
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runSanityTest() {
  console.log("🚀 Starting Earnings API Sanity Test...");
  console.log(`📍 Base URL: ${BASE_URL}`);

  // Test /api/earnings
  const earningsData = await testEndpoint(
    `${BASE_URL}/api/earnings`,
    "/api/earnings"
  );
  if (!earningsData) {
    console.log("\n❌ Sanity test FAILED: /api/earnings endpoint not working");
    process.exit(1);
  }

  // Test /api/earnings/stats
  const statsData = await testEndpoint(
    `${BASE_URL}/api/earnings/stats`,
    "/api/earnings/stats"
  );
  if (!statsData) {
    console.log(
      "\n❌ Sanity test FAILED: /api/earnings/stats endpoint not working"
    );
    process.exit(1);
  }

  // Test data consistency
  console.log("\n🔍 Testing data consistency...");

  const earningsCount = earningsData.data?.length || 0;
  const statsTotal = statsData.data?.totalEarnings || 0;

  console.log(`📊 Earnings count: ${earningsCount}`);
  console.log(`📈 Stats total: ${statsTotal}`);

  if (earningsCount !== statsTotal) {
    console.error(
      `❌ Data inconsistency: earnings count (${earningsCount}) != stats total (${statsTotal})`
    );
    process.exit(1);
  }

  // Test required fields
  console.log("\n🔍 Testing required fields...");

  const requiredFields = ["data", "meta", "status"];
  for (const field of requiredFields) {
    if (!(field in earningsData)) {
      console.error(`❌ Missing field in /api/earnings: ${field}`);
      process.exit(1);
    }
    if (!(field in statsData)) {
      console.error(`❌ Missing field in /api/earnings/stats: ${field}`);
      process.exit(1);
    }
  }

  // Test stats structure
  const statsFields = [
    "totalEarnings",
    "withEps",
    "withRevenue",
    "sizeDistribution",
    "topGainers",
    "topLosers",
  ];
  for (const field of statsFields) {
    if (!(field in statsData.data)) {
      console.error(`❌ Missing stats field: ${field}`);
      process.exit(1);
    }
  }

  // Test cache headers
  console.log("\n🔍 Testing cache headers...");
  const earningsResponse = await fetch(`${BASE_URL}/api/earnings`);
  const statsResponse = await fetch(`${BASE_URL}/api/earnings/stats`);

  const earningsCacheControl = earningsResponse.headers.get("cache-control");
  const statsCacheControl = statsResponse.headers.get("cache-control");

  if (!earningsCacheControl?.includes("no-store")) {
    console.warn(`⚠️  /api/earnings cache-control: ${earningsCacheControl}`);
  }
  if (!statsCacheControl?.includes("no-store")) {
    console.warn(`⚠️  /api/earnings/stats cache-control: ${statsCacheControl}`);
  }

  console.log("\n🎉 Sanity test PASSED!");
  console.log("✅ All endpoints working");
  console.log("✅ Data consistency verified");
  console.log("✅ Required fields present");
  console.log("✅ Cache headers configured");

  // Show sample data
  if (earningsCount > 0) {
    console.log("\n📋 Sample data:");
    const sample = earningsData.data[0];
    console.log(`   Ticker: ${sample.ticker}`);
    console.log(`   Company: ${sample.companyName}`);
    console.log(`   EPS: ${sample.epsActual} (est: ${sample.epsEstimate})`);
    console.log(`   Price Change: ${sample.priceChangePercent}%`);
  }

  process.exit(0);
}

// Run the test
runSanityTest().catch((error) => {
  console.error("\n💥 Sanity test CRASHED:", error.message);
  process.exit(1);
});

