const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

console.log("🚀 Starting Simple Cron Worker with NY Timezone...");

// Helper function to get NY time
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

// Helper function to run fetch script
function runFetchScript(scriptName, description) {
  console.log(`🔄 Running ${description}...`);

  const fetchScript = path.join(__dirname, "..", "src", "jobs", scriptName);
  const child = spawn("npx", ["tsx", fetchScript], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  });

  child.stdout.on("data", (data) => {
    console.log(`📊 ${description} output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${description} error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ ${description} completed with code ${code}`);
  });
}

// 1. MAIN FETCH - Daily at 2:00 AM NY time (7:00 AM UTC)
// This fetches the earnings calendar for the day
cron.schedule(
  "0 7 * * *",
  () => {
    const nyTime = getNYTime();
    console.log(
      `⏰ 2:00 AM NY time reached (${nyTime.toLocaleString()}) - Running main earnings fetch`
    );
    runFetchScript("fetch-today.ts", "Main earnings calendar fetch");
  },
  {
    timezone: "America/New_York",
  }
);

// 2. MARKET DATA UPDATES - Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)
// This updates market data (prices, market cap, etc.)
cron.schedule(
  "*/2 9-15 * * 1-5",
  () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run during market hours (9:30 AM - 4:00 PM ET)
    if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) {
      console.log(
        `📈 Market hours update (${nyTime.toLocaleString()}) - Updating market data`
      );
      runFetchScript("fetch-today.ts", "Market data update");
    }
  },
  {
    timezone: "America/New_York",
  }
);

// 3. PRE-MARKET UPDATES - Every 5 minutes before market open (4:00 AM - 9:30 AM ET)
cron.schedule(
  "*/5 4-9 * * 1-5",
  () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run before market open (4:00 AM - 9:30 AM ET)
    if ((hour >= 4 && hour < 9) || (hour === 9 && minute < 30)) {
      console.log(
        `🌅 Pre-market update (${nyTime.toLocaleString()}) - Updating pre-market data`
      );
      runFetchScript("fetch-today.ts", "Pre-market data update");
    }
  },
  {
    timezone: "America/New_York",
  }
);

// 4. AFTER-HOURS UPDATES - Every 10 minutes after market close (4:00 PM - 8:00 PM ET)
cron.schedule(
  "*/10 16-20 * * 1-5",
  () => {
    const nyTime = getNYTime();
    console.log(
      `🌙 After-hours update (${nyTime.toLocaleString()}) - Updating after-hours data`
    );
    runFetchScript("fetch-today.ts", "After-hours data update");
  },
  {
    timezone: "America/New_York",
  }
);

// 5. WEEKEND UPDATES - Every hour on weekends (for any weekend earnings)
cron.schedule(
  "0 * * * 0,6",
  () => {
    const nyTime = getNYTime();
    console.log(
      `📅 Weekend update (${nyTime.toLocaleString()}) - Checking for weekend earnings`
    );
    runFetchScript("fetch-today.ts", "Weekend earnings check");
  },
  {
    timezone: "America/New_York",
  }
);

// Run initial fetch on startup
console.log("🔄 Running initial data fetch...");
runFetchScript("fetch-today.ts", "Initial startup fetch");

console.log("✅ Simple cron worker started successfully!");
console.log("📅 Schedule:");
console.log("  - Main fetch: Daily at 2:00 AM NY time");
console.log(
  "  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("  - Weekend: Every hour");
console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);

// Keep the process running
process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});
