# Cron Job Behavior Analysis Report

## Overview

This document provides a comprehensive analysis of the earnings table cron job system, including all scheduled tasks, helper functions, and their behaviors.

## System Architecture

### Core Dependencies

```javascript
const cron = require("node-cron"); // Cron job scheduler
const { spawn } = require("child_process"); // Process spawning for scripts
const path = require("path"); // File path utilities
require("dotenv").config(); // Environment variables
```

### Timezone Configuration

- **Primary Timezone**: America/New_York (Eastern Time)
- **All cron jobs** run in NY timezone for market consistency
- **UTC Conversion**: 2:00 AM NY = 7:00 AM UTC

---

## Helper Functions Analysis

### 1. `getNYTime()` - Timezone Utility

```javascript
function getNYTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}
```

**Purpose**: Converts current time to New York timezone
**Usage**: Used in all cron jobs for consistent time logging
**Returns**: Date object in NY timezone

### 2. `runCleanupScript(description)` - Old Data Cleanup

```javascript
function runCleanupScript(description) {
  console.log(`🧹 Running ${description}...`);

  const cleanupScript = path.join(__dirname, "jobs", "clearOldData.ts");
  const child = spawn("npx", ["tsx", cleanupScript], {
    cwd: path.join(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    shell: true,
  });

  // Event handlers for stdout, stderr, and close
}
```

**Purpose**: Removes data older than 7 days from database
**Script**: `src/queue/jobs/clearOldData.ts`
**Function Called**: `clearOldData()`
**Environment**: Passes DATABASE_URL to child process
**Logging**: Captures and logs all output/errors

### 3. `runCurrentDayReset(description)` - Daily Reset

```javascript
function runCurrentDayReset(description) {
  console.log(`🔄 Running ${description}...`);

  const child = spawn(
    "npx",
    [
      "tsx",
      "-e",
      `import('./src/queue/jobs/clearOldData.js').then(async (module) => {
      try {
        const result = await module.resetCurrentDayData();
        console.log('✅ Reset completed successfully:', result);
        process.exit(0);
      } catch (error) {
        console.error('❌ Reset failed:', error);
        process.exit(1);
      }
    }).catch(error => {
      console.error('❌ Import failed:', error);
      process.exit(1);
    });`,
    ],
    {
      /* spawn options */
    }
  );
}
```

**Purpose**: Clears all data for current day (today)
**Script**: `src/queue/jobs/clearOldData.ts`
**Function Called**: `resetCurrentDayData()`
**Error Handling**: Comprehensive try/catch with proper exit codes
**Logging**: Detailed success/failure logging

### 4. `runFetchScript(scriptName, description)` - Data Fetching

```javascript
function runFetchScript(scriptName, description) {
  console.log(`🔄 Running ${description}...`);

  const fetchScript = path.join(__dirname, "../jobs", scriptName);
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
}
```

**Purpose**: Fetches earnings and market data from external APIs
**Script**: `src/jobs/fetch-today.ts`
**Environment**: Passes all required API keys and database URL
**APIs Used**: Finnhub (earnings), Polygon (market data)

---

## Cron Job Schedules Analysis

### 1. MAIN FETCH - Daily Reset & Data Load

```javascript
cron.schedule(
  "0 7 * * *",
  () => {
    // 2:00 AM NY time (7:00 AM UTC)
    const nyTime = getNYTime();
    console.log(`⏰ 2:00 AM NY time reached - Running main earnings fetch`);

    // Sequential execution with delays:
    runCleanupScript("Daily cleanup of old data"); // T+0s
    setTimeout(() => {
      runCurrentDayReset("Reset current day data"); // T+5s
      setTimeout(() => {
        runFetchScript("fetch-today.ts", "Main fetch"); // T+8s
      }, 3000);
    }, 5000);
  },
  { timezone: "America/New_York" }
);
```

**Schedule**: Daily at 2:00 AM NY time
**Purpose**: Complete daily reset and fresh data load
**Sequence**:

1. **T+0s**: Cleanup old data (7+ days)
2. **T+5s**: Reset current day data
3. **T+8s**: Fetch new earnings and market data
   **Critical**: This is the main daily reset that fixes the table issue

### 2. MARKET DATA UPDATES - Real-time Market Hours

```javascript
cron.schedule(
  "*/2 9-15 * * 1-5",
  () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run during market hours (9:30 AM - 4:00 PM ET)
    if ((hour === 9 && minute >= 30) || (hour >= 10 && hour < 16)) {
      console.log(`📈 Market hours update - Updating market data`);
      runFetchScript("fetch-today.ts", "Market data update");
    }
  },
  { timezone: "America/New_York" }
);
```

**Schedule**: Every 2 minutes, 9-15 hours, Monday-Friday
**Purpose**: Real-time market data updates during trading hours
**Condition**: Only runs during actual market hours (9:30 AM - 4:00 PM ET)
**Frequency**: 2-minute intervals for live price updates

### 3. PRE-MARKET UPDATES - Early Morning Data

