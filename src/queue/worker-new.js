const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

console.log("🚀 Starting Earnings Queue Worker with NY Timezone...");

// Helper function to get NY time
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

// Helper function to run cleanup script
function runCleanupScript(description) {
  console.log(`🧹 Running ${description}...`);

  const cleanupScript = path.join(__dirname, "jobs", "clearOldData.ts");
  const child = spawn("npx", ["tsx", cleanupScript], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  });

  child.stdout.on("data", (data) => {
    console.log(`🧹 ${description} output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${description} error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ ${description} completed with code ${code}`);
  });
}

// Helper function to run current day reset script
function runCurrentDayReset(description) {
  console.log(`🔄 Running ${description}...`);

  const resetScript = path.join(__dirname, "jobs", "clearOldData.ts");
  const resetCode = `import('./src/queue/jobs/clearOldData.js').then(async (module) => { try { const result = await module.resetCurrentDayData(); console.log('✅ Reset completed successfully:', result); process.exit(0); } catch (error) { console.error('❌ Reset failed:', error); process.exit(1); } }).catch(error => { console.error('❌ Import failed:', error); process.exit(1); });`;

  const child = spawn("npx", ["tsx", "-e", resetCode], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    shell: true,
  });

  child.stdout.on("data", (data) => {
    console.log(`🔄 ${description} output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${description} error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ ${description} completed with code ${code}`);
  });
}

// Helper function to clear application cache
function clearApplicationCache(description) {
  console.log(`🧹 Running ${description}...`);

  const child = spawn(
    "curl",
    ["-X", "POST", "http://localhost:3000/api/earnings/clear-cache"],
    {
      shell: true,
    }
  );

  child.stdout.on("data", (data) => {
    console.log(`🧹 ${description} output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${description} error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ ${description} completed with code ${code}`);
  });
}

