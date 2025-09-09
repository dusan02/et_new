// Test script to verify timezone logic
const {
  getNYDate,
  getNYTimeString,
  isMarketHours,
  getNextMarketOpen,
} = require("./src/lib/dates.ts");

console.log("=== TIMEZONE TEST ===");
console.log("Current NY time:", getNYTimeString());
console.log("Is market hours:", isMarketHours());
console.log("Next market open:", getNextMarketOpen().toLocaleString());

// Test cron schedule parsing
const cron = require("node-cron");

console.log("\n=== CRON SCHEDULE TEST ===");
console.log("Testing cron expressions:");

// Test main fetch (2:00 AM NY = 7:00 AM UTC)
const mainFetchValid = cron.validate("0 7 * * *");
console.log(
  "Main fetch (0 7 * * *):",
  mainFetchValid ? "✅ Valid" : "❌ Invalid"
);

// Test market updates (every 2 minutes 9-15)
const marketUpdatesValid = cron.validate("*/2 9-15 * * 1-5");
console.log(
  "Market updates (*/2 9-15 * * 1-5):",
  marketUpdatesValid ? "✅ Valid" : "❌ Invalid"
);

// Test pre-market (every 5 minutes 4-9)
const preMarketValid = cron.validate("*/5 4-9 * * 1-5");
console.log(
  "Pre-market (*/5 4-9 * * 1-5):",
  preMarketValid ? "✅ Valid" : "❌ Invalid"
);

// Test after-hours (every 10 minutes 16-20)
const afterHoursValid = cron.validate("*/10 16-20 * * 1-5");
console.log(
  "After-hours (*/10 16-20 * * 1-5):",
  afterHoursValid ? "✅ Valid" : "❌ Invalid"
);

// Test weekend (every hour)
const weekendValid = cron.validate("0 * * * 0,6");
console.log("Weekend (0 * * * 0,6):", weekendValid ? "✅ Valid" : "❌ Invalid");

console.log("\n=== SCHEDULE SUMMARY ===");
console.log("📅 Main fetch: Daily at 2:00 AM NY time (7:00 AM UTC)");
console.log(
  "📈 Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)"
);
console.log("🌅 Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("🌙 After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("📅 Weekend: Every hour");
