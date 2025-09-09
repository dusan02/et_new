// Production Cron Worker - runs in Docker container
const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

console.log("🚀 Starting Production Cron Worker...");
console.log("=====================================");
console.log("📅 Schedule: Every 2 minutes");
console.log("🔄 Script: fetch-data-now.js");
console.log("🐳 Environment: Production (Docker)");
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
  const scriptPath = path.join(__dirname, "../../fetch-data-now.js");

  const child = spawn("node", [scriptPath], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: process.env.DATABASE_URL,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
    },
    stdio: ["inherit", "pipe", "pipe"],
  });

  child.stdout.on("data", (data) => {
    console.log(`📊 ${data.toString().trim()}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${data.toString().trim()}`);
  });

  child.on("close", (code) => {
    if (code === 0) {
      console.log(`✅ Fetch completed successfully`);
    } else {
      console.error(`❌ Fetch failed with code ${code}`);
    }
    console.log("⏳ Waiting for next run...\n");
  });

  child.on("error", (error) => {
    console.error(`❌ Failed to start fetch script: ${error.message}`);
  });
}

console.log("✅ Production cron worker started!");
console.log("🕐 Current time:", new Date().toLocaleString());
console.log("⏳ Waiting for next run...\n");

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});
