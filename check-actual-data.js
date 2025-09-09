// Check actual EPS and Revenue data
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkActualData() {
  try {
    const today = new Date("2025-09-09");

    const earnings = await prisma.earningsTickersToday.findMany({
      where: { reportDate: today },
      select: {
        ticker: true,
        epsActual: true,
        epsEstimate: true,
        revenueActual: true,
        revenueEstimate: true,
      },
    });

    console.log("=== ANALÝZA SKUTOČNÝCH DÁT ===");
    console.log("Celkový počet firiem:", earnings.length);

    const withEpsActual = earnings.filter((e) => e.epsActual !== null);
    const withRevenueActual = earnings.filter((e) => e.revenueActual !== null);
    const withBothActual = earnings.filter(
      (e) => e.epsActual !== null && e.revenueActual !== null
    );

    console.log("\nFirmy s EPS Actual:", withEpsActual.length);
    console.log("Firmy s Revenue Actual:", withRevenueActual.length);
    console.log("Firmy s oboma (EPS + Revenue Actual):", withBothActual.length);

    console.log("\n=== FIRMY S EPS ACTUAL ===");
    withEpsActual.forEach((e) => {
      const surprise = e.epsEstimate
        ? (((e.epsActual - e.epsEstimate) / e.epsEstimate) * 100).toFixed(1)
        : "N/A";
      console.log(
        `${e.ticker}: EPS Est=${e.epsEstimate}, EPS Act=${e.epsActual} (${surprise}%)`
      );
    });

    console.log("\n=== FIRMY S REVENUE ACTUAL ===");
    withRevenueActual.forEach((e) => {
      const surprise = e.revenueEstimate
        ? (
            ((Number(e.revenueActual) - Number(e.revenueEstimate)) /
              Number(e.revenueEstimate)) *
            100
          ).toFixed(1)
        : "N/A";
      console.log(
        `${e.ticker}: Rev Est=${e.revenueEstimate}, Rev Act=${e.revenueActual} (${surprise}%)`
      );
    });

    console.log("\n=== FIRMY BEZ ŽIADNYCH ACTUAL DÁT ===");
    const withoutAnyActual = earnings.filter(
      (e) => e.epsActual === null && e.revenueActual === null
    );
    console.log("Počet:", withoutAnyActual.length);
    console.log("Tickers:", withoutAnyActual.map((e) => e.ticker).join(", "));
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualData();
