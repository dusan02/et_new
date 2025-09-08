const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config();

console.log("🚀 Starting Earnings Queue Worker...");

// Schedule data fetching every minute
cron.schedule("* * * * *", () => {
  console.log("⏰ Running scheduled data fetch...");

  const fetchScript = path.join(__dirname, "../jobs/fetch-today.ts");
  const child = spawn("node", ["-e", `require('tsx/cjs')('${fetchScript}')`], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  });

  child.stdout.on("data", (data) => {
    console.log(`📊 Data fetch output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ Data fetch error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ Data fetch completed with code ${code}`);
  });
});

// Also run immediately on startup
console.log("🔄 Running initial data fetch...");
const initialFetch = spawn(
  "node",
  [
    "-e",
    `require('tsx/cjs')('${path.join(__dirname, "../jobs/fetch-today.ts")}')`,
  ],
  {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  }
);

initialFetch.stdout.on("data", (data) => {
  console.log(`📊 Initial fetch output: ${data}`);
});

initialFetch.stderr.on("data", (data) => {
  console.error(`❌ Initial fetch error: ${data}`);
});

initialFetch.on("close", (code) => {
  console.log(`✅ Initial fetch completed with code ${code}`);
});

console.log("✅ Queue worker started successfully!");
console.log("📅 Data will be fetched every minute");
