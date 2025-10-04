#!/usr/bin/env node

/**
 * Manual script to reset current day data
 * Usage: node scripts/reset-current-day.js
 *
 * This script clears all earnings and market data for today,
 * allowing for a fresh start when the cron job isn't working properly.
 */

const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

console.log("🔄 Manual Current Day Reset Script");
console.log("==================================");

// Helper function to get NY time
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);
console.log("⚠️  This will delete ALL earnings and market data for today!");
console.log("⚠️  Make sure this is what you want to do.");
console.log("");

// Run the reset script
console.log("🔄 Running current day reset...");

const resetScript = path.join(__dirname, "../src/queue/jobs/clearOldData.ts");
const child = spawn("npx", ["tsx", resetScript, "reset"], {
  cwd: path.join(__dirname, ".."),
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL,
  },
  shell: true,
});

child.stdout.on("data", (data) => {
  console.log(`📊 Reset output: ${data}`);
});

child.stderr.on("data", (data) => {
  console.error(`❌ Reset error: ${data}`);
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("✅ Current day reset completed successfully!");
    console.log("🔄 You can now run the fetch script to get fresh data:");
    console.log("   npx tsx src/jobs/fetch-today.ts");
  } else {
    console.error(`❌ Reset failed with code ${code}`);
  }
  process.exit(code);
});
