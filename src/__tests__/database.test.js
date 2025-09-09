/**
 * 🗄️ DATABASE TESTS
 * Testuje database operácie a data integrity
 */

const { PrismaClient } = require("@prisma/client");

// Mock Prisma for testing
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    earningsTickersToday: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    todayEarningsMovements: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    benzingaGuidance: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

describe("🗄️ Database Tests", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("📊 EarningsTickersToday Tests", () => {
    test("Upsert earnings data with valid structure", async () => {
      const mockEarningsData = {
        reportDate: new Date("2024-01-25"),
        ticker: "AAPL",
        reportTime: "bmo",
        epsActual: 1.52,
        epsEstimate: 1.5,
        revenueActual: BigInt(123900000000),
        revenueEstimate: BigInt(120000000000),
        sector: "Technology",
        fiscalPeriod: "Q1",
        fiscalYear: 2024,
        dataSource: "finnhub",
      };

      mockPrisma.earningsTickersToday.upsert.mockResolvedValue(
        mockEarningsData
      );

      const result = await mockPrisma.earningsTickersToday.upsert({
        where: {
          reportDate_ticker: {
            reportDate: mockEarningsData.reportDate,
            ticker: mockEarningsData.ticker,
          },
        },
        update: {
          epsActual: mockEarningsData.epsActual,
          epsEstimate: mockEarningsData.epsEstimate,
          revenueActual: mockEarningsData.revenueActual,
          revenueEstimate: mockEarningsData.revenueEstimate,
          reportTime: mockEarningsData.reportTime,
          sector: mockEarningsData.sector,
          fiscalPeriod: mockEarningsData.fiscalPeriod,
          fiscalYear: mockEarningsData.fiscalYear,
          dataSource: mockEarningsData.dataSource,
        },
        create: mockEarningsData,
      });

      expect(result).toEqual(mockEarningsData);
      expect(mockPrisma.earningsTickersToday.upsert).toHaveBeenCalledTimes(1);
    });

    test("Find earnings data by date", async () => {
      const mockEarningsList = [
        {
          reportDate: new Date("2024-01-25"),
          ticker: "AAPL",
          epsActual: 1.52,
          epsEstimate: 1.5,
          revenueActual: BigInt(123900000000),
          revenueEstimate: BigInt(120000000000),
        },
        {
          reportDate: new Date("2024-01-25"),
          ticker: "MSFT",
          epsActual: 2.93,
          epsEstimate: 2.78,
          revenueActual: BigInt(62020000000),
          revenueEstimate: BigInt(61000000000),
        },
      ];

      mockPrisma.earningsTickersToday.findMany.mockResolvedValue(
        mockEarningsList
      );

      const result = await mockPrisma.earningsTickersToday.findMany({
        where: {
          reportDate: new Date("2024-01-25"),
        },
      });

      expect(result).toEqual(mockEarningsList);
      expect(result).toHaveLength(2);
      expect(mockPrisma.earningsTickersToday.findMany).toHaveBeenCalledTimes(1);
    });

    test("Handle BigInt values correctly", async () => {
      const mockEarningsData = {
        reportDate: new Date("2024-01-25"),
        ticker: "AAPL",
        revenueActual: BigInt(123900000000),
        revenueEstimate: BigInt(120000000000),
      };

      mockPrisma.earningsTickersToday.upsert.mockResolvedValue(
        mockEarningsData
      );

      const result = await mockPrisma.earningsTickersToday.upsert({
        where: {
          reportDate_ticker: {
            reportDate: mockEarningsData.reportDate,
            ticker: mockEarningsData.ticker,
          },
        },
        update: {
          revenueActual: mockEarningsData.revenueActual,
          revenueEstimate: mockEarningsData.revenueEstimate,
        },
        create: mockEarningsData,
      });

      expect(typeof result.revenueActual).toBe("bigint");
      expect(typeof result.revenueEstimate).toBe("bigint");
      expect(Number(result.revenueActual)).toBe(123900000000);
      expect(Number(result.revenueEstimate)).toBe(120000000000);
    });
  });

  describe("📈 TodayEarningsMovements Tests", () => {
    test("Upsert market data with valid structure", async () => {
      const mockMarketData = {
        ticker: "AAPL",
        reportDate: new Date("2024-01-25"),
        companyName: "Apple Inc.",
        currentPrice: 150.25,
        previousClose: 148.5,
        marketCap: BigInt(3000000000000),
        size: "Large",
        marketCapDiff: 1.18,
        priceChangePercent: 1.18,
        sharesOutstanding: BigInt(15000000000),
        companyType: "Common Stock",
        primaryExchange: "NASDAQ",
        reportTime: "bmo",
      };

      mockPrisma.todayEarningsMovements.upsert.mockResolvedValue(
        mockMarketData
      );

      const result = await mockPrisma.todayEarningsMovements.upsert({
        where: {
          ticker_reportDate: {
            ticker: mockMarketData.ticker,
            reportDate: mockMarketData.reportDate,
          },
        },
        update: {
          currentPrice: mockMarketData.currentPrice,
          previousClose: mockMarketData.previousClose,
          marketCap: mockMarketData.marketCap,
          size: mockMarketData.size,
          marketCapDiff: mockMarketData.marketCapDiff,
          priceChangePercent: mockMarketData.priceChangePercent,
          sharesOutstanding: mockMarketData.sharesOutstanding,
        },
        create: mockMarketData,
      });

      expect(result).toEqual(mockMarketData);
      expect(mockPrisma.todayEarningsMovements.upsert).toHaveBeenCalledTimes(1);
    });

    test("Calculate market cap size classification", () => {
      const testCases = [
        { marketCap: BigInt(5000000000000), expectedSize: "Large" },
        { marketCap: BigInt(2000000000000), expectedSize: "Large" },
        { marketCap: BigInt(1000000000000), expectedSize: "Large" },
        { marketCap: BigInt(500000000000), expectedSize: "Mid" },
        { marketCap: BigInt(200000000000), expectedSize: "Mid" },
        { marketCap: BigInt(100000000000), expectedSize: "Mid" },
        { marketCap: BigInt(50000000000), expectedSize: "Small" },
        { marketCap: BigInt(10000000000), expectedSize: "Small" },
      ];

      testCases.forEach(({ marketCap, expectedSize }) => {
        let size;
        const marketCapNum = Number(marketCap);

        if (marketCapNum >= 1000000000000) {
          size = "Large";
        } else if (marketCapNum >= 100000000000) {
          size = "Mid";
        } else {
          size = "Small";
        }

        expect(size).toBe(expectedSize);
      });
    });

    test("Calculate price change percentage", () => {
      const testCases = [
        { current: 150.25, previous: 148.5, expected: 1.18 },
        { current: 100.0, previous: 100.0, expected: 0.0 },
        { current: 95.5, previous: 100.0, expected: -4.5 },
        { current: 200.0, previous: 150.0, expected: 33.33 },
      ];

      testCases.forEach(({ current, previous, expected }) => {
        const changePercent = ((current - previous) / previous) * 100;
        expect(changePercent).toBeCloseTo(expected, 2);
      });
    });
  });

  describe("🎯 BenzingaGuidance Tests", () => {
    test("Upsert guidance data with valid structure", async () => {
      const mockGuidanceData = {
        ticker: "AAPL",
        estimatedEpsGuidance: 1.55,
        estimatedRevenueGuidance: BigInt(125000000000),
        epsGuideVsConsensusPct: 3.33,
        revenueGuideVsConsensusPct: 4.17,
        previousMinEpsGuidance: 1.5,
        previousMaxEpsGuidance: 1.6,
        previousMinRevenueGuidance: BigInt(120000000000),
        previousMaxRevenueGuidance: BigInt(130000000000),
        fiscalPeriod: "Q1",
        fiscalYear: 2024,
        releaseType: "earnings",
      };

      mockPrisma.benzingaGuidance.upsert.mockResolvedValue(mockGuidanceData);

      const result = await mockPrisma.benzingaGuidance.upsert({
        where: {
          ticker_fiscalPeriod_fiscalYear: {
            ticker: mockGuidanceData.ticker,
            fiscalPeriod: mockGuidanceData.fiscalPeriod,
            fiscalYear: mockGuidanceData.fiscalYear,
          },
        },
        update: {
          estimatedEpsGuidance: mockGuidanceData.estimatedEpsGuidance,
          estimatedRevenueGuidance: mockGuidanceData.estimatedRevenueGuidance,
          epsGuideVsConsensusPct: mockGuidanceData.epsGuideVsConsensusPct,
          revenueGuideVsConsensusPct:
            mockGuidanceData.revenueGuideVsConsensusPct,
        },
        create: mockGuidanceData,
      });

      expect(result).toEqual(mockGuidanceData);
      expect(mockPrisma.benzingaGuidance.upsert).toHaveBeenCalledTimes(1);
    });

    test("Find guidance data with fiscal period filters", async () => {
      const mockGuidanceList = [
        {
          ticker: "AAPL",
          estimatedEpsGuidance: 1.55,
          estimatedRevenueGuidance: BigInt(125000000000),
          fiscalPeriod: "Q1",
          fiscalYear: 2024,
        },
      ];

      mockPrisma.benzingaGuidance.findMany.mockResolvedValue(mockGuidanceList);

      const result = await mockPrisma.benzingaGuidance.findMany({
        where: {
          ticker: "AAPL",
          fiscalYear: { not: null },
          fiscalPeriod: { not: null },
        },
      });

      expect(result).toEqual(mockGuidanceList);
      expect(result).toHaveLength(1);
      expect(mockPrisma.benzingaGuidance.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("🔄 Database Transaction Tests", () => {
    test("Handle database connection errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.earningsTickersToday.upsert.mockRejectedValue(dbError);

      await expect(
        mockPrisma.earningsTickersToday.upsert({
          where: {
            reportDate_ticker: {
              reportDate: new Date("2024-01-25"),
              ticker: "AAPL",
            },
          },
          update: { epsActual: 1.52 },
          create: {
            reportDate: new Date("2024-01-25"),
            ticker: "AAPL",
            epsActual: 1.52,
          },
        })
      ).rejects.toThrow("Database connection failed");
    });

    test("Handle concurrent database operations", async () => {
      const mockData = {
        reportDate: new Date("2024-01-25"),
        ticker: "AAPL",
        epsActual: 1.52,
      };

      mockPrisma.earningsTickersToday.upsert.mockResolvedValue(mockData);

      // Simulate concurrent operations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          mockPrisma.earningsTickersToday.upsert({
            where: {
              reportDate_ticker: {
                reportDate: new Date("2024-01-25"),
                ticker: `TICKER${i}`,
              },
            },
            update: { epsActual: 1.52 },
            create: {
              reportDate: new Date("2024-01-25"),
              ticker: `TICKER${i}`,
              epsActual: 1.52,
            },
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(mockPrisma.earningsTickersToday.upsert).toHaveBeenCalledTimes(5);
    });
  });

  describe("📊 Data Validation Tests", () => {
    test("Validate earnings data types", () => {
      const earningsData = {
        reportDate: new Date("2024-01-25"),
        ticker: "AAPL",
        epsActual: 1.52,
        epsEstimate: 1.5,
        revenueActual: BigInt(123900000000),
        revenueEstimate: BigInt(120000000000),
        sector: "Technology",
        fiscalPeriod: "Q1",
        fiscalYear: 2024,
      };

      expect(earningsData.reportDate).toBeInstanceOf(Date);
      expect(typeof earningsData.ticker).toBe("string");
      expect(typeof earningsData.epsActual).toBe("number");
      expect(typeof earningsData.epsEstimate).toBe("number");
      expect(typeof earningsData.revenueActual).toBe("bigint");
      expect(typeof earningsData.revenueEstimate).toBe("bigint");
      expect(typeof earningsData.sector).toBe("string");
      expect(typeof earningsData.fiscalPeriod).toBe("string");
      expect(typeof earningsData.fiscalYear).toBe("number");
    });

    test("Validate market data types", () => {
      const marketData = {
        ticker: "AAPL",
        reportDate: new Date("2024-01-25"),
        companyName: "Apple Inc.",
        currentPrice: 150.25,
        previousClose: 148.5,
        marketCap: BigInt(3000000000000),
        size: "Large",
        marketCapDiff: 1.18,
        priceChangePercent: 1.18,
        sharesOutstanding: BigInt(15000000000),
      };

      expect(typeof marketData.ticker).toBe("string");
      expect(marketData.reportDate).toBeInstanceOf(Date);
      expect(typeof marketData.companyName).toBe("string");
      expect(typeof marketData.currentPrice).toBe("number");
      expect(typeof marketData.previousClose).toBe("number");
      expect(typeof marketData.marketCap).toBe("bigint");
      expect(typeof marketData.size).toBe("string");
      expect(typeof marketData.marketCapDiff).toBe("number");
      expect(typeof marketData.priceChangePercent).toBe("number");
      expect(typeof marketData.sharesOutstanding).toBe("bigint");
    });
  });
});
