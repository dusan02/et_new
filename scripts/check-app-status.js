#!/usr/bin/env node

/**
 * Check application status and cron job state
 */

const { PrismaClient } = require("@prisma/client");

async function checkAppStatus() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Checking application status...");

    // Check database connection
    await prisma.$connect();
    console.log("✅ Database connection: OK");

    // Check today's data
    const today = new Date();
    const start = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const end = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() + 1
      )
    );

    const earningsCount = await prisma.earningsTickersToday.count({
      where: {
        reportDate: {
          gte: start,
          lte: end,
        },
      },
    });

    const marketDataCount = await prisma.marketData.count({
      where: {
        reportDate: {
          gte: start,
          lte: end,
        },
      },
    });

    console.log(`📊 Today's data:`);
    console.log(`   - Earnings records: ${earningsCount}`);
    console.log(`   - Market data records: ${marketDataCount}`);

    // Check recent data quality
    const recentEarnings = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        ticker: true,
        revenueActual: true,
        revenueEstimate: true,
        reportDate: true,
      },
      take: 5,
    });

    console.log(`📈 Recent earnings data:`);
    recentEarnings.forEach((earning) => {
      const revenueActual = earning.revenueActual
        ? Number(earning.revenueActual)
        : null;
      const revenueEstimate = earning.revenueEstimate
        ? Number(earning.revenueEstimate)
        : null;
      console.log(
        `   - ${earning.ticker}: actual=${revenueActual}, estimate=${revenueEstimate}`
      );
    });

    // Check for potential issues
    const suspiciousRevenue = await prisma.earningsTickersToday.count({
      where: {
        OR: [
          { revenueActual: { gt: 1e12 } },
          { revenueEstimate: { gt: 1e12 } },
        ],
        reportDate: {
          gte: start,
          lte: end,
        },
      },
    });

    if (suspiciousRevenue > 0) {
      console.log(
        `⚠️  Found ${suspiciousRevenue} records with suspicious revenue values`
      );
    } else {
      console.log("✅ No suspicious revenue values found");
    }

    console.log("\n🎯 Status Summary:");
    console.log(`   - Database: ✅ Connected`);
    console.log(
      `   - Earnings data: ${earningsCount > 0 ? "✅ Available" : "❌ Missing"}`
    );
    console.log(
      `   - Market data: ${marketDataCount > 0 ? "✅ Available" : "❌ Missing"}`
    );
    console.log(
      `   - Data quality: ${
        suspiciousRevenue === 0 ? "✅ Good" : "⚠️  Issues detected"
      }`
    );

    return {
      database: true,
      earningsCount,
      marketDataCount,
      suspiciousRevenue,
      status:
        earningsCount > 0 && marketDataCount > 0 && suspiciousRevenue === 0
          ? "healthy"
          : "needs_attention",
    };
  } catch (error) {
    console.error("❌ Error checking app status:", error);
    return {
      database: false,
      error: error.message,
      status: "error",
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkAppStatus()
    .then((result) => {
      console.log(`\n📋 Final Status: ${result.status.toUpperCase()}`);
      process.exit(result.status === "healthy" ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Status check failed:", error);
      process.exit(1);
    });
}

module.exports = { checkAppStatus };
