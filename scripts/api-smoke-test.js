#!/usr/bin/env node

/**
 * API Smoke Test - Quick health check for earnings API
 * Tests for data quality and basic functionality
 */

// Use built-in fetch in Node.js 18+
const fetch = globalThis.fetch || require("node-fetch");

async function runSmokeTest() {
  try {
    console.log("🧪 Running API smoke test...");

    const response = await fetch("http://localhost:3000/api/earnings");

    if (!response.ok) {
      throw new Error(
        `API returned ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(`API returned error status: ${data.status}`);
    }

    const earnings = data.data || [];
    console.log(`📊 Found ${earnings.length} earnings records`);

    // Test 1: Check for insane revenue values
    const insaneRevenue = earnings.filter(
      (item) =>
        (item.revenueActual && item.revenueActual > 1e12) ||
        (item.revenueEstimate && item.revenueEstimate > 1e12)
    );

    if (insaneRevenue.length > 0) {
      console.error(
        `❌ Found ${insaneRevenue.length} records with insane revenue values:`
      );
      insaneRevenue.forEach((item) => {
        console.error(
          `  ${item.ticker}: actual=${item.revenueActual}, estimate=${item.revenueEstimate}`
        );
      });
    } else {
      console.log("✅ No insane revenue values found");
    }

    // Test 2: Check for price data availability
    const withPrices = earnings.filter(
      (item) => item.currentPrice != null && item.previousClose != null
    );

    console.log(
      `📈 ${withPrices.length}/${earnings.length} records have price data`
    );

    // Test 3: Check for extreme price changes
    const extremeChanges = earnings.filter(
      (item) =>
        item.priceChangePercent && Math.abs(item.priceChangePercent) > 50
    );

    if (extremeChanges.length > 0) {
      console.warn(
        `⚠️  Found ${extremeChanges.length} records with extreme price changes:`
      );
      extremeChanges.forEach((item) => {
        console.warn(
          `  ${item.ticker}: ${item.priceChangePercent?.toFixed(2)}%`
        );
      });
    } else {
      console.log("✅ No extreme price changes found");
    }

    // Test 4: Check data structure
    const requiredFields = ["ticker", "companyName", "reportTime"];
    const missingFields = earnings.filter((item) =>
      requiredFields.some((field) => !item[field])
    );

    if (missingFields.length > 0) {
      console.error(
        `❌ Found ${missingFields.length} records with missing required fields`
      );
    } else {
      console.log("✅ All records have required fields");
    }

    // Test 5: Check for BigInt serialization issues
    const hasBigIntIssues = earnings.some(
      (item) =>
        typeof item.revenueActual === "bigint" ||
        typeof item.revenueEstimate === "bigint"
    );

    if (hasBigIntIssues) {
      console.error(
        "❌ Found BigInt values in API response - serialization issue!"
      );
    } else {
      console.log("✅ No BigInt serialization issues");
    }

    // Summary
    const issues = [
      insaneRevenue.length > 0 ? "insane revenue" : null,
      extremeChanges.length > 0 ? "extreme price changes" : null,
      missingFields.length > 0 ? "missing fields" : null,
      hasBigIntIssues ? "BigInt issues" : null,
    ].filter(Boolean);

    if (issues.length === 0) {
      console.log("\n🎉 All smoke tests passed! API is healthy.");
      return { success: true, issues: [] };
    } else {
      console.log(`\n⚠️  Found issues: ${issues.join(", ")}`);
      return { success: false, issues };
    }
  } catch (error) {
    console.error("❌ Smoke test failed:", error.message);
    return { success: false, error: error.message };
  }
}

// Run if called directly
if (require.main === module) {
  runSmokeTest()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Smoke test crashed:", error);
      process.exit(1);
    });
}

module.exports = { runSmokeTest };
