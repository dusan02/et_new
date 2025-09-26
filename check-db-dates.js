const { PrismaClient } = require("@prisma/client");

async function checkDbDates() {
  const prisma = new PrismaClient();

  try {
    // Check how dates are stored
    const records = await prisma.earningsTickersToday.findMany({
      take: 5,
      select: {
        reportDate: true,
        ticker: true,
      },
    });

    console.log("Database date format:");
    records.forEach((record) => {
      console.log(
        `  ${record.ticker}: ${
          record.reportDate
        } (type: ${typeof record.reportDate})`
      );
    });

    // Check if the date comparison works
    const sep24 = new Date("2025-09-24T00:00:00.000Z");
    const sep24Records = await prisma.earningsTickersToday.findMany({
      where: { reportDate: sep24 },
      select: { ticker: true, reportDate: true },
    });

    console.log(
      `\nRecords matching ${sep24.toISOString()}:`,
      sep24Records.length
    );

    // Try with the fixed date format
    const fixedDate = new Date(2025, 8, 24, 0, 0, 0, 0); // September 24, 2025
    const fixedRecords = await prisma.earningsTickersToday.findMany({
      where: { reportDate: fixedDate },
      select: { ticker: true, reportDate: true },
    });

    console.log(
      `Records matching fixed date ${fixedDate.toISOString()}:`,
      fixedRecords.length
    );
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDbDates();
