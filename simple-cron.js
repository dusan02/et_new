// Simple cron worker - runs fetch-data-now.js every 2 minutes
const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

console.log("🚀 Starting Simple Cron Worker...");
console.log("=================================");
console.log("📅 Schedule: Every 2 minutes");
console.log("🔄 Script: fetch-data-now.js");
console.log("");

// Run initial fetch
console.log("🔄 Running initial data fetch...");
runFetchScript();

// Schedule every 2 minutes
cron.schedule("*/2 * * * *", () => {
  console.log("⏰ 2 minutes passed - fetching data...");
  runFetchScript();
});

function runFetchScript() {
  const scriptPath = path.join(__dirname, "fetch-data-now.js");

  const child = spawn("node", [scriptPath], {
    cwd: __dirname,
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  });

  child.stdout.on("data", (data) => {
    console.log(`📊 ${data.toString().trim()}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${data.toString().trim()}`);
  });

  child.on("close", (code) => {
    console.log(`✅ Fetch completed with code ${code}`);
    console.log("⏳ Waiting for next run...\n");
  });
}

console.log("✅ Cron worker started!");
console.log("🕐 Current time:", new Date().toLocaleString());
console.log("⏳ Waiting for next run...\n");
