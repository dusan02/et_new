const axios = require("axios");

async function testSectorValues() {
  try {
    const response = await axios.get("http://localhost:3000/api/earnings");
    const data = response.data;

    console.log("📊 Test Sector hodnôt:");
    console.log("");

    // Zobraz tickery s sector hodnotami
    const withSector = data.data.filter(
      (item) => item.sector !== null && item.sector !== ""
    );
    const withoutSector = data.data.filter(
      (item) => item.sector === null || item.sector === ""
    );

    console.log("✅ Tickers s Sector:");
    withSector.slice(0, 5).forEach((item) => {
      console.log(`${item.ticker}: ${item.sector}`);
    });

    console.log("");
    console.log("❌ Tickers bez Sector:");
    withoutSector.slice(0, 5).forEach((item) => {
      console.log(`${item.ticker}: ${item.sector}`);
    });

    console.log("");
    console.log(`📈 Celkom: ${data.data.length} tickerov`);
    console.log(`   - S Sector: ${withSector.length}`);
    console.log(`   - Bez Sector: ${withoutSector.length}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testSectorValues();
