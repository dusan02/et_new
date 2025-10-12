#!/usr/bin/env node

/**
 * Day-1/2 Smoke Test Script
 * Quick health check for production deployment
 */

import { config } from "dotenv";

// Load environment variables
config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

async function makeRequest(endpoint, description) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ ${description}: OK`);
      return { success: true, data };
    } else {
      console.log(
        `❌ ${description}: ${response.status} - ${
          data.message || "Unknown error"
        }`
      );
      return { success: false, data };
    }
  } catch (error) {
    console.log(`❌ ${description}: Network error - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkHealth() {
  console.log("🏥 Checking application health...");
  const result = await makeRequest("/api/health", "Health check");

  if (result.success) {
    const { services, uptime } = result.data;
    console.log(`   Redis: ${services.redis}`);
    console.log(`   API: ${services.api}`);
    console.log(`   Uptime: ${Math.round(uptime)}s`);
  }

  return result.success;
}

async function checkDQ() {
  console.log("\n📊 Checking data quality...");
  const result = await makeRequest("/api/dq", "DQ status");

  if (result.success) {
    const { coverage, thresholds, passes } = result.data;
    console.log(
      `   Price coverage: ${coverage.price}% (threshold: ${thresholds.price}%)`
    );
    console.log(
      `   EPS/REV coverage: ${coverage.epsRev}% (threshold: ${thresholds.epsRev}%)`
    );
    console.log(`   DQ Gate: ${passes ? "PASSED" : "FAILED"}`);

    if (coverage.price < 98) {
      console.log(
        "   ⚠️  Price coverage below 98% - may need manual intervention"
      );
    }
    if (coverage.epsRev < 90) {
      console.log(
        "   ⚠️  EPS/REV coverage below 90% - may need manual intervention"
      );
    }
  }

  return result.success;
}

async function checkMeta() {
  console.log("\n📈 Checking publish metadata...");
  const result = await makeRequest("/api/earnings/meta", "Publish metadata");

  if (result.success) {
    const { day, publishedAt, coverage, status } = result.data;
    const today = new Date().toISOString().split("T")[0];

    console.log(`   Day: ${day || "N/A"}`);
    console.log(`   Status: ${status || "N/A"}`);
    console.log(`   Published: ${publishedAt || "N/A"}`);
    console.log(
      `   Coverage: price=${coverage?.price || 0}%, epsRev=${
        coverage?.epsRev || 0
      }%`
    );

    if (!day || day !== today) {
      console.log(`   ⚠️  Published data is not for today (${today})`);
      return false;
    }

    if (!publishedAt) {
      console.log(`   ⚠️  No published timestamp available`);
      return false;
    }

    const publishedTime = new Date(publishedAt);
    const ageMinutes = Math.floor(
      (Date.now() - publishedTime.getTime()) / (1000 * 60)
    );

    if (ageMinutes > 60) {
      console.log(`   ⚠️  Published data is ${ageMinutes} minutes old`);
      return false;
    }

    console.log(`   ✅ Published data is fresh (${ageMinutes} minutes old)`);
  }

  return result.success;
}

async function suggestActions(healthOk, dqOk, metaOk) {
  console.log("\n🔧 Suggested actions:");

  if (!healthOk) {
    console.log("   • Check PM2 status: pm2 status");
    console.log("   • Check logs: pm2 logs --lines 50");
    console.log("   • Restart services: pm2 restart all");
  }

  if (!dqOk || !metaOk) {
    console.log("   • Run manual data processing:");
    console.log("     npm run process:prices");
    console.log("     npm run process:epsrev");
    console.log("     npm run publish:attempt");
  }

  if (healthOk && dqOk && metaOk) {
    console.log("   ✅ All systems operational - no action needed");
  }
}

async function main() {
  console.log("🚀 Starting Day-1/2 Smoke Test...\n");

  const healthOk = await checkHealth();
  const dqOk = await checkDQ();
  const metaOk = await checkMeta();

  console.log("\n📋 Summary:");
  console.log(`   Health: ${healthOk ? "✅" : "❌"}`);
  console.log(`   DQ: ${dqOk ? "✅" : "❌"}`);
  console.log(`   Meta: ${metaOk ? "✅" : "❌"}`);

  await suggestActions(healthOk, dqOk, metaOk);

  const allOk = healthOk && dqOk && metaOk;
  console.log(
    `\n${allOk ? "🎉" : "⚠️"} Smoke test ${allOk ? "PASSED" : "FAILED"}`
  );

  process.exit(allOk ? 0 : 1);
}

main().catch((error) => {
  console.error("❌ Smoke test failed:", error);
  process.exit(1);
});
