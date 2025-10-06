#!/usr/bin/env node
/**
 * 🔍 Quick Production Diagnostics
 * Usage: node quick-diagnose.js
 */

require("dotenv").config({ path: ".env.production" });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function diagnose() {
  console.log("====================================");
  console.log("🔍 QUICK PRODUCTION DIAGNOSTICS");
  console.log("====================================\n");

  try {
    // 1. Environment Check
    console.log("📋 I. ENVIRONMENT CHECK");
    console.log("--------------------------------------");
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log(
      "DATABASE_URL:",
      process.env.DATABASE_URL
        ? process.env.DATABASE_URL.substring(0, 40) + "..."
        : "❌ NOT SET"
    );
    console.log("Server Date/Time:", new Date().toISOString());
    console.log("Server Date (ISO):", new Date().toISOString().split("T")[0]);
    console.log(
      "NY Time:",
      new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    console.log("");

    // 2. Database Connection Check
    console.log("📋 II. DATABASE CONNECTION CHECK");
    console.log("--------------------------------------");
    try {
      await prisma.$connect();
      console.log("✅ Database connection successful");
    } catch (error) {
      console.log("❌ Database connection failed:", error.message);
      return;
    }
    console.log("");

    // 3. Today's Date Check
    const todayString = new Date().toISOString().split("T")[0];
    const today = new Date(todayString + "T00:00:00.000Z");
    const tomorrow = new Date(todayString + "T00:00:00.000Z");
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log("📋 III. TODAY'S DATA CHECK");
    console.log("--------------------------------------");
    console.log("Looking for date:", todayString);
    console.log(
      "Date range (UTC):",
      today.toISOString(),
      "to",
      tomorrow.toISOString()
    );
    console.log("");

    // 4. Count today's earnings
    const todayCount = await prisma.earningsTickersToday.count({
      where: { reportDate: today },
    });
    console.log(`Today's earnings count (${todayString}):`, todayCount);

    if (todayCount === 0) {
      console.log("❌ NO DATA FOUND FOR TODAY!");
    } else {
      console.log("✅ Data exists for today");

      // Show sample data
      const samples = await prisma.earningsTickersToday.findMany({
        where: { reportDate: today },
        take: 5,
        select: {
          ticker: true,
          reportDate: true,
          reportTime: true,
          createdAt: true,
        },
      });

      console.log("\nSample data (first 5):");
      console.table(samples);
    }
    console.log("");

    // 5. Check all dates in database
    console.log("📋 IV. ALL DATES IN DATABASE");
    console.log("--------------------------------------");
    const allDates = await prisma.$queryRaw`
      SELECT 
        DATE(reportDate) as date,
        COUNT(*) as count,
        MIN(createdAt) as first_created,
        MAX(createdAt) as last_created
      FROM EarningsTickersToday
      GROUP BY DATE(reportDate)
      ORDER BY date DESC
      LIMIT 10
    `;
    console.table(allDates);
    console.log("");

    // 6. Check recent inserts (cron execution)
    console.log("📋 V. RECENT CRON EXECUTIONS (by createdAt)");
    console.log("--------------------------------------");
    const recentInserts = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as created_date,
        COUNT(*) as records_inserted,
        MIN(createdAt) as first_at,
        MAX(createdAt) as last_at
      FROM EarningsTickersToday
      GROUP BY DATE(createdAt)
      ORDER BY created_date DESC
      LIMIT 7
    `;
    console.table(recentInserts);
    console.log("");

    // 7. Check market data
    console.log("📋 VI. MARKET DATA CHECK");
    console.log("--------------------------------------");
    const marketCount = await prisma.todayEarningsMovements.count({
      where: { reportDate: today },
    });
    console.log(`Today's market data count:`, marketCount);
    console.log("");

    // 8. Summary
    console.log("📋 VII. SUMMARY");
    console.log("--------------------------------------");
    if (todayCount > 0) {
      console.log("✅ Status: DATA FOUND");
      console.log(`   - ${todayCount} earnings records`);
      console.log(`   - ${marketCount} market data records`);
      console.log("");
      console.log("🔍 Next steps:");
      console.log(
        "   1. Check if API endpoint returns data: curl http://localhost:3000/api/earnings"
      );
      console.log(
        "   2. Clear cache: curl -X POST http://localhost:3000/api/earnings/clear-cache"
      );
      console.log("   3. Check frontend in browser DevTools");
    } else {
      console.log("❌ Status: NO DATA FOR TODAY");
      console.log("");
      console.log("🔍 Possible causes:");
      console.log(
        "   1. Cron job not running → check PM2 logs: pm2 logs earnings-table"
      );
      console.log("   2. Cron job failed → check for errors in logs");
      console.log("   3. Wrong database URL → check .env.production");
      console.log("   4. Timezone mismatch → check date calculation");
      console.log("   5. API keys invalid → check Finnhub/Polygon keys");
      console.log("");
      console.log("🚀 Quick fix:");
      console.log(
        "   Run manual fetch: NODE_ENV=production node src/jobs/fetch-today.ts"
      );
    }
    console.log("");

    // 9. Check if there's data for yesterday or tomorrow
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const yesterdayCount = await prisma.earningsTickersToday.count({
      where: { reportDate: yesterday },
    });
    const tomorrowCount = await prisma.earningsTickersToday.count({
      where: { reportDate: tomorrow },
    });

    console.log("📋 VIII. ADJACENT DATES");
    console.log("--------------------------------------");
    console.log(
      `Yesterday (${
        yesterday.toISOString().split("T")[0]
      }): ${yesterdayCount} records`
    );
    console.log(`Today (${todayString}): ${todayCount} records`);
    console.log(
      `Tomorrow (${
        tomorrow.toISOString().split("T")[0]
      }): ${tomorrowCount} records`
    );

    if (todayCount === 0 && (yesterdayCount > 0 || tomorrowCount > 0)) {
      console.log("");
      console.log("⚠️  WARNING: Data exists for adjacent dates but not today!");
      console.log("   This suggests a timezone or date calculation issue.");
    }
    console.log("");
  } catch (error) {
    console.error("❌ ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }

  console.log("====================================");
  console.log("✅ Diagnostics Complete");
  console.log("====================================");
}

diagnose().catch(console.error);
