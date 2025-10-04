# DETAILED CRON JOB ANALYSIS REPORT

## 🚨 CRITICAL ISSUES IDENTIFIED

### 1. **MAIN PROBLEM: Incorrect Data Loading Logic**

- **Current Behavior**: API loads OLD data when no data exists for today
- **Evidence**: `[API] Found latest data for: 2025-10-01` (83 records from October 1st)
- **Expected Behavior**: Should show EMPTY table when no data for today

### 2. **CLEANUP LOGIC FLAW**

- **Current**: Cleanup only resets "today" but doesn't prevent loading old data
- **Problem**: API falls back to "latest available data" which can be days/weeks old
- **Result**: Users see stale data from previous days

---

## 📋 CURRENT CRON JOB CONFIGURATION

### **File**: `src/queue/worker-new.js`

#### **1. MAIN FETCH - Daily Reset (2:00 AM NY)**

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

**Schedule**: `0 7 * * *` (Daily at 7:00 AM UTC = 2:00 AM NY)
**Purpose**: Complete daily reset and fresh data load
**Sequence**: Cleanup → Reset → Fetch
**Timing**: 5s + 3s delays between operations

#### **2. MARKET DATA UPDATES - Real-time (9:30 AM - 4:00 PM ET)**

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

**Schedule**: `*/2 9-15 * * 1-5` (Every 2 minutes, 9-15 hours, Mon-Fri)
**Purpose**: Real-time market data updates during trading hours
**Condition**: Only during market hours (9:30 AM - 4:00 PM ET)
**Frequency**: 2-minute intervals

#### **3. PRE-MARKET UPDATES - Early Morning (4:00 AM - 9:30 AM ET)**

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

**Schedule**: `*/5 4-9 * * 1-5` (Every 5 minutes, 4-9 hours, Mon-Fri)
**Purpose**: Pre-market data updates before trading begins
**Condition**: Only before market open (4:00 AM - 9:30 AM ET)
**Frequency**: 5-minute intervals

#### **4. AFTER-HOURS UPDATES - Evening (4:00 PM - 8:00 PM ET)**

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

**Schedule**: `*/10 16-20 * * 1-5` (Every 10 minutes, 16-20 hours, Mon-Fri)
**Purpose**: After-hours trading data updates
**Time Range**: 4:00 PM - 8:00 PM ET (after market close)
**Frequency**: 10-minute intervals

#### **5. WEEKEND UPDATES - Weekend Monitoring**

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

**Schedule**: `0 * * * 0,6` (Every hour on weekends)
**Purpose**: Monitor for any weekend earnings announcements
**Frequency**: Hourly checks for weekend activity

---

## 🔧 HELPER FUNCTIONS ANALYSIS

### **1. `runCleanupScript(description)`**

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

### **2. `runCurrentDayReset(description)`**

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

### **3. `runFetchScript(scriptName, description)`**

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

## 🗄️ CLEANUP SCRIPT ANALYSIS

### **File**: `src/queue/jobs/clearOldData.ts`

#### **1. `resetCurrentDayData()` Function**

