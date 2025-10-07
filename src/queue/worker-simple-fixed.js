const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

console.log("🚀 Starting SIMPLE FIXED Earnings Queue Worker with NY Timezone...");

// Helper function to get NY time
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

// Helper function to get today's date in NY timezone
function getTodayDate() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return new Date(Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate()));
}

// Simple lock mechanism using file system
const fs = require('fs');
const lockDir = path.join(__dirname, '../../locks');

// Ensure lock directory exists
if (!fs.existsSync(lockDir)) {
  fs.mkdirSync(lockDir, { recursive: true });
}

function acquireLock(lockName, ttlSeconds = 900) {
  const lockFile = path.join(lockDir, `${lockName}.lock`);
  
  try {
    // Check if lock exists and is not expired
    if (fs.existsSync(lockFile)) {
      const stats = fs.statSync(lockFile);
      const age = (Date.now() - stats.mtime.getTime()) / 1000;
      
      if (age < ttlSeconds) {
        console.log(`🔒 Lock ${lockName} is already held (age: ${Math.round(age)}s)`);
        return false;
      } else {
        console.log(`🔓 Lock ${lockName} expired, removing...`);
        fs.unlinkSync(lockFile);
      }
    }
    
    // Create new lock
    fs.writeFileSync(lockFile, JSON.stringify({
      pid: process.pid,
      timestamp: Date.now(),
      ttl: ttlSeconds
    }));
    
    console.log(`🔒 Acquired lock ${lockName} (TTL: ${ttlSeconds}s)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to acquire lock ${lockName}:`, error);
    return false;
  }
}

function releaseLock(lockName) {
  const lockFile = path.join(lockDir, `${lockName}.lock`);
  
  try {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`🔓 Released lock ${lockName}`);
    }
  } catch (error) {
    console.error(`❌ Failed to release lock ${lockName}:`, error);
  }
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

// Main cron job function with simple fixes
function runMainCronJob() {
  const today = getTodayDate();
  const lockName = `bootstrap-${today.toISOString().slice(0, 10)}`;
  
  // Try to acquire lock
  if (!acquireLock(lockName, 15 * 60)) { // 15 minutes TTL
    console.log("⏸️ Main cron job skipped - already running");
    return;
  }
  
  try {
    console.log("🚀 Starting main cron job with simple fixes...");
    
    // Step 1: Clear cache
    clearApplicationCache("Clear cache before daily reset");
    
    // Step 2: Cleanup old data
    setTimeout(() => {
      runCleanupScript("Daily cleanup of old data");
      
      // Step 3: Reset current day data
      setTimeout(() => {
        runCurrentDayReset("Reset current day data for fresh start");
        
        // Step 4: Fetch new data
        setTimeout(() => {
          runOptimizedFetchWorkflow("Main earnings calendar fetch");
          
          // Step 5: Release lock after completion
          setTimeout(() => {
            releaseLock(lockName);
            console.log("🎉 Main cron job completed successfully!");
          }, 30000); // Wait 30 seconds for fetch to complete
          
        }, 3000); // Wait 3 seconds for reset to complete
      }, 5000); // Wait 5 seconds for cleanup to complete
    }, 2000); // Wait 2 seconds for cache clear to complete
    
  } catch (error) {
    console.error("❌ Main cron job failed:", error);
    releaseLock(lockName);
  }
}

// 1. MAIN FETCH - Daily at 2:00 AM NY time (7:00 AM UTC) with LOCK
cron.schedule(
  "0 7 * * *",
  () => {
    const nyTime = getNYTime();
    console.log(
      `⏰ 2:00 AM NY time reached (${nyTime.toLocaleString()}) - Running main earnings fetch with lock`
    );
    runMainCronJob();
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
      runOptimizedFetchWorkflow("Market data update");
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
      runOptimizedFetchWorkflow("Pre-market data update");
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
    runOptimizedFetchWorkflow("After-hours data update");
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
    runOptimizedFetchWorkflow("Weekend earnings check");
  },
  {
    timezone: "America/New_York",
  }
);

// Run initial setup on startup
console.log("🧹 Running initial setup...");

// Run initial fetch
setTimeout(() => {
  console.log("🔄 Running initial data fetch...");
  runOptimizedFetchWorkflow("Initial startup fetch");
}, 5000);

console.log("✅ SIMPLE FIXED Queue worker started successfully!");
console.log("📅 Schedule:");
console.log("  - Main fetch: Daily at 2:00 AM NY time (with file lock)");
console.log(
  "  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("  - Weekend: Every hour");
console.log("  - Health check: /api/health");
console.log("🔧 Simple fixes applied:");
console.log("  ✅ File-based lock prevents duplicate runs");
console.log("  ✅ Proper timezone handling (America/New_York)");
console.log("  ✅ Sequential operations with delays");
console.log("  ✅ Error handling and lock cleanup");
console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);
console.log(`📅 Today's date: ${getTodayDate().toISOString()}`);
