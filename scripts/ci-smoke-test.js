#!/usr/bin/env node

/**
 * 🧪 CI Smoke Test
 * Zlyhá release, ak API nevráti dnešné dáta
 */

const https = require("https");
const http = require("http");

async function smokeTest() {
  console.log("🧪 Starting CI smoke test...");

  const url =
    process.env.API_URL ||
    "http://localhost:3000/api/earnings?nocache=1&ts=" + Date.now();

  try {
    const response = await fetch(url);
    const body = await response.json();

    const count = body.meta?.total || 0;
    const date = body.meta?.date || "unknown";

    console.log(`📊 API returned ${count} items for date: ${date}`);

    if (count < 1) {
      console.error("❌ [CI-SMOKE] FAILED: API returned 0 items");
      console.error(
        "💡 This means the pipeline is broken - no earnings data available"
      );
      process.exit(1);
    }

    console.log("✅ [CI-SMOKE] PASSED: API returned data");
    console.log(
      `📋 Sample tickers: ${
        body.data
          ?.slice(0, 3)
          .map((x) => x.ticker)
          .join(", ") || "none"
      }`
    );
  } catch (error) {
    console.error("❌ [CI-SMOKE] FAILED: API request failed:", error.message);
    process.exit(1);
  }
}

smokeTest();
