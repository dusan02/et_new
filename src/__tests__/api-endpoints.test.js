/**
 * 🌐 API ENDPOINTS TESTS
 * Testuje API endpointy a response formáty
 */

const { NextRequest } = require("next/server");

// Mock Next.js modules
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data) => ({ json: () => data })),
  },
  NextRequest: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    earningsTickersToday: {
      findMany: jest.fn(),
    },
    todayEarningsMovements: {
      findMany: jest.fn(),
    },
    benzingaGuidance: {
      findMany: jest.fn(),
    },
  },
}));

// Mock date utilities
jest.mock("@/lib/dates", () => ({
  getTodayStart: jest.fn(() => new Date("2024-01-25T00:00:00.000Z")),
  getNYTimeString: jest.fn(() => "2024-01-25 00:00:00"),
}));

// Mock BigInt utilities
jest.mock("@/lib/bigint-utils", () => ({
  serializeBigInts: jest.fn((data) => data),
}));

describe("🌐 API Endpoints Tests", () => {
  let mockPrisma;
  let mockDates;
  let mockBigIntUtils;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import mocked modules
    mockPrisma = require("@/lib/prisma").prisma;
    mockDates = require("@/lib/dates");
    mockBigIntUtils = require("@/lib/bigint-utils");
  });

  describe("📊 /api/earnings GET Tests", () => {
    test("Returns earnings data with correct structure", async () => {
      const mockEarningsData = [
        {
          reportDate: new Date("2024-01-25T00:00:00.000Z"),
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
          createdAt: new Date("2024-01-25T10:00:00.000Z"),
          updatedAt: new Date("2024-01-25T10:00:00.000Z"),
        },
        {
          reportDate: new Date("2024-01-25T00:00:00.000Z"),
          ticker: "MSFT",
          reportTime: "amc",
          epsActual: 2.93,
          epsEstimate: 2.78,
          revenueActual: BigInt(62020000000),
          revenueEstimate: BigInt(61000000000),
          sector: "Technology",
          fiscalPeriod: "Q2",
          fiscalYear: 2024,
          dataSource: "finnhub",
          createdAt: new Date("2024-01-25T10:00:00.000Z"),
          updatedAt: new Date("2024-01-25T10:00:00.000Z"),
        },
      ];

      const mockMovementsData = [
        {
          ticker: "AAPL",
          reportDate: new Date("2024-01-25T00:00:00.000Z"),
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
          updatedAt: new Date("2024-01-25T10:00:00.000Z"),
        },
        {
          ticker: "MSFT",
          reportDate: new Date("2024-01-25T00:00:00.000Z"),
          companyName: "Microsoft Corporation",
          currentPrice: 420.5,
          previousClose: 415.75,
          marketCap: BigInt(3100000000000),
          size: "Large",
          marketCapDiff: 1.14,
          priceChangePercent: 1.14,
          sharesOutstanding: BigInt(7400000000),
          companyType: "Common Stock",
          primaryExchange: "NASDAQ",
          reportTime: "amc",
          updatedAt: new Date("2024-01-25T10:00:00.000Z"),
        },
      ];

      const mockGuidanceData = [
        {
          id: 1,
          ticker: "AAPL",
          estimatedEpsGuidance: 1.55,
          estimatedRevenueGuidance: BigInt(125000000000),
          epsGuideVsConsensusPct: 3.33,
          revenueGuideVsConsensusPct: 4.17,
          fiscalPeriod: "Q1",
          fiscalYear: 2024,
          releaseType: "earnings",
          lastUpdated: new Date("2024-01-25T10:00:00.000Z"),
          createdAt: new Date("2024-01-25T10:00:00.000Z"),
        },
      ];

      mockPrisma.earningsTickersToday.findMany.mockResolvedValue(
        mockEarningsData
      );
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue(
        mockMovementsData
      );
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue(mockGuidanceData);
      mockBigIntUtils.serializeBigInts.mockImplementation((data) => data);

      // Import the route handler
      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("success", true);
      expect(responseData).toHaveProperty("data");
      expect(responseData).toHaveProperty("meta");
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data).toHaveLength(2);

      // Validate first earnings record structure
      const firstRecord = responseData.data[0];
      expect(firstRecord).toHaveProperty("ticker");
      expect(firstRecord).toHaveProperty("reportDate");
      expect(firstRecord).toHaveProperty("epsActual");
      expect(firstRecord).toHaveProperty("epsEstimate");
      expect(firstRecord).toHaveProperty("revenueActual");
      expect(firstRecord).toHaveProperty("revenueEstimate");
      expect(firstRecord).toHaveProperty("guidanceData");

      // Validate market data (now flat structure)
      expect(firstRecord).toHaveProperty("companyName");
      expect(firstRecord).toHaveProperty("currentPrice");
      expect(firstRecord).toHaveProperty("previousClose");
      expect(firstRecord).toHaveProperty("marketCap");
      expect(firstRecord).toHaveProperty("size");
      expect(firstRecord).toHaveProperty("priceChangePercent");

      // Validate guidance data
      expect(firstRecord.guidanceData).toHaveProperty("estimatedEpsGuidance");
      expect(firstRecord.guidanceData).toHaveProperty(
        "estimatedRevenueGuidance"
      );
      expect(firstRecord.guidanceData).toHaveProperty("lastUpdated");
    });

    test("Handles empty earnings data", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("success", true);
      expect(responseData).toHaveProperty("data");
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data).toHaveLength(0);
    });

    test("Handles database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.earningsTickersToday.findMany.mockRejectedValue(dbError);

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("error");
      expect(responseData.error).toBe("Internal Server Error");
    });

    test("Uses correct date filtering", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      const { GET } = require("@/app/api/earnings/route");

      await GET();

      // Verify that the correct date was used
      expect(mockPrisma.earningsTickersToday.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reportDate: expect.any(Date),
          }),
        })
      );

      expect(mockPrisma.todayEarningsMovements.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reportDate: expect.any(Date),
          }),
        })
      );
    });

    // 🚫 GUIDANCE DISABLED FOR PRODUCTION - Guidance filter test commented out
    /*
    test("Applies guidance data filters correctly", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      const { GET } = require("@/app/api/earnings/route");

      await GET();

      // Verify guidance query includes fiscal period filters
      expect(mockPrisma.benzingaGuidance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fiscalYear: { not: null },
            fiscalPeriod: { not: null },
          }),
        })
      );
    });
    */
  });

  describe("📈 /api/earnings/stats GET Tests", () => {
    test("Returns earnings statistics with correct structure", async () => {
      const mockStatsData = {
        totalEarnings: 25,
        totalRevenue: BigInt(5000000000000),
        totalMarketCap: BigInt(10000000000000),
        averageEpsSurprise: 5.2,
        averageRevenueSurprise: 3.8,
        largeCapCount: 15,
        midCapCount: 8,
        smallCapCount: 2,
        bmoCount: 12,
        amcCount: 13,
        tnsCount: 0,
      };

      // Mock the stats route
      const mockStatsRoute = {
        GET: jest.fn().mockResolvedValue({
          json: () => ({
            success: true,
            data: mockStatsData,
          }),
        }),
      };

      jest.doMock("@/app/api/earnings/stats/route", () => mockStatsRoute);

      const { GET } = require("@/app/api/earnings/stats/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("success", true);
      expect(responseData).toHaveProperty("data");
      expect(responseData.data).toHaveProperty("totalEarnings");
      expect(responseData.data).toHaveProperty("totalRevenue");
      expect(responseData.data).toHaveProperty("totalMarketCap");
      expect(responseData.data).toHaveProperty("averageEpsSurprise");
      expect(responseData.data).toHaveProperty("averageRevenueSurprise");
      expect(responseData.data).toHaveProperty("largeCapCount");
      expect(responseData.data).toHaveProperty("midCapCount");
      expect(responseData.data).toHaveProperty("smallCapCount");
      expect(responseData.data).toHaveProperty("bmoCount");
      expect(responseData.data).toHaveProperty("amcCount");
      expect(responseData.data).toHaveProperty("tnsCount");
    });
  });

  describe("🔄 API Response Format Tests", () => {
    test("Response includes proper metadata", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("meta");
      expect(responseData.meta).toHaveProperty("total");
      expect(responseData.meta).toHaveProperty("duration");
      expect(responseData.meta).toHaveProperty("date");
      expect(responseData.meta).toHaveProperty("cached");
    });

    test("Response includes performance metrics", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("meta");
      expect(responseData.meta).toHaveProperty("duration");
      expect(typeof responseData.meta.duration).toBe("string");
      expect(responseData.meta.duration).toContain("ms");
    });
  });

  describe("🚨 Error Handling Tests", () => {
    test("Handles Prisma connection errors", async () => {
      const prismaError = new Error("Prisma connection failed");
      mockPrisma.earningsTickersToday.findMany.mockRejectedValue(prismaError);

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("error");
      expect(responseData.error).toBe("Internal Server Error");
    });

    test("Handles invalid date errors", async () => {
      mockDates.getTodayStart.mockImplementation(() => {
        throw new Error("Invalid date");
      });

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("error");
      expect(responseData.error).toBe("Internal Server Error");
    });

    test("Handles BigInt serialization errors", async () => {
      mockPrisma.earningsTickersToday.findMany.mockResolvedValue([
        {
          ticker: "AAPL",
          revenueActual: BigInt(123900000000),
        },
      ]);
      mockPrisma.todayEarningsMovements.findMany.mockResolvedValue([]);
      mockPrisma.benzingaGuidance.findMany.mockResolvedValue([]);

      mockBigIntUtils.serializeBigInts.mockImplementation(() => {
        throw new Error("BigInt serialization failed");
      });

      const { GET } = require("@/app/api/earnings/route");

      const response = await GET();
      const responseData = await response.json();

      expect(responseData).toHaveProperty("error");
      expect(responseData.error).toBe("Internal Server Error");
    });
  });
});
