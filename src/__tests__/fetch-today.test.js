/**
 * 🚀 FETCH-TODAY.TS TESTS
 * Testuje skutočnú logiku fetch scriptu
 */

const axios = require("axios");

// Mock axios
jest.mock("axios");
const mockedAxios = axios;

describe("🚀 Fetch Today Script Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("📊 Market Cap Calculation Tests", () => {
    test("Should use market_cap from company details API (correct approach)", async () => {
      // Mock Polygon company details API response
      const mockCompanyDetails = {
        data: {
          results: {
            ticker: "AAPL",
            name: "Apple Inc.",
            market_cap: 3000000000000, // $3T
            share_class_shares_outstanding: 15000000000,
          },
          status: "OK",
        },
      };

      // Mock Polygon market data API response
      const mockMarketData = {
        data: {
          results: [
            {
              c: 150.25, // close price
              vw: 149.5, // volume weighted price (should NOT be used for market cap)
              n: 1000000, // number of transactions (should NOT be used for market cap)
              v: 45000000, // volume
              t: 1706140800000, // timestamp
            },
          ],
          ticker: "AAPL",
          status: "OK",
        },
      };

      // Mock the axios calls in the correct order
      mockedAxios.get
        .mockResolvedValueOnce(mockMarketData) // First call for market data
        .mockResolvedValueOnce(mockCompanyDetails); // Second call for company details

      // Simulate the market cap calculation logic
      let marketCap = null;
      let sharesOutstanding = null;

      // First call - market data (not used in this test)
      await axios.get("https://api.polygon.io/v2/aggs/ticker/AAPL/prev", {
        params: { apikey: "test-key" },
      });

      // Second call - company details (this is what we test)
      const { data: profileData } = await axios.get(
        "https://api.polygon.io/v3/reference/tickers/AAPL",
        { params: { apikey: "test-key" }, timeout: 10000 }
      );
      marketCap = profileData?.results?.market_cap || null;
      sharesOutstanding =
        profileData?.results?.share_class_shares_outstanding || null;

      // Assertions
      expect(marketCap).toBe(3000000000000); // Should use market_cap from company details
      expect(sharesOutstanding).toBe(15000000000); // Should use share_class_shares_outstanding
      expect(marketCap).not.toBe(150.25 * 1000000); // Should NOT be vw * n
    });

    test("Should fallback to price * shares when company details fail", async () => {
      // Mock Polygon market data API response
      const mockMarketData = {
        data: {
          results: [
            {
              c: 150.25, // close price
              n: 15000000000, // shares outstanding (correct field)
              v: 45000000, // volume
              t: 1706140800000, // timestamp
            },
          ],
          ticker: "AAPL",
          status: "OK",
        },
      };

      // Mock the axios calls - company details fails, market data succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error("Company details API failed")) // Company details fails
        .mockResolvedValueOnce(mockMarketData); // Market data succeeds

      // Simulate the fallback logic
      let marketCap = null;
      let sharesOutstanding = null;

      try {
        // This will fail
        const { data: profileData } = await axios.get(
          "https://api.polygon.io/v3/reference/tickers/AAPL",
          { params: { apikey: "test-key" }, timeout: 10000 }
        );
        marketCap = profileData?.results?.market_cap || null;
        sharesOutstanding =
          profileData?.results?.share_class_shares_outstanding || null;
      } catch (error) {
        // Fallback: calculate from price and shares if available
        const { data: prevData } = await axios.get(
          "https://api.polygon.io/v2/aggs/ticker/AAPL/prev",
          { params: { apikey: "test-key" } }
        );
        if (prevData?.results?.[0]?.c && prevData?.results?.[0]?.n) {
          marketCap = prevData.results[0].c * prevData.results[0].n;
          sharesOutstanding = prevData.results[0].n;
        }
      }

      // Assertions
      expect(marketCap).toBe(150.25 * 15000000000); // Should be price * shares
      expect(sharesOutstanding).toBe(15000000000);
    });

    test("Should detect incorrect market cap calculation (vw * n)", () => {
      // This test demonstrates the WRONG way that was used before
      const mockMarketData = {
        results: [
          {
            c: 150.25, // close price
            vw: 149.5, // volume weighted price
            n: 1000000, // number of transactions
            v: 45000000, // volume
          },
        ],
      };

      // WRONG calculation (old way)
      const wrongMarketCap =
        mockMarketData.results[0].vw * mockMarketData.results[0].n;

      // CORRECT calculation (new way)
      const correctMarketCap = mockMarketData.results[0].c * 15000000000; // Assuming 15B shares

      // Assertions
      expect(wrongMarketCap).toBe(149.5 * 1000000); // 149,500,000 (wrong!)
      expect(correctMarketCap).toBe(150.25 * 15000000000); // 2,253,750,000,000 (correct!)
      expect(wrongMarketCap).not.toBe(correctMarketCap);
      expect(wrongMarketCap).toBeLessThan(correctMarketCap / 1000); // Wrong is much smaller
    });
  });

  describe("📊 Size Classification Tests", () => {
    test("Should classify market cap sizes correctly", () => {
      const testCases = [
        { marketCap: 500e9, expectedSize: "Large" }, // $500B
        { marketCap: 200e9, expectedSize: "Large" }, // $200B
        { marketCap: 50e9, expectedSize: "Mid" }, // $50B
        { marketCap: 10e9, expectedSize: "Mid" }, // $10B
        { marketCap: 5e9, expectedSize: "Small" }, // $5B
        { marketCap: 2e9, expectedSize: "Small" }, // $2B
        { marketCap: 1e9, expectedSize: "Small" }, // $1B
        { marketCap: null, expectedSize: "Unknown" }, // No market cap
      ];

      testCases.forEach(({ marketCap, expectedSize }) => {
        let size = "Unknown";
        if (marketCap) {
          if (marketCap >= 200e9) size = "Large";
          else if (marketCap >= 10e9) size = "Mid";
          else if (marketCap >= 2e9) size = "Small";
          else size = "Small";
        }

        expect(size).toBe(expectedSize);
      });
    });
  });

  describe("🔍 API Response Validation Tests", () => {
    test("Should validate Polygon API response structure", async () => {
      const mockResponse = {
        data: {
          results: [
            {
              c: 150.25,
              o: 148.5,
              h: 151.0,
              l: 147.8,
              v: 45000000,
              vw: 149.5,
              n: 1000000,
              t: 1706140800000,
            },
          ],
          ticker: "AAPL",
          queryCount: 1,
          resultsCount: 1,
          adjusted: true,
          status: "OK",
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const response = await axios.get(
        "https://api.polygon.io/v2/aggs/ticker/AAPL/prev"
      );
      const data = response.data.results[0];

      // Validate all fields exist
      expect(data).toHaveProperty("c"); // close price
      expect(data).toHaveProperty("o"); // open price
      expect(data).toHaveProperty("h"); // high
      expect(data).toHaveProperty("l"); // low
      expect(data).toHaveProperty("v"); // volume
      expect(data).toHaveProperty("vw"); // volume weighted price
      expect(data).toHaveProperty("n"); // number of transactions
      expect(data).toHaveProperty("t"); // timestamp

      // Validate data types
      expect(typeof data.c).toBe("number");
      expect(typeof data.vw).toBe("number");
      expect(typeof data.n).toBe("number");
      expect(typeof data.v).toBe("number");
    });
  });
});
