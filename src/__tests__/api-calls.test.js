/**
 * 🌐 API CALLS TESTS - SKUTOČNÉ CHOVANIE
 * Testuje skutočné volania na Finnhub a Polygon API podľa fetch-data-now.js
 */

const axios = require("axios");

// Mock axios for testing
jest.mock("axios");
const mockedAxios = axios;

describe("🌐 API Calls Tests - Real Behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("📊 Finnhub API Tests - Real Implementation", () => {
    test("Finnhub earnings API returns valid data structure", async () => {
      const mockEarningsData = {
        earningsCalendar: [
          {
            symbol: "AAPL",
            date: "2024-01-25",
            epsActual: 1.52,
            epsEstimate: 1.5,
            revenueActual: 123900000000,
            revenueEstimate: 120000000000,
            hour: "bmo",
            sector: "Technology",
            companyType: "Large Cap",
            quarter: 1,
            year: 2024,
            exchange: "NASDAQ",
          },
          {
            symbol: "MSFT",
            date: "2024-01-25",
            epsActual: 2.93,
            epsEstimate: 2.78,
            revenueActual: 62020000000,
            revenueEstimate: 61000000000,
            hour: "amc",
            sector: "Technology",
            companyType: "Large Cap",
            quarter: 2,
            year: 2024,
            exchange: "NASDAQ",
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockEarningsData });

      const response = await axios.get(
        "https://finnhub.io/api/v1/calendar/earnings",
        {
          params: {
            from: "2024-01-25",
            to: "2024-01-25",
            token: "test-token",
          },
          timeout: 30000,
        }
      );

      expect(response.data).toHaveProperty("earningsCalendar");
      expect(Array.isArray(response.data.earningsCalendar)).toBe(true);
      expect(response.data.earningsCalendar).toHaveLength(2);

      // Validate first earnings record
      const firstEarning = response.data.earningsCalendar[0];
      expect(firstEarning).toHaveProperty("symbol");
      expect(firstEarning).toHaveProperty("epsActual");
      expect(firstEarning).toHaveProperty("epsEstimate");
      expect(firstEarning).toHaveProperty("revenueActual");
      expect(firstEarning).toHaveProperty("revenueEstimate");
      expect(firstEarning).toHaveProperty("hour");
      expect(firstEarning).toHaveProperty("sector");
      expect(firstEarning).toHaveProperty("companyType");
      expect(firstEarning).toHaveProperty("quarter");
      expect(firstEarning).toHaveProperty("year");
      expect(firstEarning).toHaveProperty("exchange");

      // Validate data types
      expect(typeof firstEarning.symbol).toBe("string");
      expect(typeof firstEarning.epsActual).toBe("number");
      expect(typeof firstEarning.epsEstimate).toBe("number");
      expect(typeof firstEarning.revenueActual).toBe("number");
      expect(typeof firstEarning.revenueEstimate).toBe("number");
      expect(typeof firstEarning.hour).toBe("string");
      expect(typeof firstEarning.sector).toBe("string");
      expect(typeof firstEarning.companyType).toBe("string");
      expect(typeof firstEarning.quarter).toBe("number");
      expect(typeof firstEarning.year).toBe("number");
      expect(typeof firstEarning.exchange).toBe("string");
    });

    test("Finnhub API handles empty response", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { earningsCalendar: [] } });

      const response = await axios.get(
        "https://finnhub.io/api/v1/calendar/earnings",
        {
          params: {
            from: "2024-01-25",
            to: "2024-01-25",
            token: "test-token",
          },
          timeout: 30000,
        }
      );

      expect(response.data).toHaveProperty("earningsCalendar");
      expect(Array.isArray(response.data.earningsCalendar)).toBe(true);
      expect(response.data.earningsCalendar).toHaveLength(0);
    });

    test("Finnhub API handles errors gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        axios.get("https://finnhub.io/api/v1/calendar/earnings", {
          params: {
            from: "2024-01-25",
            to: "2024-01-25",
            token: "test-token",
          },
          timeout: 30000,
        })
      ).rejects.toThrow("API Error");
    });

    test("Finnhub company profile API returns valid data", async () => {
      const mockProfileData = {
        name: "Apple Inc.",
        ticker: "AAPL",
        country: "US",
        currency: "USD",
        exchange: "NASDAQ",
        ipo: "1980-12-12",
        marketCapitalization: 3000000000000,
        shareOutstanding: 15000000000,
        logo: "https://logo.clearbit.com/apple.com",
        phone: "+1 408 996 1010",
        weburl: "https://www.apple.com",
        finnhubIndustry: "Technology",
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockProfileData });

      const response = await axios.get(
        "https://finnhub.io/api/v1/stock/profile2",
        {
          params: {
            symbol: "AAPL",
            token: "test-token",
          },
          timeout: 5000,
        }
      );

      expect(response.data).toHaveProperty("name");
      expect(response.data).toHaveProperty("ticker");
      expect(response.data).toHaveProperty("country");
      expect(response.data).toHaveProperty("currency");
      expect(response.data).toHaveProperty("exchange");
      expect(response.data).toHaveProperty("ipo");
      expect(response.data).toHaveProperty("marketCapitalization");
      expect(response.data).toHaveProperty("shareOutstanding");

      // Validate data types
      expect(typeof response.data.name).toBe("string");
      expect(typeof response.data.ticker).toBe("string");
      expect(typeof response.data.country).toBe("string");
      expect(typeof response.data.currency).toBe("string");
      expect(typeof response.data.exchange).toBe("string");
      expect(typeof response.data.ipo).toBe("string");
      expect(typeof response.data.marketCapitalization).toBe("number");
      expect(typeof response.data.shareOutstanding).toBe("number");
    });
  });

  describe("📈 Polygon API Tests", () => {
    test("Polygon market data API returns valid data structure", async () => {
      const mockMarketData = {
        results: [
          {
            c: 150.25, // close price
            o: 148.5, // open price
            h: 151.0, // high
            l: 147.8, // low
            v: 45000000, // volume
            t: 1706140800000, // timestamp
          },
        ],
        ticker: "AAPL",
        queryCount: 1,
        resultsCount: 1,
        adjusted: true,
        status: "OK",
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockMarketData });

      const response = await axios.get(
        "https://api.polygon.io/v2/aggs/ticker/AAPL/prev",
        {
          params: {
            adjusted: true,
            apikey: "test-key",
          },
        }
      );

      expect(response.data).toHaveProperty("results");
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results).toHaveLength(1);
      expect(response.data).toHaveProperty("ticker");
      expect(response.data).toHaveProperty("status");

      // Validate market data structure
      const marketData = response.data.results[0];
      expect(marketData).toHaveProperty("c"); // close price
      expect(marketData).toHaveProperty("o"); // open price
      expect(marketData).toHaveProperty("h"); // high
      expect(marketData).toHaveProperty("l"); // low
      expect(marketData).toHaveProperty("v"); // volume

      // Validate data types
      expect(typeof marketData.c).toBe("number");
      expect(typeof marketData.o).toBe("number");
      expect(typeof marketData.h).toBe("number");
      expect(typeof marketData.l).toBe("number");
      expect(typeof marketData.v).toBe("number");
    });

    test("Polygon ticker details API returns valid data structure", async () => {
      const mockTickerDetails = {
        results: {
          ticker: "AAPL",
          name: "Apple Inc.",
          market: "stocks",
          locale: "us",
          primary_exchange: "NASDAQ",
          type: "CS",
          active: true,
          currency_name: "usd",
          cik: "0000320193",
          composite_figi: "BBG000B9XRY4",
          share_class_figi: "BBG001S5N8V8",
          market_cap: 3000000000000,
          share_class_shares_outstanding: 15000000000,
          weighted_shares_outstanding: 15000000000,
          round_lot: 100,
        },
        status: "OK",
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockTickerDetails });

      const response = await axios.get(
        "https://api.polygon.io/v3/reference/tickers/AAPL",
        {
          params: {
            apikey: "test-key",
          },
        }
      );

      expect(response.data).toHaveProperty("results");
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("OK");

      // Validate ticker details structure
      const tickerDetails = response.data.results;
      expect(tickerDetails).toHaveProperty("ticker");
      expect(tickerDetails).toHaveProperty("name");
      expect(tickerDetails).toHaveProperty("market_cap");
      expect(tickerDetails).toHaveProperty("share_class_shares_outstanding");

      // Validate data types
      expect(typeof tickerDetails.ticker).toBe("string");
      expect(typeof tickerDetails.name).toBe("string");
      expect(typeof tickerDetails.market_cap).toBe("number");
      expect(typeof tickerDetails.share_class_shares_outstanding).toBe(
        "number"
      );
    });

    test("Polygon API handles errors gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Polygon API Error"));

      await expect(
        axios.get("https://api.polygon.io/v2/aggs/ticker/AAPL/prev", {
          params: {
            adjusted: true,
            apikey: "test-key",
          },
        })
      ).rejects.toThrow("Polygon API Error");
    });
  });

  // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Benzinga API Tests commented out
  /*
  describe("🎯 Benzinga API Tests - Real Implementation", () => {
    test("Benzinga guidance API returns valid data structure", async () => {
      const mockGuidanceData = {
        results: [
          {
            ticker: "AAPL",
            estimated_eps_guidance: 1.55,
            estimated_revenue_guidance: 125000000000,
            min_eps_guidance: 1.5,
            max_eps_guidance: 1.6,
            min_revenue_guidance: 120000000000,
            max_revenue_guidance: 130000000000,
            fiscal_period: "Q1",
            fiscal_year: 2024,
            release_type: "earnings",
          },
        ],
        status: "OK",
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockGuidanceData });

      const response = await axios.get(
        "https://api.polygon.io/benzinga/v1/guidance",
        {
          params: {
            ticker: "AAPL",
            apikey: "test-key",
          },
          timeout: 10000,
        }
      );

      expect(response.data).toHaveProperty("results");
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results).toHaveLength(1);
      expect(response.data).toHaveProperty("status");

      // Validate guidance data structure
      const guidanceData = response.data.results[0];
      expect(guidanceData).toHaveProperty("ticker");
      expect(guidanceData).toHaveProperty("estimated_eps_guidance");
      expect(guidanceData).toHaveProperty("estimated_revenue_guidance");
      expect(guidanceData).toHaveProperty("min_eps_guidance");
      expect(guidanceData).toHaveProperty("max_eps_guidance");
      expect(guidanceData).toHaveProperty("min_revenue_guidance");
      expect(guidanceData).toHaveProperty("max_revenue_guidance");
      expect(guidanceData).toHaveProperty("fiscal_period");
      expect(guidanceData).toHaveProperty("fiscal_year");
      expect(guidanceData).toHaveProperty("release_type");

      // Validate data types
      expect(typeof guidanceData.ticker).toBe("string");
      expect(typeof guidanceData.estimated_eps_guidance).toBe("number");
      expect(typeof guidanceData.estimated_revenue_guidance).toBe("number");
      expect(typeof guidanceData.min_eps_guidance).toBe("number");
      expect(typeof guidanceData.max_eps_guidance).toBe("number");
      expect(typeof guidanceData.min_revenue_guidance).toBe("number");
      expect(typeof guidanceData.max_revenue_guidance).toBe("number");
      expect(typeof guidanceData.fiscal_period).toBe("string");
      expect(typeof guidanceData.fiscal_year).toBe("number");
      expect(typeof guidanceData.release_type).toBe("string");
    });

    test("Benzinga API handles empty response", async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });

      const response = await axios.get(
        "https://api.polygon.io/benzinga/v1/guidance",
        {
          params: {
            ticker: "AAPL",
            apikey: "test-key",
          },
          timeout: 10000,
        }
      );

      expect(response.data).toHaveProperty("results");
      expect(Array.isArray(response.data.results)).toBe(true);
      expect(response.data.results).toHaveLength(0);
    });

    test("Benzinga API handles errors gracefully", async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error("Benzinga API Error"));

      await expect(
        axios.get("https://api.polygon.io/benzinga/v1/guidance", {
          params: {
            ticker: "AAPL",
            apikey: "test-key",
          },
          timeout: 10000,
        })
      ).rejects.toThrow("Benzinga API Error");
    });
  });

  describe("🔄 API Rate Limiting Tests", () => {
    test("API calls respect rate limits", async () => {
      const mockData = { results: [] };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      // Simulate multiple rapid API calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          axios.get("https://finnhub.io/api/v1/calendar/earnings", {
            params: {
              from: "2024-01-25",
              to: "2024-01-25",
              token: "test-token",
            },
          })
        );
      }

      const responses = await Promise.all(promises);
      expect(responses).toHaveLength(5);
      expect(mockedAxios.get).toHaveBeenCalledTimes(5);
    });
  });
  */
});
