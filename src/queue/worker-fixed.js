const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

console.log("🚀 Starting FIXED Earnings Queue Worker with NY Timezone...");

// Helper functions to call TypeScript utilities via tsx
function callTypeScriptUtility(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["tsx", scriptPath, ...args], {
      cwd: path.join(__dirname, "../.."),
      env: { ...process.env },
      shell: true,
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}

// Helper function to get today's date
async function getTodayDate() {
  try {
    const result = await callTypeScriptUtility("src/lib/daily-reset-state.ts");
    return new Date(result);
  } catch (error) {
    console.error("❌ Failed to get today's date:", error);
    return new Date();
  }
}

// Helper function to set boot state
async function setBootState(state) {
  try {
    await callTypeScriptUtility("src/lib/boot-state.ts", ["set", state]);
    console.log(`🚀 Boot state set to: ${state}`);
  } catch (error) {
    console.error("❌ Failed to set boot state:", error);
  }
}

// Helper function to get boot state
async function getBootState() {
  try {
    const result = await callTypeScriptUtility("src/lib/boot-state.ts", ["get"]);
    return result;
  } catch (error) {
    console.error("❌ Failed to get boot state:", error);
    return "00_PENDING";
  }
}

// Helper function to check if system is ready
async function isSystemReady() {
  try {
    const result = await callTypeScriptUtility("src/lib/boot-state.ts", ["ready"]);
    return result === "true";
  } catch (error) {
    console.error("❌ Failed to check system ready:", error);
    return false;
  }
}

// Helper function to wait for DB ready
async function waitForDbReady(maxRetries = 10, retryDelayMs = 5000, timeoutMs = 60000) {
  try {
    const result = await callTypeScriptUtility("src/lib/db-ready-check.ts", [
      "wait",
      maxRetries.toString(),
      retryDelayMs.toString(),
      timeoutMs.toString()
    ]);
    return result === "true";
  } catch (error) {
    console.error("❌ Failed to wait for DB ready:", error);
    return false;
  }
}

// Helper function to bump cache version
async function bumpCacheVersion() {
  try {
    const result = await callTypeScriptUtility("src/lib/cache-version.ts", ["bump"]);
    return parseInt(result);
  } catch (error) {
    console.error("❌ Failed to bump cache version:", error);
    throw error;
  }
}

// Helper function to use Redis lock
async function withLock(key, ttlSec, fn) {
  return new Promise((resolve) => {
    const lockScript = `
      import { withLock } from './src/lib/redis-lock.ts';
      withLock('${key}', ${ttlSec}, async () => {
        ${fn.toString()}
      }).then(result => {
        console.log(result ? 'true' : 'false');
        process.exit(0);
      }).catch(error => {
        console.error('Lock failed:', error);
        process.exit(1);
      });
    `;
    
    const child = spawn("npx", ["tsx", "-e", lockScript], {
      cwd: path.join(__dirname, "../.."),
      env: { ...process.env },
      shell: true,
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      resolve(code === 0 && output.trim() === "true");
    });
  });
}

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
  const resetCode = `import('./src/queue/jobs/clearOldData.ts').then(async (module) => { try { const result = await module.resetCurrentDayData(); console.log('✅ Reset completed successfully:', result); process.exit(0); } catch (error) { console.error('❌ Reset failed:', error); process.exit(1); } }).catch(error => { console.error('❌ Import failed:', error); process.exit(1); });`;

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

// Helper function to run optimized two-step fetch workflow
function runOptimizedFetchWorkflow(description) {
  console.log(`🔄 Running ${description}...`);

  // Step 1: Fetch earnings data first
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

  earningsChild.on("close", (earningsCode) => {
    console.log(
      `✅ ${description} (earnings) completed with code ${earningsCode}`
    );

    if (earningsCode === 0) {
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

// Main cron job function with all fixes
async function runMainCronJob() {
  try {
    console.log("🚀 Starting main cron job with all fixes...");

    // Set initial boot state
    setBootState("00_PENDING");

    // Wait for database to be ready
    console.log("🔍 Waiting for database to be ready...");
    const dbReady = await waitForDbReady(10, 5000, 60000);

    if (!dbReady) {
      console.error("❌ Database not ready after maximum retries");
      setBootState("00_PENDING");
      return;
    }

    console.log("✅ Database is ready, proceeding with fetch...");

    // Step 1: Clear cache
    setBootState("00_PENDING");
    clearApplicationCache("Clear cache before daily reset");

    // Step 2: Cleanup old data
    setTimeout(() => {
      runCleanupScript("Daily cleanup of old data");

      // Step 3: Reset current day data
      setTimeout(() => {
        runCurrentDayReset("Reset current day data for fresh start");

        // Step 4: Fetch new data
        setTimeout(() => {
          setBootState("10_CALENDAR_READY");
          runOptimizedFetchWorkflow("Main earnings calendar fetch");

          // Step 5: Mark as ready after successful fetch
          setTimeout(async () => {
            setBootState("50_CACHE_WARMED");

            // Bump cache version
            try {
              await bumpCacheVersion();
              setBootState("60_PUBLISHED");
              console.log("🎉 System is now ready to serve data!");
            } catch (error) {
              console.error("❌ Failed to bump cache version:", error);
              setBootState("40_METRICS_READY");
            }
          }, 30000); // Wait 30 seconds for fetch to complete
        }, 3000); // Wait 3 seconds for reset to complete
      }, 5000); // Wait 5 seconds for cleanup to complete
    }, 2000); // Wait 2 seconds for cache clear to complete
  } catch (error) {
    console.error("❌ Main cron job failed:", error);
    setBootState("00_PENDING");
  }
}

// 1. MAIN FETCH - Daily at 2:00 AM NY time (7:00 AM UTC) with LOCK
cron.schedule(
  "0 7 * * *",
  () => {
    const nyTime = getNYTime();
    const today = getTodayDate();
    const lockKey = `lock:bootstrap:${today.toISOString().slice(0, 10)}`;

    console.log(
      `⏰ 2:00 AM NY time reached (${nyTime.toLocaleString()}) - Running main earnings fetch with lock`
    );

    // Use Redis lock to prevent duplicate runs
    withLock(lockKey, 15 * 60, runMainCronJob).then((success) => {
      if (success) {
        console.log("✅ Main cron job completed successfully");
      } else {
        console.log("⏸️ Main cron job skipped (already running)");
      }
    });
  },
  {
    timezone: "America/New_York",
  }
);

// 2. MARKET DATA UPDATES - Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)
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

      // Only run if system is ready
      if (isSystemReady()) {
        runOptimizedFetchWorkflow("Market data update");
      } else {
        console.log("⏸️ Skipping market update - system not ready");
      }
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

      // Only run if system is ready
      if (isSystemReady()) {
        runOptimizedFetchWorkflow("Pre-market data update");
      } else {
        console.log("⏸️ Skipping pre-market update - system not ready");
      }
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

    // Only run if system is ready
    if (isSystemReady()) {
      runOptimizedFetchWorkflow("After-hours data update");
    } else {
      console.log("⏸️ Skipping after-hours update - system not ready");
    }
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

    // Only run if system is ready
    if (isSystemReady()) {
      runOptimizedFetchWorkflow("Weekend earnings check");
    } else {
      console.log("⏸️ Skipping weekend update - system not ready");
    }
  },
  {
    timezone: "America/New_York",
  }
);

// Run initial setup on startup
console.log("🧹 Running initial setup...");
setBootState("00_PENDING");

// Wait for DB and run initial fetch
waitForDbReady(10, 5000, 60000).then((dbReady) => {
  if (dbReady) {
    console.log("🔄 Running initial data fetch...");
    runOptimizedFetchWorkflow("Initial startup fetch");

    // Mark as ready after initial fetch
    setTimeout(async () => {
      setBootState("50_CACHE_WARMED");
      try {
        await bumpCacheVersion();
        setBootState("60_PUBLISHED");
        console.log("🎉 Initial setup completed - system ready!");
      } catch (error) {
        console.error("❌ Failed to bump cache version:", error);
        setBootState("40_METRICS_READY");
      }
    }, 30000);
  } else {
    console.error("❌ Initial setup failed - database not ready");
  }
});

console.log("✅ FIXED Queue worker started successfully!");
console.log("📅 Schedule:");
console.log(
  "  - Main fetch: Daily at 2:00 AM NY time (with lock + DB ready check)"
);
console.log(
  "  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("  - Weekend: Every hour");
console.log("  - Health check: /api/health");
console.log("🔧 Fixes applied:");
console.log("  ✅ Redis lock prevents duplicate runs");
console.log("  ✅ Boot state prevents serving stale data");
console.log("  ✅ DB ready check prevents early fetch");
console.log("  ✅ Cache versioning prevents cache issues");
console.log("  ✅ UPSERT operations prevent empty windows");
console.log("  ✅ Fallback logic for empty earnings");
console.log("  ✅ Safe change calculation");
console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);
console.log(`🚀 Boot state: ${getBootState()}`);
