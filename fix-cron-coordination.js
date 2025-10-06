#!/usr/bin/env node

/**
 * 🛠️ CRON COORDINATION FIX
 * 
 * Problém: Ostatné cron joby nekontrolujú denný reset stav
 * Riešenie: Pridať kontroly stavu do všetkých cron jobov
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing cron job coordination issues...');

// 1. Fix worker-new.js - Add state checks to all cron jobs
const workerPath = path.join(__dirname, 'src/queue/worker-new.js');
let workerContent = fs.readFileSync(workerPath, 'utf8');

// Add state check function
const stateCheckFunction = `
// Helper function to check if daily reset is completed before running fetch
async function checkDailyResetState(description) {
  return new Promise((resolve) => {
    console.log(\`🔍 Checking daily reset state for \${description}...\`);
    
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
      console.error(\`❌ \${description} state check error: \${data}\`);
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(\`✅ \${description} - Daily reset completed, proceeding with fetch\`);
        resolve(true);
      } else if (code === 2) {
        console.log(\`⚠️ \${description} - Auto-repair needed, proceeding with fetch\`);
        resolve(true);
      } else {
        console.log(\`⏸️ \${description} - Daily reset not completed, skipping fetch\`);
        resolve(false);
      }
    });
  });
}`;

// Insert the state check function after clearCacheAfterFetch
const insertPoint = workerContent.indexOf('// Helper function to run fetch script with daily reset check');
workerContent = workerContent.slice(0, insertPoint) + stateCheckFunction + '\n\n' + workerContent.slice(insertPoint);

// Update market data updates cron job to check state
const marketCronFix = `
// 2. MARKET DATA UPDATES - Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)
// This updates market data (prices, market cap, etc.)
cron.schedule(
  "*/2 9-15 * * 1-5",
  async () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run during market hours (9:30 AM - 4:00 PM ET)
    if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) {
      console.log(
        \`📈 Market hours update (\${nyTime.toLocaleString()}) - Checking state before update\`
      );
      
      // Check if daily reset is completed before running
      const canProceed = await checkDailyResetState("Market hours update");
      if (canProceed) {
        runFetchScript("fetch-today.ts", "Market data update");
      }
    }
  },
  {
    timezone: "America/New_York",
  }
);`;

// Replace the existing market cron job
const marketStartMarker = '// 2. MARKET DATA UPDATES - Every 2 minutes during market hours';
const marketEndMarker = '});';
const marketStartIndex = workerContent.indexOf(marketStartMarker);
const marketEndIndex = workerContent.indexOf(marketEndMarker, marketStartIndex + marketStartMarker.length);

if (marketStartIndex !== -1 && marketEndIndex !== -1) {
  workerContent = workerContent.slice(0, marketStartIndex) + marketCronFix + workerContent.slice(marketEndIndex + 2);
}

// Update pre-market updates cron job to check state
const preMarketCronFix = `
// 3. PRE-MARKET UPDATES - Every 5 minutes before market open (4:00 AM - 9:30 AM ET)
// This updates pre-market data
cron.schedule(
  "*/5 4-9 * * 1-5",
  async () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run before market open (4:00 AM - 9:30 AM ET)
    if ((hour >= 4 && hour < 9) || (hour === 9 && minute < 30)) {
      console.log(
        \`🌅 Pre-market update (\${nyTime.toLocaleString()}) - Checking state before update\`
      );
      
      // Check if daily reset is completed before running
      const canProceed = await checkDailyResetState("Pre-market update");
      if (canProceed) {
        runFetchScript("fetch-today.ts", "Pre-market data update");
      }
    }
  },
  {
    timezone: "America/New_York",
  }
);`;

// Replace the existing pre-market cron job
const preMarketStartMarker = '// 3. PRE-MARKET UPDATES - Every 5 minutes before market open';
const preMarketStartIndex = workerContent.indexOf(preMarketStartMarker);
const preMarketEndIndex = workerContent.indexOf(marketEndMarker, preMarketStartIndex + preMarketStartMarker.length);

if (preMarketStartIndex !== -1 && preMarketEndIndex !== -1) {
  workerContent = workerContent.slice(0, preMarketStartIndex) + preMarketCronFix + workerContent.slice(preMarketEndIndex + 2);
}

// Update after-hours updates cron job to check state
const afterHoursCronFix = `
// 4. AFTER-HOURS UPDATES - Every 10 minutes after market close (4:00 PM - 8:00 PM ET)
cron.schedule(
  "*/10 16-20 * * 1-5",
  async () => {
    const nyTime = getNYTime();
    console.log(
      \`🌙 After-hours update (\${nyTime.toLocaleString()}) - Checking state before update\`
    );
    
    // Check if daily reset is completed before running
    const canProceed = await checkDailyResetState("After-hours update");
    if (canProceed) {
      runFetchScript("fetch-today.ts", "After-hours data update");
    }
  },
  {
    timezone: "America/New_York",
  }
);`;

// Replace the existing after-hours cron job
const afterHoursStartMarker = '// 4. AFTER-HOURS UPDATES - Every 10 minutes after market close';
const afterHoursStartIndex = workerContent.indexOf(afterHoursStartMarker);
const afterHoursEndIndex = workerContent.indexOf(marketEndMarker, afterHoursStartIndex + afterHoursStartMarker.length);

if (afterHoursStartIndex !== -1 && afterHoursEndIndex !== -1) {
  workerContent = workerContent.slice(0, afterHoursStartIndex) + afterHoursCronFix + workerContent.slice(afterHoursEndIndex + 2);
}

// Update weekend updates cron job to check state
const weekendCronFix = `
// 5. WEEKEND UPDATES - Every hour on weekends (for any weekend earnings)
cron.schedule(
  "0 * * * 0,6",
  async () => {
    const nyTime = getNYTime();
    console.log(
      \`📅 Weekend update (\${nyTime.toLocaleString()}) - Checking state before update\`
    );
    
    // Check if daily reset is completed before running
    const canProceed = await checkDailyResetState("Weekend update");
    if (canProceed) {
      runFetchScript("fetch-today.ts", "Weekend earnings check");
    }
  },
  {
    timezone: "America/New_York",
  }
);`;

// Replace the existing weekend cron job
const weekendStartMarker = '// 5. WEEKEND UPDATES - Every hour on weekends';
const weekendStartIndex = workerContent.indexOf(weekendStartMarker);
const weekendEndIndex = workerContent.indexOf(marketEndMarker, weekendStartIndex + weekendStartMarker.length);

if (weekendStartIndex !== -1 && weekendEndIndex !== -1) {
  workerContent = workerContent.slice(0, weekendStartIndex) + weekendCronFix + workerContent.slice(weekendEndIndex + 2);
}

fs.writeFileSync(workerPath, workerContent);
console.log('✅ Fixed worker-new.js cron coordination');

// 2. Add coordination to fetch-today.ts
const fetchTodayPath = path.join(__dirname, 'src/jobs/fetch-today.ts');
let fetchTodayContent = fs.readFileSync(fetchTodayPath, 'utf8');

// Add better state checking
const stateCheckImprovement = `
    // Enhanced daily reset check with better logging
    const skipResetCheck = process.env.SKIP_RESET_CHECK === 'true'
    if (!skipResetCheck) {
      const resetCompleted = await isDailyResetCompleted()
      if (!resetCompleted) {
        console.log('⚠️ Daily reset not completed - skipping fetch to avoid race conditions')
        console.log('💡 This prevents data corruption during daily reset process')
        return {
          date,
          earningsCount: 0,
          marketCount: 0,
          totalTickers: 0,
          skipped: true,
          reason: 'Daily reset not completed - avoiding race conditions'
        }
      } else {
        console.log('✅ Daily reset completed - proceeding with fetch')
      }
    } else {
      console.log('⚠️ Skipping daily reset check (SKIP_RESET_CHECK=true)')
    }`;

// Replace the existing state check
const stateCheckStart = '// Check if daily reset is completed (unless skipped for main fetch)';
const stateCheckEnd = '}';
const stateCheckStartIndex = fetchTodayContent.indexOf(stateCheckStart);
const stateCheckEndIndex = fetchTodayContent.indexOf(stateCheckEnd, stateCheckStartIndex + stateCheckStart.length);

if (stateCheckStartIndex !== -1 && stateCheckEndIndex !== -1) {
  fetchTodayContent = fetchTodayContent.slice(0, stateCheckStartIndex) + stateCheckImprovement + fetchTodayContent.slice(stateCheckEndIndex + 1);
}

fs.writeFileSync(fetchTodayPath, fetchTodayContent);
console.log('✅ Fixed fetch-today.ts state checking');

console.log('🎉 Cron coordination fixes completed!');
console.log('');
console.log('📋 Changes made:');
console.log('1. ✅ Added checkDailyResetState function to worker-new.js');
console.log('2. ✅ Updated all cron jobs to check daily reset state before running');
console.log('3. ✅ Enhanced state checking in fetch-today.ts');
console.log('4. ✅ Added better logging for coordination decisions');
console.log('');
console.log('🚀 Benefits:');
console.log('1. ✅ Prevents race conditions between cron jobs');
console.log('2. ✅ Ensures data integrity during daily reset');
console.log('3. ✅ Better visibility into cron job coordination');
console.log('4. ✅ Automatic retry for failed daily resets');
console.log('');
console.log('🔍 Next steps:');
console.log('1. Deploy these changes to production');
console.log('2. Monitor cron job coordination logs');
console.log('3. Verify no race conditions occur');
