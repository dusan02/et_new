import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function analyzeData() {
  try {
    const today = new Date("2025-09-08");

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
    const withoutAnyActual = earnings.filter(
      (e) => e.epsActual === null && e.revenueActual === null
    );

    console.log("\n📊 SÚHRN:");
    console.log(
      `Firmy s EPS Actual: ${withEpsActual.length}/${earnings.length}`
    );
    console.log(
      `Firmy s Revenue Actual: ${withRevenueActual.length}/${earnings.length}`
    );
    console.log(
      `Firmy s oboma (EPS + Revenue Actual): ${withBothActual.length}/${earnings.length}`
    );
    console.log(
      `Firmy bez žiadnych actual dát: ${withoutAnyActual.length}/${earnings.length}`
    );

    console.log("\n✅ FIRMY S EPS ACTUAL:");
    withEpsActual.forEach((e) => {
      const surprise = e.epsEstimate
        ? (((e.epsActual - e.epsEstimate) / e.epsEstimate) * 100).toFixed(1)
        : "N/A";
      console.log(
        `  ${e.ticker}: Est=${e.epsEstimate}, Act=${e.epsActual} (${surprise}%)`
      );
    });

    console.log("\n💰 FIRMY S REVENUE ACTUAL:");
    withRevenueActual.forEach((e) => {
      const surprise = e.revenueEstimate
        ? (
            ((Number(e.revenueActual) - Number(e.revenueEstimate)) /
              Number(e.revenueEstimate)) *
            100
          ).toFixed(1)
        : "N/A";
      console.log(
        `  ${e.ticker}: Est=${e.revenueEstimate}, Act=${e.revenueActual} (${surprise}%)`
      );
    });

    console.log("\n❌ FIRMY BEZ ŽIADNYCH ACTUAL DÁT:");
    withoutAnyActual.forEach((e) => {
      console.log(
        `  ${e.ticker}: Len estimates (EPS=${e.epsEstimate}, Rev=${e.revenueEstimate})`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeData();