```typescript
export async function resetCurrentDayData() {
  try {
    console.log("🔄 Starting reset of current day data...");

    // Get today's date in NY timezone (as UTC date)
    const now = new Date();
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const today = new Date(
      Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate())
    );

    console.log(`🗑️ Resetting all data for ${today.toISOString()}`);
    console.log(`🕐 NY time: ${nyTime.toLocaleString()}`);

    // Reset current day earnings data
    const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: today,
        },
      },
    });

    // Reset current day market data
    const resetTodayMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          gte: today,
        },
      },
    });

    console.log("✅ Current day reset completed successfully!");
    console.log(`📊 Reset records:`);
    console.log(`   - Today's earnings: ${resetTodayEarnings.count}`);
    console.log(`   - Today's market data: ${resetTodayMarket.count}`);

    return {
      success: true,
      reset: {
        earnings: resetTodayEarnings.count,
        market: resetTodayMarket.count,
      },
    };
  } catch (error) {
    console.error("❌ Error during current day reset:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

**Purpose**: Clears all data for current day (today)
**Timezone**: Uses NY timezone for date calculation
**Database Operations**: Deletes earnings and market data for today
**Return**: Success status and count of deleted records

#### **2. `clearOldData()` Function**

```typescript
export async function clearOldData() {
  try {
    console.log("🧹 Starting cleanup of old data...");

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep only last 7 days

    // Get today's date in NY timezone for current day reset (as UTC date)
    const now = new Date();
    const nyTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const today = new Date(
      Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate())
    );

    console.log(`🗑️ Removing data older than ${cutoffDate.toISOString()}`);
    console.log(`🔄 Resetting current day data for ${today.toISOString()}`);
    console.log(`🕐 NY time: ${nyTime.toLocaleString()}`);

    // 1. Clean up old earnings data (older than 7 days)
    const deletedEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate,
        },
      },
    });

    // 2. Clean up old market data (older than 7 days)
    const deletedMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          lt: cutoffDate,
        },
      },
    });

    // 3. Reset current day data to ensure fresh start
    const resetTodayEarnings = await prisma.earningsTickersToday.deleteMany({
      where: {
        reportDate: {
          gte: today,
        },
      },
    });

    const resetTodayMarket = await prisma.todayEarningsMovements.deleteMany({
      where: {
        reportDate: {
          gte: today,
        },
      },
    });

    console.log("✅ Cleanup completed successfully!");
    console.log(`📊 Deleted records:`);
    console.log(`   - Old earnings: ${deletedEarnings.count}`);
    console.log(`   - Old market data: ${deletedMarket.count}`);
    console.log(`   - Reset today's earnings: ${resetTodayEarnings.count}`);
    console.log(`   - Reset today's market data: ${resetTodayMarket.count}`);

    return {
      success: true,
      deleted: {
        oldEarnings: deletedEarnings.count,
        oldMarket: deletedMarket.count,
        resetTodayEarnings: resetTodayEarnings.count,
        resetTodayMarket: resetTodayMarket.count,
      },
    };
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

**Purpose**: Comprehensive cleanup - removes old data AND resets current day
**Operations**:

1. Remove data older than 7 days
2. Reset current day data
3. Log all operations with counts

---

## 🚨 CRITICAL LOGICAL ERRORS IDENTIFIED

### **ERROR 1: API Fallback Logic**

**Location**: `src/app/api/earnings/route.ts`
**Problem**: When no data exists for today, API falls back to "latest available data"
**Evidence**:

```
[API] No data for 2025-10-04, looking for latest available data...
[API] Found latest data for: 2025-10-01
```

**Current Logic**:

```typescript
// If no data for today, find latest available data
if (todayData.length === 0) {
  const latestData = await prisma.earningsTickersToday.findFirst({
    orderBy: { reportDate: "desc" },
  });
  // Returns OLD data from previous days
}
```

**Expected Logic**:

```typescript
// If no data for today, return empty array
if (todayData.length === 0) {
  return []; // Don't fall back to old data
}
```

### **ERROR 2: Cron Job Timing Issues**

**Problem**: Multiple cron jobs can run simultaneously and interfere with each other
**Evidence**:

- Main fetch runs at 2:00 AM
- Pre-market updates start at 4:00 AM
- Market updates start at 9:30 AM
- All use the same `fetch-today.ts` script

**Risk**: Race conditions between cleanup and fetch operations

### **ERROR 3: Incomplete Daily Reset**

**Problem**: Only the main cron job (2:00 AM) does full reset, but other cron jobs don't
**Evidence**:

- Pre-market, market, and after-hours cron jobs only do `runFetchScript()`
- They don't check if daily reset was completed
- They can insert data into "dirty" database state

### **ERROR 4: Cache Invalidation Issues**

**Problem**: Cache is not properly invalidated after cleanup
**Evidence**:

- Cache clearing happens after fetch, not before
- Old cached data can persist even after database cleanup

---

## 📊 DATA FLOW ANALYSIS

### **Current (BROKEN) Flow**:

```
1. 2:00 AM: Cleanup → Reset → Fetch (NEW data)
2. 4:00 AM: Fetch (can insert into clean DB)
3. 9:30 AM: Fetch (can insert into clean DB)
4. 4:00 PM: Fetch (can insert into clean DB)
5. User visits: API finds no data for today → Falls back to OLD data
```

### **Expected (CORRECT) Flow**:

```
1. 2:00 AM: Cleanup → Reset → Fetch (NEW data)
2. 4:00 AM: Fetch (updates existing data)
3. 9:30 AM: Fetch (updates existing data)
4. 4:00 PM: Fetch (updates existing data)
5. User visits: API finds data for today → Returns TODAY's data
```

---

## 🔧 REQUIRED FIXES

### **FIX 1: Remove API Fallback Logic**

**File**: `src/app/api/earnings/route.ts`
**Action**: Remove the fallback to "latest available data"
**Code**: Return empty array when no data for today

### **FIX 2: Add Daily Reset Flag**

**Action**: Add a database flag to track if daily reset was completed
**Purpose**: Prevent other cron jobs from running before daily reset

### **FIX 3: Fix Cache Invalidation Order**

**Action**: Clear cache BEFORE cleanup, not after
**Purpose**: Ensure fresh data is loaded after cleanup

### **FIX 4: Add Cron Job Coordination**

**Action**: Add checks to ensure daily reset completed before other operations
**Purpose**: Prevent race conditions

### **FIX 5: Improve Error Handling**

**Action**: Add proper error handling for failed cleanup operations
**Purpose**: Ensure system recovers from failures

---

## 📈 MONITORING & DEBUGGING

### **Key Log Messages to Monitor**:

```
🚀 Starting Earnings Queue Worker with NY Timezone...
⏰ 2:00 AM NY time reached - Running main earnings fetch
🧹 Running Daily cleanup of old data...
🔄 Running Reset current day data for fresh start...
📊 Running Main earnings calendar fetch...
✅ Queue worker started successfully!
```

### **Error Indicators**:

- **Missing 2:00 AM logs**: Main fetch not running
- **Cleanup errors**: Database connection issues
- **Reset errors**: Database permission issues
- **Fetch errors**: API key or network issues
- **API fallback logs**: System loading old data instead of today's data

---

## 🎯 CONCLUSION

The cron job system has **fundamental logical flaws** that cause it to display stale data instead of fresh daily data. The main issues are:

1. **API fallback logic** loads old data when no data exists for today
2. **Incomplete daily reset** allows old data to persist
3. **Cache invalidation timing** issues
4. **Lack of coordination** between different cron jobs

**Immediate Action Required**: Fix the API fallback logic to return empty data instead of old data when no data exists for today.