// Helper function to run fetch script with daily reset check
function runFetchScript(scriptName, description, skipResetCheck = false) {
  console.log(`🔄 Running ${description}...`);

  const fetchScript = path.join(__dirname, "../jobs", scriptName);
  const child = spawn("npx", ["tsx", fetchScript], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      POLYGON_API_KEY: process.env.POLYGON_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      SKIP_RESET_CHECK: skipResetCheck ? "true" : "false",
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

// Helper function to run optimized two-step fetch workflow
function runOptimizedFetchWorkflow(description) {
  console.log(`🎯 Running ${description} (optimized workflow)...`);

  // Step 1: Fetch earnings only
  console.log(`📊 Step 1: Fetching earnings data...`);
  const earningsScript = path.join(
    __dirname,
    "../jobs",
    "fetch-earnings-only.ts"
  );
  const earningsChild = spawn("npx", ["tsx", earningsScript], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      SKIP_RESET_CHECK: "true", // Skip reset check for optimized workflow
    },
    shell: true,
  });

  earningsChild.stdout.on("data", (data) => {
    console.log(`📊 ${description} (earnings) output: ${data}`);
  });

  earningsChild.stderr.on("data", (data) => {
    console.error(`❌ ${description} (earnings) error: ${data}`);
  });

  earningsChild.on("close", (code) => {
    console.log(`✅ ${description} (earnings) completed with code ${code}`);

    if (code === 0) {
      // Step 2: Fetch market data for tickers with earnings
      console.log(
        `📈 Step 2: Fetching market data for tickers with earnings...`
      );
      const marketScript = path.join(
        __dirname,
        "../jobs",
        "fetch-market-data-filtered.ts"
      );
      const marketChild = spawn("npx", ["tsx", marketScript], {
        cwd: path.join(__dirname, "../.."),
        env: {
          ...process.env,
          POLYGON_API_KEY: process.env.POLYGON_API_KEY,
          DATABASE_URL: process.env.DATABASE_URL,
        },
        shell: true,
      });

      marketChild.stdout.on("data", (data) => {
        console.log(`📈 ${description} (market) output: ${data}`);
      });

      marketChild.stderr.on("data", (data) => {
        console.error(`❌ ${description} (market) error: ${data}`);
      });

      marketChild.on("close", (marketCode) => {
        console.log(
          `✅ ${description} (market) completed with code ${marketCode}`
        );
        console.log(`🎉 ${description} (optimized workflow) completed!`);
      });
    } else {
      console.error(
        `❌ ${description} (earnings) failed, skipping market data fetch`
      );
    }
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

    // Wrap main cron job in audit wrapper
    runMainCronJob();
  },
  {
    timezone: "America/New_York",
  }
);

// Main cron job function with audit wrapper
async function runMainCronJob() {
  try {
    // First clear cache, then cleanup old data, then reset current day, then fetch new data
    clearApplicationCache("Clear cache before daily reset");
    setTimeout(() => {
      runCleanupScript("Daily cleanup of old data");
      setTimeout(() => {
        runCurrentDayReset("Reset current day data for fresh start");
        setTimeout(() => {
          runOptimizedFetchWorkflow("Main earnings calendar fetch"); // Use optimized two-step workflow
        }, 3000); // Wait 3 seconds for reset to complete
      }, 5000); // Wait 5 seconds for cleanup to complete
    }, 2000); // Wait 2 seconds for cache clear to complete
  } catch (error) {
    console.error("❌ Main cron job failed:", error);
  }
}

// Auto-repair job function
async function runAutoRepairJob() {
  try {
    console.log("🔧 Checking if auto-repair is needed...");

    // Check daily reset state using a simple script
    const checkScript = path.join(__dirname, "jobs", "checkDailyState.ts");
    const child = spawn("npx", ["tsx", checkScript], {
      cwd: path.join(__dirname, "../.."),
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      shell: true,
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      console.error(`❌ Auto-repair check error: ${data}`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log("🔧 Auto-repair check completed");
        console.log("Output:", output);

        // If state is RESET_DONE but not FETCH_DONE, retry fetch
        if (output.includes("RESET_DONE") && !output.includes("FETCH_DONE")) {
          console.log("🔧 Auto-repair needed - retrying fetch...");
          runFetchScript("fetch-today.ts", "Auto-repair fetch retry", true);
        } else {
          console.log("✅ Auto-repair not needed - system is healthy");
        }
      } else {
        console.error(`❌ Auto-repair check failed with code ${code}`);
      }
    });
  } catch (error) {
    console.error("❌ Auto-repair job failed:", error);
  }
}

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

// 6. AUTO-REPAIR MICRO-JOBS - Retry failed fetches
// Runs at 2:05, 2:10, 2:15 AM to retry if initial fetch failed
cron.schedule(
  "5,10,15 7 * * *",
  () => {
    const nyTime = getNYTime();
    console.log(
      `🔧 Auto-repair check - Retrying failed fetch if needed (${nyTime.toLocaleString()})`
    );
    runAutoRepairJob();
  },
  {
    timezone: "America/New_York",
  }
);

// Run initial cleanup and fetch on startup
console.log("🧹 Running initial cleanup...");
runCleanupScript("Initial startup cleanup");
setTimeout(() => {
  console.log("🔄 Running initial current day reset...");
  runCurrentDayReset("Initial startup reset");
  setTimeout(() => {
    console.log("🔄 Running initial data fetch...");
    runOptimizedFetchWorkflow("Initial startup fetch");
  }, 3000); // Wait 3 seconds for reset to complete
}, 5000); // Wait 5 seconds for cleanup to complete

console.log("✅ Queue worker started successfully!");
console.log("📅 Schedule:");
console.log("  - Main fetch: Daily at 2:00 AM NY time (with cleanup)");
console.log(
  "  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("  - Weekend: Every hour");
console.log("  - Cleanup: Before main fetch and on startup");
console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);
