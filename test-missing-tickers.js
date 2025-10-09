const axios = require("axios");

const POLYGON_API_KEY = "Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX";

const missingTickers = [
  "AONC",
  "BANT",
  "BLUAF",
  "BZYR",
  "DIDIY",
  "GRST",
  "GTLL",
  "KXIN",
  "MHGU",
  "VOXX",
];

async function testTicker(ticker) {
  try {
    console.log(`\n🔍 Testing ${ticker}...`);

    // Test previous close
    try {
      const prevResponse = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev`,
        { params: { apikey: POLYGON_API_KEY }, timeout: 10000 }
      );

      const prevClose = prevResponse.data?.results?.[0]?.c;
      console.log(`  ✅ Previous close: $${prevClose}`);
    } catch (error) {
      console.log(
        `  ❌ Previous close failed: ${error.response?.status} ${error.response?.statusText}`
      );
    }

    // Test snapshot
    try {
      const snapshotResponse = await axios.get(
        `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`,
        { params: { apikey: POLYGON_API_KEY }, timeout: 10000 }
      );

      const dayClose = snapshotResponse.data?.ticker?.day?.c;
      const minClose = snapshotResponse.data?.ticker?.min?.c;
      const todaysChange = snapshotResponse.data?.ticker?.todaysChange;

      console.log(
        `  ✅ Snapshot: day=$${dayClose}, min=$${minClose}, change=$${todaysChange}`
      );
    } catch (error) {
      console.log(
        `  ❌ Snapshot failed: ${error.response?.status} ${error.response?.statusText}`
      );
    }

    // Test company info
    try {
      const companyResponse = await axios.get(
        `https://api.polygon.io/v3/reference/tickers/${ticker}`,
        { params: { apikey: POLYGON_API_KEY }, timeout: 10000 }
      );

      const companyName = companyResponse.data?.results?.name;
      const marketCap = companyResponse.data?.results?.market_cap;

      console.log(`  ✅ Company: ${companyName}, Market Cap: $${marketCap}`);
    } catch (error) {
      console.log(
        `  ❌ Company info failed: ${error.response?.status} ${error.response?.statusText}`
      );
    }
  } catch (error) {
    console.log(`  ❌ General error: ${error.message}`);
  }
}

async function testAllMissingTickers() {
  console.log("🧪 Testing missing tickers...");

  for (const ticker of missingTickers) {
    await testTicker(ticker);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

testAllMissingTickers();