```javascript
cron.schedule(
  "*/5 4-9 * * 1-5",
  () => {
    const nyTime = getNYTime();
    const hour = nyTime.getHours();
    const minute = nyTime.getMinutes();

    // Only run before market open (4:00 AM - 9:30 AM ET)
    if ((hour >= 4 && hour < 9) || (hour === 9 && minute < 30)) {
      console.log(`🌅 Pre-market update - Updating pre-market data`);
      runFetchScript("fetch-today.ts", "Pre-market data update");
    }
  },
  { timezone: "America/New_York" }
);
```

**Schedule**: Every 5 minutes, 4-9 hours, Monday-Friday
**Purpose**: Pre-market data updates before trading begins
**Condition**: Only runs before market open (4:00 AM - 9:30 AM ET)
**Frequency**: 5-minute intervals for pre-market activity

### 4. AFTER-HOURS UPDATES - Evening Data

```javascript
cron.schedule(
  "*/10 16-20 * * 1-5",
  () => {
    const nyTime = getNYTime();
    console.log(`🌙 After-hours update - Updating after-hours data`);
    runFetchScript("fetch-today.ts", "After-hours data update");
  },
  { timezone: "America/New_York" }
);
```

**Schedule**: Every 10 minutes, 16-20 hours, Monday-Friday
**Purpose**: After-hours trading data updates
**Time Range**: 4:00 PM - 8:00 PM ET (after market close)
**Frequency**: 10-minute intervals for after-hours activity

### 5. WEEKEND UPDATES - Weekend Monitoring

```javascript
cron.schedule(
  "0 * * * 0,6",
  () => {
    const nyTime = getNYTime();
    console.log(`📅 Weekend update - Checking for weekend earnings`);
    runFetchScript("fetch-today.ts", "Weekend earnings check");
  },
  { timezone: "America/New_York" }
);
```

**Schedule**: Every hour on weekends (Saturday & Sunday)
**Purpose**: Monitor for any weekend earnings announcements
**Frequency**: Hourly checks for weekend activity
**Note**: Most earnings are announced during weekdays

---

## Startup Sequence Analysis

### Initial Startup Process

```javascript
// Run initial cleanup and fetch on startup
console.log("🧹 Running initial cleanup...");
runCleanupScript("Initial startup cleanup"); // T+0s
setTimeout(() => {
  console.log("🔄 Running initial current day reset...");
  runCurrentDayReset("Initial startup reset"); // T+5s
  setTimeout(() => {
    console.log("🔄 Running initial data fetch...");
    runFetchScript("fetch-today.ts", "Initial startup fetch"); // T+8s
  }, 3000);
}, 5000);
```

**Purpose**: Ensures clean state when worker starts
**Sequence**: Same as daily main fetch (cleanup → reset → fetch)
**Timing**: 5-second delays between operations
**Critical**: Prevents stale data on worker restart

---

## Data Flow Analysis

### Daily Data Lifecycle

1. **2:00 AM NY**: Complete reset (cleanup + reset + fetch)
2. **4:00-9:30 AM**: Pre-market updates every 5 minutes
3. **9:30 AM-4:00 PM**: Market hours updates every 2 minutes
4. **4:00-8:00 PM**: After-hours updates every 10 minutes
5. **Weekends**: Hourly checks for weekend earnings

### Database Operations

- **Cleanup**: Removes data older than 7 days
- **Reset**: Clears all data for current day
- **Fetch**: Loads fresh earnings and market data
- **Update**: Refreshes market data throughout the day

---

## Error Handling & Logging

### Logging Patterns

- **🧹**: Cleanup operations
- **🔄**: Reset operations
- **📊**: Fetch operations
- **📈**: Market updates
- **🌅**: Pre-market updates
- **🌙**: After-hours updates
- **📅**: Weekend updates
- **⏰**: Time-based triggers
- **✅**: Success operations
- **❌**: Error operations

### Error Handling

- All child processes have stdout/stderr handlers
- Proper exit codes (0 = success, 1 = failure)
- Comprehensive error logging
- Process isolation (failures don't crash main worker)

---

## Performance Considerations

### Timing Optimization

- **Sequential execution** with delays prevents database conflicts
- **5-second delays** allow cleanup operations to complete
- **3-second delays** allow reset operations to complete
- **Market hours filtering** prevents unnecessary API calls

### Resource Management

- **Child process spawning** isolates operations
- **Environment variable passing** ensures proper configuration
- **Shell execution** provides cross-platform compatibility
- **Process cleanup** prevents memory leaks

---

## Monitoring & Debugging

### Key Log Messages to Monitor

```
🚀 Starting Earnings Queue Worker with NY Timezone...
⏰ 2:00 AM NY time reached - Running main earnings fetch
🧹 Running Daily cleanup of old data...
🔄 Running Reset current day data for fresh start...
📊 Running Main earnings calendar fetch...
✅ Queue worker started successfully!
```

### Troubleshooting Indicators

- **Missing 2:00 AM logs**: Main fetch not running
- **Cleanup errors**: Database connection issues
- **Reset errors**: Database permission issues
- **Fetch errors**: API key or network issues
- **Market hours errors**: Timezone configuration issues

---

## Conclusion

The cron job system provides comprehensive coverage of earnings data throughout the trading day with proper error handling, logging, and data lifecycle management. The recent addition of the daily reset functionality ensures fresh data every day, resolving the stale data issue that was occurring previously.
