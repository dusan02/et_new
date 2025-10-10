#!/usr/bin/env node

/**
 * Migration script to fix old revenue data that was multiplied by 1,000,000
 * This script identifies and fixes records where revenue values are suspiciously high
 */

const { PrismaClient } = require("@prisma/client");

async function migrateBadRevenueData() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Starting migration of bad revenue data...");

    // Find records with suspiciously high revenue (likely multiplied by 1M)
    const suspiciousRecords = await prisma.earningsTickersToday.findMany({
      where: {
        OR: [
          { revenueActual: { gt: 1e10 } }, // > 10B
          { revenueEstimate: { gt: 1e10 } }, // > 10B
        ],
        reportDate: { gte: new Date("2025-10-01") },
      },
      select: {
        ticker: true,
        reportDate: true,
        revenueActual: true,
        revenueEstimate: true,
        dataSource: true,
      },
    });

    console.log(`📊 Found ${suspiciousRecords.length} suspicious records`);

    if (suspiciousRecords.length === 0) {
      console.log("✅ No suspicious records found - migration not needed");
      return;
    }

    // Show what we found
    suspiciousRecords.forEach((record) => {
      console.log(
        `${record.ticker} (${record.reportDate.toISOString().split("T")[0]}):`
      );
      if (record.revenueActual && record.revenueActual > 1e10) {
        console.log(
          `  Revenue Actual: ${record.revenueActual} → ${Math.round(
            Number(record.revenueActual) / 1000000
          )}`
        );
      }
      if (record.revenueEstimate && record.revenueEstimate > 1e10) {
        console.log(
          `  Revenue Estimate: ${record.revenueEstimate} → ${Math.round(
            Number(record.revenueEstimate) / 1000000
          )}`
        );
      }
    });

    // Ask for confirmation
    console.log(
      "\n⚠️  This will fix the above records by dividing by 1,000,000"
    );
    console.log("⚠️  Make sure you have a backup before proceeding!");

    // In production, you might want to add a confirmation prompt here
    // For now, we'll proceed with the fix

    let fixedCount = 0;

    for (const record of suspiciousRecords) {
      const updateData = {};

      if (record.revenueActual && record.revenueActual > 1e10) {
        updateData.revenueActual = BigInt(
          Math.round(Number(record.revenueActual) / 1000000)
        );
      }

      if (record.revenueEstimate && record.revenueEstimate > 1e10) {
        updateData.revenueEstimate = BigInt(
          Math.round(Number(record.revenueEstimate) / 1000000)
        );
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.earningsTickersToday.update({
          where: {
            reportDate_ticker: {
              reportDate: record.reportDate,
              ticker: record.ticker,
            },
          },
          data: updateData,
        });

        fixedCount++;
        console.log(
          `✅ Fixed ${record.ticker} (${
            record.reportDate.toISOString().split("T")[0]
          })`
        );
      }
    }

    console.log(`\n🎉 Migration completed! Fixed ${fixedCount} records`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  migrateBadRevenueData()
    .then(() => {
      console.log("✅ Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateBadRevenueData };
