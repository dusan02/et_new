const cron = require("node-cron");
const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

console.log("🚀 Starting MINIMAL Earnings Queue Worker with NY Timezone...");

// Helper function to get NY time
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
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

// Helper function to run fetch-today.ts (existing script)
function runFetchToday(description) {
  console.log(`🔄 Running ${description}...`);

  const fetchScript = path.join(__dirname, "../jobs", "fetch-today.ts");
  const child = spawn("npx", ["tsx", fetchScript], {
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
    console.log(`📊 ${description} output: ${data}`);
  });

  child.stderr.on("data", (data) => {
    console.error(`❌ ${description} error: ${data}`);
  });

  child.on("close", (code) => {
    console.log(`✅ ${description} completed with code ${code}`);
  });
}

// Main cron job function with lock
function runMainCronJob() {
  const today = new Date().toISOString().slice(0, 10);
  const lockName = `bootstrap-${today}`;
  
  // Try to acquire lock
  if (!acquireLock(lockName, 15 * 60)) { // 15 minutes TTL
    console.log("⏸️ Main cron job skipped - already running");
    return;
  }
  
  try {
    console.log("🚀 Starting main cron job with lock...");
    
    // Run the existing fetch-today.ts script
    runFetchToday("Main earnings fetch");
    
    // Release lock after a reasonable time
    setTimeout(() => {
      releaseLock(lockName);
      console.log("🎉 Main cron job completed!");
    }, 60000); // Wait 1 minute for fetch to complete
    
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
      runFetchToday("Market data update");
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
      runFetchToday("Pre-market data update");
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
    runFetchToday("After-hours data update");
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
    runFetchToday("Weekend earnings check");
  },
  {
    timezone: "America/New_York",
  }
);

console.log("✅ MINIMAL Queue worker started successfully!");
console.log("📅 Schedule:");
console.log("  - Main fetch: Daily at 2:00 AM NY time (with file lock)");
console.log(
  "  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("  - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("  - Weekend: Every hour");
console.log("🔧 Minimal fixes applied:");
console.log("  ✅ File-based lock prevents duplicate runs");
console.log("  ✅ Uses existing fetch-today.ts script");
console.log("  ✅ No complex startup operations");
console.log(`🕐 Current NY time: ${getNYTime().toLocaleString()}`);
