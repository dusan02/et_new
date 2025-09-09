// 🚫 DISABLED - This worker is replaced by worker-new.js
// worker-new.js has intelligent scheduling based on market hours

console.log("🚫 simple-cron.js is DISABLED");
console.log(
  "✅ Use worker-new.js instead - it has intelligent market hours scheduling"
);
console.log("📅 worker-new.js schedule:");
console.log("   - Daily fetch: 2:00 AM NY time");
console.log("   - Market hours: Every 2 minutes (9:30 AM - 4:00 PM ET)");
console.log("   - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)");
console.log("   - After-hours: Every 10 minutes (4:00 PM - 8:00 PM ET)");
console.log("   - Weekend: Every hour");

// Exit gracefully
process.exit(0);
