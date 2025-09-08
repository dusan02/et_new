const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

async function fetchEarningsData() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    console.log(`Fetching earnings data for ${todayStr}`);

    // Fetch from Finnhub
    const finnhubResponse = await axios.get(
      `https://finnhub.io/api/v1/calendar/earnings`,
      {
        params: {
          token: process.env.FINNHUB_API_KEY,
          from: todayStr,
          to: todayStr,
        },
        timeout: 30000,
      }
    );

    const earningsData = finnhubResponse.data || [];
    console.log(`Fetched ${earningsData.length} earnings records from Finnhub`);

    // Process and save earnings data
    const processedData = earningsData.map((earning) => ({
      reportDate: new Date(earning.date),
      ticker: earning.symbol,
      reportTime:
        earning.hour === "bmo" ? "BMO" : earning.hour === "amc" ? "AMC" : "TNS",
      epsActual: earning.epsActual
        ? parseFloat(earning.epsActual.toString())
        : null,
      epsEstimate: earning.epsEstimate
        ? parseFloat(earning.epsEstimate.toString())
        : null,
      revenueActual: earning.revenueActual
        ? BigInt(earning.revenueActual)
        : null,
      revenueEstimate: earning.revenueEstimate
        ? BigInt(earning.revenueEstimate)
        : null,
      sector: null,
    }));

    // Bulk upsert earnings data
    let upsertCount = 0;
    for (const data of processedData) {
      try {
        await prisma.earningsTickersToday.upsert({
          where: {
            reportDate_ticker: {
              reportDate: data.reportDate,
              ticker: data.ticker,
            },
          },
          update: {
            reportTime: data.reportTime,
            epsActual: data.epsActual,
            epsEstimate: data.epsEstimate,
            revenueActual: data.revenueActual,
            revenueEstimate: data.revenueEstimate,
            sector: data.sector,
            updatedAt: new Date(),
          },
          create: data,
        });
        upsertCount++;
      } catch (error) {
        console.error(
          `Error upserting earnings data for ${data.ticker}:`,
          error
        );
      }
    }

    console.log(`Successfully processed ${upsertCount} earnings records`);
    return { count: upsertCount, date: todayStr };
  } catch (error) {
    console.error("Error fetching earnings data:", error);
    throw error;
  }
}

async function main() {
  try {
    const result = await fetchEarningsData();
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
