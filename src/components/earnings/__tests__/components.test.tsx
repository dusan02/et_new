/**
 * 🧪 EARNINGS COMPONENTS TESTS
 * Unit testy pre earnings komponenty
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EarningsHeader } from '../EarningsHeader';
import { EarningsRow } from '../EarningsRow';
import { EarningsFilters } from '../EarningsFilters';
import { EarningsStats } from '../EarningsStats';
import { TableColumn, SortConfig, FilterConfig, EarningsStats as EarningsStatsType } from '../types';

// Mock data
const mockColumns: TableColumn[] = [
  { key: 'ticker', label: 'Ticker', sortable: true },
  { key: 'size', label: 'Size', sortable: true },
  { key: 'marketCap', label: 'Market Cap', sortable: false }
];

const mockSortConfig: SortConfig = {
  field: null,
  direction: 'asc'
};

const mockFilterConfig: FilterConfig = {
  searchTerm: '',
  showOnlyWithActual: false,
  sizeFilter: null,
  sectorFilter: null
};

const mockStats: EarningsStatsType = {
  totalCompanies: 50,
  withEpsActual: 25,
  withRevenueActual: 30,
  withBothActual: 20,
  withoutAnyActual: 5,
  lastUpdated: '2025-01-01T12:00:00Z'
};

const mockEarningsData = {
  ticker: 'AAPL',
  reportTime: 'AMC',
  epsActual: 1.50,
  epsEstimate: 1.45,
  revenueActual: 100000000000,
  revenueEstimate: 95000000000,
  sector: 'Technology',
  companyType: 'Public',
  dataSource: 'finnhub',
  fiscalPeriod: 'Q1',
  fiscalYear: 2025,
  primaryExchange: 'NASDAQ',
  companyName: 'Apple Inc.',
  size: 'Mega',
  marketCap: 3000000000000,
  marketCapDiff: 5.2,
  marketCapDiffBillions: 150000000000,
  currentPrice: 150.25,
  previousClose: 148.50,
  priceChangePercent: 1.18,
  sharesOutstanding: 20000000000,
  epsGuideSurprise: 3.45,
  epsGuideBasis: 'estimate',
  epsGuideExtreme: false,
  revenueGuideSurprise: 5.26,
  revenueGuideBasis: 'estimate',
  revenueGuideExtreme: false,
  guidanceData: null
};

describe('EarningsHeader', () => {
  const mockOnSort = jest.fn();

  beforeEach(() => {
    mockOnSort.mockClear();
  });

  it('should render all columns', () => {
    render(
      <table>
        <EarningsHeader
          columns={mockColumns}
          sortConfig={mockSortConfig}
          onSort={mockOnSort}
        />
      </table>
    );

    expect(screen.getByText('Ticker')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('Market Cap')).toBeInTheDocument();
  });

  it('should call onSort when sortable column is clicked', () => {
    render(
      <table>
        <EarningsHeader
          columns={mockColumns}
          sortConfig={mockSortConfig}
          onSort={mockOnSort}
        />
      </table>
    );

    fireEvent.click(screen.getByText('Ticker'));
    expect(mockOnSort).toHaveBeenCalledWith('ticker');
  });

  it('should not call onSort when non-sortable column is clicked', () => {
    render(
      <table>
        <EarningsHeader
          columns={mockColumns}
          sortConfig={mockSortConfig}
          onSort={mockOnSort}
        />
      </table>
    );

    fireEvent.click(screen.getByText('Market Cap'));
    expect(mockOnSort).not.toHaveBeenCalled();
  });

  it('should show sort icons correctly', () => {
    const sortConfigWithField: SortConfig = {
      field: 'ticker',
      direction: 'asc'
    };

    render(
      <table>
        <EarningsHeader
          columns={mockColumns}
          sortConfig={sortConfigWithField}
          onSort={mockOnSort}
        />
      </table>
    );

    // Should show up arrow for ascending sort
    const tickerHeader = screen.getByText('Ticker').closest('th');
    expect(tickerHeader).toHaveClass('text-blue-600');
  });
});

describe('EarningsRow', () => {
  it('should render all data correctly', () => {
    render(
      <table>
        <tbody>
          <EarningsRow data={mockEarningsData} index={0} />
        </tbody>
      </table>
    );

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
    expect(screen.getByText('1.18%')).toBeInTheDocument();
    expect(screen.getByText('$1.50')).toBeInTheDocument();
  });

  it('should handle null values gracefully', () => {
    const dataWithNulls = {
      ...mockEarningsData,
      currentPrice: null,
      priceChangePercent: null,
      epsActual: null
    };

    render(
      <table>
        <tbody>
          <EarningsRow data={dataWithNulls} index={0} />
        </tbody>
      </table>
    );

    expect(screen.getAllByText('N/A')).toHaveLength(3);
  });

  it('should apply correct colors for positive/negative values', () => {
    render(
      <table>
        <tbody>
          <EarningsRow data={mockEarningsData} index={0} />
        </tbody>
      </table>
    );

    // Positive change should be green
    const changeElement = screen.getByText('1.18%');
    expect(changeElement).toHaveClass('text-green-600');
  });
});

describe('EarningsFilters', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    mockOnFilterChange.mockClear();
  });

  it('should render search input', () => {
    render(
      <EarningsFilters
        filterConfig={mockFilterConfig}
        onFilterChange={mockOnFilterChange}
        stats={mockStats}
        data={[mockEarningsData]}
      />
    );

    expect(screen.getByPlaceholderText('Search ticker, company, or sector...')).toBeInTheDocument();
  });

  it('should call onFilterChange when search input changes', () => {
    render(
      <EarningsFilters
        filterConfig={mockFilterConfig}
        onFilterChange={mockOnFilterChange}
        stats={mockStats}
        data={[mockEarningsData]}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search ticker, company, or sector...');
    fireEvent.change(searchInput, { target: { value: 'Apple' } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...mockFilterConfig,
      searchTerm: 'Apple'
    });
  });

  it('should render checkbox for show only with actual', () => {
    render(
      <EarningsFilters
        filterConfig={mockFilterConfig}
        onFilterChange={mockOnFilterChange}
        stats={mockStats}
        data={[mockEarningsData]}
      />
    );

    expect(screen.getByText(/Only with actual data/)).toBeInTheDocument();
  });

  it('should show advanced filters when advanced button is clicked', () => {
    render(
      <EarningsFilters
        filterConfig={mockFilterConfig}
        onFilterChange={mockOnFilterChange}
        stats={mockStats}
        data={[mockEarningsData]}
      />
    );

    const advancedButton = screen.getByText('Advanced');
    fireEvent.click(advancedButton);

    expect(screen.getByText('Company Size')).toBeInTheDocument();
    expect(screen.getByText('Sector')).toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    const activeFilterConfig: FilterConfig = {
      searchTerm: 'Apple',
      showOnlyWithActual: true,
      sizeFilter: null,
      sectorFilter: null
    };

    render(
      <EarningsFilters
        filterConfig={activeFilterConfig}
        onFilterChange={mockOnFilterChange}
        stats={mockStats}
        data={[mockEarningsData]}
      />
    );

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });
});

describe('EarningsStats', () => {
  it('should render all stats correctly', () => {
    render(<EarningsStats stats={mockStats} isLoading={false} />);

    expect(screen.getByText('50')).toBeInTheDocument(); // totalCompanies
    expect(screen.getByText('25')).toBeInTheDocument(); // withEpsActual
    expect(screen.getByText('30')).toBeInTheDocument(); // withRevenueActual
    expect(screen.getByText('20')).toBeInTheDocument(); // withBothActual
    expect(screen.getByText('5')).toBeInTheDocument(); // withoutAnyActual
  });

  it('should show loading state', () => {
    render(<EarningsStats stats={mockStats} isLoading={true} />);

    expect(screen.getByText('Loading stats...')).toBeInTheDocument();
  });

  it('should format last updated time correctly', () => {
    render(<EarningsStats stats={mockStats} isLoading={false} />);

    // Should show formatted date
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});
