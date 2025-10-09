#!/usr/bin/env node

/**
 * Incident Response Script
 * Automated troubleshooting for common production issues
 */

import { config } from "dotenv";
import { execSync } from "child_process";

// Load environment variables
config();

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function makeRequest(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function diagnoseIssue() {
  console.log("🔍 Diagnosing issue...\n");

  // Check health
  const health = await makeRequest("/api/health");
  if (!health.success) {
    console.log("❌ Application is down - checking PM2 status");
    execSync("pm2 status", { stdio: "inherit" });
    return "app_down";
  }

  // Check DQ
  const dq = await makeRequest("/api/dq");
  if (!dq.success) {
    console.log("❌ DQ endpoint failed");
    return "dq_failed";
  }

  const { coverage, thresholds } = dq.data;
  console.log(
    `📊 Current coverage: price=${coverage.price}%, epsRev=${coverage.epsRev}%`
  );
  console.log(
    `📊 Thresholds: price=${thresholds.price}%, epsRev=${thresholds.epsRev}%\n`
  );

  // Check meta
  const meta = await makeRequest("/api/earnings/meta");
  if (!meta.success) {
    console.log("❌ Meta endpoint failed");
    return "meta_failed";
  }

  const { publishedAt, day } = meta.data;
  const today = new Date().toISOString().split("T")[0];
  const publishedTime = new Date(publishedAt);
  const ageMinutes = Math.floor(
    (Date.now() - publishedTime.getTime()) / (1000 * 60)
  );

  console.log(`📈 Published: ${day} (${ageMinutes} minutes ago)`);

  // Determine issue type
  if (day !== today) {
    console.log("⚠️  Issue: Published data is not for today");
    return "stale_data";
  }

  if (ageMinutes > 60) {
    console.log("⚠️  Issue: Published data is too old");
    return "stale_data";
  }

  if (coverage.price < thresholds.price) {
    console.log("⚠️  Issue: Price coverage too low");
    return "price_coverage_low";
  }

  if (coverage.epsRev < thresholds.epsRev) {
    console.log("⚠️  Issue: EPS/REV coverage too low");
    return "epsrev_coverage_low";
  }

  console.log("✅ No issues detected");
  return "no_issue";
}

async function fixAppDown() {
  console.log("\n🔧 Fixing application down...");

  console.log("1. Checking PM2 status...");
  execSync("pm2 status", { stdio: "inherit" });

  console.log("\n2. Restarting all processes...");
  execSync("pm2 restart all", { stdio: "inherit" });

  console.log("\n3. Waiting 10 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log("4. Checking health again...");
  const health = await makeRequest("/api/health");
  if (health.success) {
    console.log("✅ Application is back online");
  } else {
    console.log("❌ Application still down - check logs: pm2 logs");
  }
}

async function fixStaleData() {
  console.log("\n🔧 Fixing stale data...");

  console.log("1. Processing prices...");
  try {
    execSync("npm run process:prices", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ Price processing failed");
  }

  console.log("\n2. Processing EPS/REV...");
  try {
    execSync("npm run process:epsrev", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ EPS/REV processing failed");
  }

  console.log("\n3. Attempting publish...");
  try {
    execSync("npm run publish:attempt", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ Publish attempt failed");
  }

  console.log("\n4. Checking results...");
  const meta = await makeRequest("/api/earnings/meta");
  if (meta.success) {
    const { publishedAt } = meta.data;
    const publishedTime = new Date(publishedAt);
    const ageMinutes = Math.floor(
      (Date.now() - publishedTime.getTime()) / (1000 * 60)
    );
    console.log(`✅ Data refreshed: ${ageMinutes} minutes ago`);
  }
}

async function fixPriceCoverage() {
  console.log("\n🔧 Fixing price coverage...");

  console.log("1. Processing prices with fresh data...");
  try {
    execSync("npm run process:prices", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ Price processing failed");
  }

  console.log("\n2. Attempting publish...");
  try {
    execSync("npm run publish:attempt", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ Publish attempt failed");
  }
}

async function fixEpsRevCoverage() {
  console.log("\n🔧 Fixing EPS/REV coverage...");

  console.log("1. Processing EPS/REV with backfill...");
  try {
    execSync("npm run process:epsrev -- --mode=backfill", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ EPS/REV processing failed");
  }

  console.log("\n2. Attempting publish...");
  try {
    execSync("npm run publish:attempt", { stdio: "inherit" });
  } catch (error) {
    console.log("❌ Publish attempt failed");
  }
}

async function rollback() {
  console.log("\n🔄 Attempting rollback...");

  try {
    execSync("npm run rollback:prod", { stdio: "inherit" });
    console.log("✅ Rollback completed");
  } catch (error) {
    console.log("❌ Rollback failed:", error.message);
  }
}

async function main() {
  console.log("🚨 Incident Response - Automated Troubleshooting\n");

  const issue = await diagnoseIssue();

  switch (issue) {
    case "app_down":
      await fixAppDown();
      break;
    case "stale_data":
      await fixStaleData();
      break;
    case "price_coverage_low":
      await fixPriceCoverage();
      break;
    case "epsrev_coverage_low":
      await fixEpsRevCoverage();
      break;
    case "no_issue":
      console.log("✅ No action needed");
      break;
    default:
      console.log("❌ Unknown issue - manual intervention required");
  }

  console.log("\n📋 Post-fix verification:");
  const dq = await makeRequest("/api/dq");
  if (dq.success) {
    const { coverage, passes } = dq.data;
    console.log(
      `   Coverage: price=${coverage.price}%, epsRev=${coverage.epsRev}%`
    );
    console.log(`   DQ Gate: ${passes ? "PASSED" : "FAILED"}`);
  }

  console.log("\n💡 If issues persist:");
  console.log("   • Check logs: pm2 logs --lines 100");
  console.log("   • Manual rollback: npm run rollback:prod");
  console.log(
    "   • Restart workers: pm2 restart earnings-watchdog earnings-scheduler"
  );
}

main().catch((error) => {
  console.error("❌ Incident response failed:", error);
  process.exit(1);
});
