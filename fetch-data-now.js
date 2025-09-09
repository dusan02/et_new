// Simple data fetch script - works like old app
// One command to fetch all data: node fetch-data-now.js

const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
require("dotenv").config();

const prisma = new PrismaClient();

// API Keys
const FINN = process.env.FINNHUB_API_KEY;
const POLY = process.env.POLYGON_API_KEY;

console.log("🚀 FETCHING DATA NOW - Simple approach");
console.log("=====================================");
// Get NY timezone date (same as API)
function getNYDate() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

function getTodayStart() {
  const today = getNYDate();
  // Create date string in YYYY-MM-DD format for NY timezone
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const dateString = `${year}-${month}-${day}`;
  return new Date(dateString + "T00:00:00.000Z");
}

// Use same date logic as API
const todayDate = getTodayStart();
const todayString = todayDate.toISOString().split("T")[0];

console.log(`📅 Date: ${todayString}`);
console.log(`🔑 Finnhub API: ${FINN ? "✅ Set" : "❌ Missing"}`);
console.log(`🔑 Polygon API: ${POLY ? "✅ Set" : "❌ Missing"}`);
console.log("");

async function fetchEarningsData() {
  try {
    console.log("📊 Fetching earnings from Finnhub...");

    const today = todayString; // Use same date format as API
    const url = "https://finnhub.io/api/v1/calendar/earnings";

    const { data } = await axios.get(url, {
      params: { from: today, to: today, token: FINN },
      timeout: 30000,
    });

    const earningsList = data?.earningsCalendar || data || [];
    console.log(`✅ Found ${earningsList.length} earnings records`);

    // Process and save earnings data
    for (const earning of earningsList) {
      try {
        // Use same date as API (NY timezone)
        const reportDate = todayDate;

        await prisma.earningsTickersToday.upsert({
          where: {
            reportDate_ticker: {
              reportDate: reportDate,
              ticker: earning.symbol,
            },
          },
          update: {
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
            reportTime:
              (earning.hour || "").toUpperCase() === "BMO"
                ? "BMO"
                : (earning.hour || "").toUpperCase() === "AMC"
                ? "AMC"
                : "TNS",
            sector: earning.sector || null,
            companyType: earning.companyType || null,
            dataSource: "finnhub",
            fiscalPeriod: earning.quarter ? `Q${earning.quarter}` : null,
            fiscalYear: earning.year || null,
            primaryExchange: earning.exchange || null,
            updatedAt: new Date(),
          },
          create: {
            reportDate: reportDate,
            ticker: earning.symbol,
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
            reportTime:
              (earning.hour || "").toUpperCase() === "BMO"
                ? "BMO"
                : (earning.hour || "").toUpperCase() === "AMC"
                ? "AMC"
                : "TNS",
            sector: earning.sector || null,
            companyType: earning.companyType || null,
            dataSource: "finnhub",
            fiscalPeriod: earning.quarter ? `Q${earning.quarter}` : null,
            fiscalYear: earning.year || null,
            primaryExchange: earning.exchange || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        console.log(`✅ Saved: ${earning.symbol}`);
      } catch (error) {
        console.error(`❌ Failed to save ${earning.symbol}:`, error.message);
      }
    }

    return earningsList.map((e) => e.symbol);
  } catch (error) {
    console.error("❌ Failed to fetch earnings:", error.message);
    return [];
  }
}

async function fetchMarketData(tickers) {
  if (tickers.length === 0) {
    console.log("⚠️ No tickers to fetch market data for");
    return;
  }

  console.log(`📈 Fetching market data for ${tickers.length} tickers...`);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];

    // Add delay to avoid rate limiting
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
    }

    try {
      // Fetch previous close
      const { data: prevData } = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
        { params: { apiKey: POLY }, timeout: 10000 }
      );

      const prevClose = prevData?.results?.[0]?.c;

      // Fetch current price
      let currentPrice = prevClose;
      try {
        const { data: lastTradeData } = await axios.get(
          `https://api.polygon.io/v2/last/trade/${ticker}`,
          { params: { apiKey: POLY }, timeout: 5000 }
        );
        currentPrice = lastTradeData?.results?.p || prevClose;
      } catch (error) {
        console.warn(`⚠️ Using prev close for ${ticker}: ${error.message}`);
      }

      // Fetch company name with delay to avoid rate limiting
      let companyName = ticker;
      try {
        // Add small delay for Finnhub API
        await new Promise((resolve) => setTimeout(resolve, 50));

        const { data: profileData } = await axios.get(
          `https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINN}`,
          { timeout: 5000 }
        );
        companyName = profileData?.name || ticker;
      } catch (error) {
        console.warn(`⚠️ Using ticker as name for ${ticker}: ${error.message}`);
      }

      // Fetch shares outstanding from Polygon
      let sharesOutstanding = null;
      try {
        const { data: tickerData } = await axios.get(
          `https://api.polygon.io/v3/reference/tickers/${ticker}`,
          { params: { apiKey: POLY }, timeout: 5000 }
        );
        if (tickerData?.results?.share_class_shares_outstanding) {
          sharesOutstanding = BigInt(
            tickerData.results.share_class_shares_outstanding
          );
        }
      } catch (error) {
        console.warn(
          `⚠️ Failed to fetch shares outstanding for ${ticker}: ${error.message}`
        );
      }

      // Calculate price change
      const priceChangePercent =
        prevClose && currentPrice
          ? ((currentPrice - prevClose) / prevClose) * 100
          : null;

      // Calculate market cap
      let marketCap = null;
      let marketCapDiff = null;
      let marketCapDiffBillions = null;
      let size = null;

      if (currentPrice && sharesOutstanding) {
        marketCap = BigInt(
          Math.round(currentPrice * Number(sharesOutstanding))
        );

        if (prevClose) {
          const previousMarketCap = BigInt(
            Math.round(prevClose * Number(sharesOutstanding))
          );
          const currentCapFloat = Number(marketCap);
          const previousCapFloat = Number(previousMarketCap);

          marketCapDiff =
            ((currentCapFloat - previousCapFloat) / previousCapFloat) * 100;
          marketCapDiffBillions =
            (currentCapFloat - previousCapFloat) / 1_000_000_000;
        }

        // Determine size based on market cap
        const marketCapFloat = Number(marketCap);
        if (marketCapFloat >= 10_000_000_000) {
          size = "Large";
        } else if (marketCapFloat >= 2_000_000_000) {
          size = "Mid";
        } else {
          size = "Small";
        }
      }

      // Save market data - use same date as API
      const today = todayDate;

      await prisma.todayEarningsMovements.upsert({
        where: {
          ticker_reportDate: {
            ticker: ticker,
            reportDate: todayDate,
          },
        },
        update: {
          companyName: companyName,
          currentPrice: currentPrice,
          previousClose: prevClose,
          priceChangePercent: priceChangePercent,
          marketCap: marketCap,
          marketCapDiff: marketCapDiff,
          marketCapDiffBillions: marketCapDiffBillions,
          sharesOutstanding: sharesOutstanding,
          size: size,
          updatedAt: new Date(),
        },
        create: {
          ticker: ticker,
          reportDate: todayDate,
          companyName: companyName,
          currentPrice: currentPrice,
          previousClose: prevClose,
          priceChangePercent: priceChangePercent,
          marketCap: marketCap,
          marketCapDiff: marketCapDiff,
          marketCapDiffBillions: marketCapDiffBillions,
          sharesOutstanding: sharesOutstanding,
          size: size,
          updatedAt: new Date(),
        },
      });

      const marketCapStr = marketCap
        ? `$${(Number(marketCap) / 1_000_000_000).toFixed(1)}B`
        : "N/A";
      const sizeStr = size ? `[${size}]` : "";

      console.log(
        `✅ Market data: ${ticker} - $${currentPrice?.toFixed(
          2
        )} (${priceChangePercent?.toFixed(2)}%) ${marketCapStr} ${sizeStr}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to fetch market data for ${ticker}:`,
        error.message
      );
    }
  }
}

async function main() {
  try {
    console.log("🔄 Starting data fetch...\n");

    // 1. Fetch earnings data
    const tickers = await fetchEarningsData();
    console.log("");

    // 2. Fetch market data
    await fetchMarketData(tickers);
    console.log("");

    // 3. Show results - use same date as API
    const today = todayDate;

    const earningsCount = await prisma.earningsTickersToday.count({
      where: { reportDate: todayDate },
    });

    const marketCount = await prisma.todayEarningsMovements.count({
      where: { reportDate: todayDate },
    });

    console.log("📊 FINAL RESULTS:");
    console.log(`✅ Earnings records: ${earningsCount}`);
    console.log(`✅ Market records: ${marketCount}`);
    console.log("");
    console.log("🎉 Data fetch completed!");
    console.log("🌐 Refresh your app at http://localhost:3000");
  } catch (error) {
    console.error("❌ Fatal error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
