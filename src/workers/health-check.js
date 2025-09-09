// Health Check Script for Production Monitoring
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function healthCheck() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: {},
  };

  try {
    // 1. Database connectivity check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.checks.database = {
        status: "healthy",
        message: "Database connected",
      };
    } catch (error) {
      checks.checks.database = { status: "unhealthy", message: error.message };
      checks.status = "unhealthy";
    }

    // 2. API endpoints check
    try {
      const response = await axios.get("http://localhost:3000/api/earnings", {
        timeout: 5000,
      });
      if (response.status === 200) {
        checks.checks.api = { status: "healthy", message: "API responding" };
      } else {
        checks.checks.api = {
          status: "unhealthy",
          message: `API returned ${response.status}`,
        };
        checks.status = "unhealthy";
      }
    } catch (error) {
      checks.checks.api = { status: "unhealthy", message: error.message };
      checks.status = "unhealthy";
    }

    // 3. Data freshness check
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const earningsCount = await prisma.earningsTickersToday.count({
        where: { reportDate: today },
      });

      const marketDataCount = await prisma.todayEarningsMovements.count({
        where: { reportDate: today },
      });

      if (earningsCount > 0 && marketDataCount > 0) {
        checks.checks.data = {
          status: "healthy",
          message: `${earningsCount} earnings, ${marketDataCount} market records`,
        };
      } else {
        checks.checks.data = {
          status: "warning",
          message: `Low data count: ${earningsCount} earnings, ${marketDataCount} market records`,
        };
      }
    } catch (error) {
      checks.checks.data = { status: "unhealthy", message: error.message };
      checks.status = "unhealthy";
    }

    // 4. Memory usage check
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
    };

    checks.checks.memory = {
      status: memUsageMB.heapUsed > 500 ? "warning" : "healthy",
      message: `Memory usage: ${memUsageMB.heapUsed}MB`,
      details: memUsageMB,
    };

    if (memUsageMB.heapUsed > 500) {
      checks.status = "warning";
    }
  } catch (error) {
    checks.status = "unhealthy";
    checks.error = error.message;
  }

  return checks;
}

// Run health check if called directly
if (require.main === module) {
  healthCheck()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === "healthy" ? 0 : 1);
    })
    .catch((error) => {
      console.error("Health check failed:", error);
      process.exit(1);
    });
}

module.exports = { healthCheck };
