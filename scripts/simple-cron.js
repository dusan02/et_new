const cron = require("node-cron");
const { exec } = require("child_process");

console.log("🕐 Starting cron job scheduler...");
console.log("📅 Will fetch data every 30 minutes");

// Run every 30 minutes
cron.schedule("*/30 * * * *", () => {
  console.log("\n⏰ [CRON] Running scheduled data fetch...");
  console.log(`📅 Time: ${new Date().toISOString()}`);

  exec("npm run fetch", (error, stdout, stderr) => {
    if (error) {
      console.error("❌ [CRON] Error:", error);
      return;
    }
    if (stderr) {
      console.error("⚠️ [CRON] Stderr:", stderr);
    }
    console.log("✅ [CRON] Data fetch completed");
    console.log(stdout);
  });
});

// Also run immediately on startup
console.log("🚀 Running initial data fetch...");
exec("npm run fetch", (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Initial fetch error:", error);
  } else {
    console.log("✅ Initial data fetch completed");
    console.log(stdout);
  }
});

console.log("✅ Cron scheduler started successfully");
console.log("🌐 Your app is running at http://localhost:3000");
console.log("📊 Data will be refreshed every 30 minutes");
