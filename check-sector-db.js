const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkSectorInDB() {
  try {
    const today = new Date("2025-10-08T00:00:00.000Z");

    const earningsData = await prisma.earningsTickersToday.findMany({
      where: {
        reportDate: today,
      },
      select: {
        ticker: true,
        sector: true,
        dataSource: true,
      },
      take: 5,
    });

    console.log("📊 Sector hodnoty v databáze:");
    earningsData.forEach((item) => {
      console.log(
        `${item.ticker}: ${item.sector} (source: ${item.dataSource})`
      );
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSectorInDB();
