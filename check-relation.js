const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkRelation() {
  try {
    const earnings = await prisma.earningsTickersToday.findFirst({
      where: { ticker: "AONC", reportDate: new Date("2025-10-08") },
      include: { marketData: true },
    });

    console.log("Earnings record:", earnings);
    console.log("Market data:", earnings?.marketData);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRelation();
