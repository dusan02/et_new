/**
 * 🧪 EARNINGS UTILS TESTS
 * Unit testy pre earnings utility funkcie
 */

import {
  formatPercent,
  formatBillions,
  formatPrice,
  formatMarketCap,
  formatMarketCapDiff,
  getChangeColor,
  getSurpriseColor,
  filterData,
  sortData,
  calculateEpsSurprise,
  calculateRevenueSurprise,
  getUniqueSectors,
  getUniqueSizes,
  getReportTimeLabel,
  getReportTimeColor
} from '../utils';
import { EarningsData } from '../types';

describe('Earnings Utils', () => {
  describe('formatPercent', () => {
    it('should format positive percentages correctly', () => {
      expect(formatPercent(5.25)).toBe('5.25%');
      expect(formatPercent(0.1)).toBe('0.10%');
    });

    it('should format negative percentages correctly', () => {
      expect(formatPercent(-3.75)).toBe('-3.75%');
      expect(formatPercent(-0.05)).toBe('-0.05%');
    });

    it('should handle null and undefined values', () => {
      expect(formatPercent(null)).toBe('N/A');
      expect(formatPercent(undefined)).toBe('N/A');
    });

    it('should respect decimal places parameter', () => {
      expect(formatPercent(5.123456, 1)).toBe('5.1%');
      expect(formatPercent(5.123456, 4)).toBe('5.1235%');
    });
  });

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(123.45)).toBe('$123.45');
      expect(formatPrice(0.01)).toBe('$0.01');
      expect(formatPrice(1000)).toBe('$1000.00');
    });

    it('should handle null and undefined values', () => {
      expect(formatPrice(null)).toBe('N/A');
      expect(formatPrice(undefined)).toBe('N/A');
    });
  });

  describe('formatMarketCap', () => {
    it('should format market cap in billions', () => {
      expect(formatMarketCap(1500000000000)).toBe('$1.5T');
      expect(formatMarketCap(50000000000)).toBe('$50.0B');
    });

    it('should format market cap in millions for smaller values', () => {
      expect(formatMarketCap(500000000)).toBe('$500M');
      expect(formatMarketCap(1000000)).toBe('$1M');
    });

    it('should handle null and undefined values', () => {
      expect(formatMarketCap(null)).toBe('N/A');
      expect(formatMarketCap(undefined)).toBe('N/A');
    });
  });

  describe('getChangeColor', () => {
    it('should return green for positive changes', () => {
      expect(getChangeColor(5.25)).toBe('text-green-600');
      expect(getChangeColor(0.01)).toBe('text-green-600');
    });

    it('should return red for negative changes', () => {
      expect(getChangeColor(-3.75)).toBe('text-red-600');
      expect(getChangeColor(-0.01)).toBe('text-red-600');
    });

    it('should return gray for zero or null values', () => {
      expect(getChangeColor(0)).toBe('text-gray-500');
      expect(getChangeColor(null)).toBe('text-gray-500');
      expect(getChangeColor(undefined)).toBe('text-gray-500');
    });
  });

  describe('calculateEpsSurprise', () => {
    it('should calculate positive surprise correctly', () => {
      expect(calculateEpsSurprise(1.10, 1.00)).toBeCloseTo(10, 5);
      expect(calculateEpsSurprise(0.55, 0.50)).toBeCloseTo(10, 5);
    });

    it('should calculate negative surprise correctly', () => {
      expect(calculateEpsSurprise(0.90, 1.00)).toBeCloseTo(-10, 5);
      expect(calculateEpsSurprise(0.45, 0.50)).toBeCloseTo(-10, 5);
    });

    it('should handle null values', () => {
      expect(calculateEpsSurprise(null, 1.00)).toBe(null);
      expect(calculateEpsSurprise(1.10, null)).toBe(null);
      expect(calculateEpsSurprise(null, null)).toBe(null);
    });

    it('should handle zero estimate', () => {
      expect(calculateEpsSurprise(1.10, 0)).toBe(null);
    });
  });

  describe('calculateRevenueSurprise', () => {
    it('should calculate positive surprise correctly', () => {
      expect(calculateRevenueSurprise(1100000000, 1000000000)).toBe(10);
    });

    it('should calculate negative surprise correctly', () => {
      expect(calculateRevenueSurprise(900000000, 1000000000)).toBe(-10);
    });

    it('should handle null values', () => {
      expect(calculateRevenueSurprise(null, 1000000000)).toBe(null);
      expect(calculateRevenueSurprise(1100000000, null)).toBe(null);
    });
  });

  describe('filterData', () => {
    const mockData: EarningsData[] = [
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        size: 'Mega',
        epsActual: 1.50,
        revenueActual: 100000000000,
        reportTime: 'AMC',
        epsEstimate: null,
        revenueEstimate: null,
        companyType: null,
        dataSource: null,
        fiscalPeriod: null,
        fiscalYear: null,
        primaryExchange: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        currentPrice: null,
        previousClose: null,
        priceChangePercent: null,
        sharesOutstanding: null,
        epsGuideSurprise: null,
        epsGuideBasis: null,
        epsGuideExtreme: false,
        revenueGuideSurprise: null,
        revenueGuideBasis: null,
        revenueGuideExtreme: false,
        guidanceData: null
      },
      {
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        sector: 'Technology',
        size: 'Mega',
        epsActual: null,
        revenueActual: null,
        reportTime: 'BMO',
        epsEstimate: null,
        revenueEstimate: null,
        companyType: null,
        dataSource: null,
        fiscalPeriod: null,
        fiscalYear: null,
        primaryExchange: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        currentPrice: null,
        previousClose: null,
        priceChangePercent: null,
        sharesOutstanding: null,
        epsGuideSurprise: null,
        epsGuideBasis: null,
        epsGuideExtreme: false,
        revenueGuideSurprise: null,
        revenueGuideBasis: null,
        revenueGuideExtreme: false,
        guidanceData: null
      }
    ];

    it('should filter by search term', () => {
      const result = filterData(mockData, { 
        searchTerm: 'Apple', 
        showOnlyWithActual: false, 
        sizeFilter: null, 
        sectorFilter: null 
      });
      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('AAPL');
    });

    it('should filter by showOnlyWithActual', () => {
      const result = filterData(mockData, { 
        searchTerm: '', 
        showOnlyWithActual: true, 
        sizeFilter: null, 
        sectorFilter: null 
      });
      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('AAPL');
    });

    it('should filter by size', () => {
      const result = filterData(mockData, { 
        searchTerm: '', 
        showOnlyWithActual: false, 
        sizeFilter: 'Mega', 
        sectorFilter: null 
      });
      expect(result).toHaveLength(2);
    });

    it('should filter by sector', () => {
      const result = filterData(mockData, { 
        searchTerm: '', 
        showOnlyWithActual: false, 
        sizeFilter: null, 
        sectorFilter: 'Technology' 
      });
      expect(result).toHaveLength(2);
    });

    it('should return all data when no filters applied', () => {
      const result = filterData(mockData, { 
        searchTerm: '', 
        showOnlyWithActual: false, 
        sizeFilter: null, 
        sectorFilter: null 
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('sortData', () => {
    const mockData: EarningsData[] = [
      {
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        size: 'Mega',
        epsActual: 1.50,
        revenueActual: 100000000000,
        reportTime: 'AMC',
        epsEstimate: null,
        revenueEstimate: null,
        companyType: null,
        dataSource: null,
        fiscalPeriod: null,
        fiscalYear: null,
        primaryExchange: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        currentPrice: null,
        previousClose: null,
        priceChangePercent: null,
        sharesOutstanding: null,
        epsGuideSurprise: null,
        epsGuideBasis: null,
        epsGuideExtreme: false,
        revenueGuideSurprise: null,
        revenueGuideBasis: null,
        revenueGuideExtreme: false,
        guidanceData: null
      },
      {
        ticker: 'MSFT',
        companyName: 'Microsoft Corporation',
        sector: 'Technology',
        size: 'Mega',
        epsActual: 2.00,
        revenueActual: 50000000000,
        reportTime: 'BMO',
        epsEstimate: null,
        revenueEstimate: null,
        companyType: null,
        dataSource: null,
        fiscalPeriod: null,
        fiscalYear: null,
        primaryExchange: null,
        marketCap: null,
        marketCapDiff: null,
        marketCapDiffBillions: null,
        currentPrice: null,
        previousClose: null,
        priceChangePercent: null,
        sharesOutstanding: null,
        epsGuideSurprise: null,
        epsGuideBasis: null,
        epsGuideExtreme: false,
        revenueGuideSurprise: null,
        revenueGuideBasis: null,
        revenueGuideExtreme: false,
        guidanceData: null
      }
    ];

    it('should sort by ticker ascending', () => {
      const result = sortData(mockData, { field: 'ticker', direction: 'asc' });
      expect(result[0].ticker).toBe('AAPL');
      expect(result[1].ticker).toBe('MSFT');
    });

    it('should sort by ticker descending', () => {
      const result = sortData(mockData, { field: 'ticker', direction: 'desc' });
      expect(result[0].ticker).toBe('MSFT');
      expect(result[1].ticker).toBe('AAPL');
    });

    it('should sort by epsActual ascending', () => {
      const result = sortData(mockData, { field: 'epsActual', direction: 'asc' });
      expect(result[0].epsActual).toBe(1.50);
      expect(result[1].epsActual).toBe(2.00);
    });

    it('should handle null sort field', () => {
      const result = sortData(mockData, { field: null, direction: 'asc' });
      expect(result).toEqual(mockData);
    });
  });

  describe('getUniqueSectors', () => {
    const mockData: EarningsData[] = [
      { ...{} as EarningsData, sector: 'Technology' },
      { ...{} as EarningsData, sector: 'Healthcare' },
      { ...{} as EarningsData, sector: 'Technology' },
      { ...{} as EarningsData, sector: null },
      { ...{} as EarningsData, sector: 'Finance' }
    ];

    it('should return unique sectors sorted', () => {
      const result = getUniqueSectors(mockData);
      expect(result).toEqual(['Finance', 'Healthcare', 'Technology']);
    });

    it('should handle empty array', () => {
      const result = getUniqueSectors([]);
      expect(result).toEqual([]);
    });
  });

  describe('getUniqueSizes', () => {
    const mockData: EarningsData[] = [
      { ...{} as EarningsData, size: 'Large' },
      { ...{} as EarningsData, size: 'Small' },
      { ...{} as EarningsData, size: 'Large' },
      { ...{} as EarningsData, size: null },
      { ...{} as EarningsData, size: 'Mega' }
    ];

    it('should return unique sizes sorted', () => {
      const result = getUniqueSizes(mockData);
      expect(result).toEqual(['Large', 'Mega', 'Small']);
    });
  });

  describe('getReportTimeLabel', () => {
    it('should return correct labels', () => {
      expect(getReportTimeLabel('BMO')).toBe('Before Market Open');
      expect(getReportTimeLabel('AMC')).toBe('After Market Close');
      expect(getReportTimeLabel('TNS')).toBe('Time Not Specified');
      expect(getReportTimeLabel(null)).toBe('TNS');
      expect(getReportTimeLabel('UNKNOWN')).toBe('UNKNOWN');
    });
  });

  describe('getReportTimeColor', () => {
    it('should return correct colors', () => {
      expect(getReportTimeColor('BMO')).toBe('bg-blue-100 text-blue-800');
      expect(getReportTimeColor('AMC')).toBe('bg-purple-100 text-purple-800');
      expect(getReportTimeColor('TNS')).toBe('bg-gray-100 text-gray-800');
      expect(getReportTimeColor(null)).toBe('bg-gray-100 text-gray-800');
    });
  });
});
