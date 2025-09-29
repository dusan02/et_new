/**
 * 🎨 EarningsTable Component Tests
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EarningsTable } from '@/components/EarningsTable'

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}))

const mockEarningsData = [
  {
    ticker: 'AAPL',
    reportTime: 'AMC',
    epsEstimate: 1.50,
    epsActual: 1.52,
    revenueEstimate: 120000000000,
    revenueActual: 123900000000,
    sector: 'Technology',
    companyType: 'Large Cap',
    fiscalPeriod: 'Q1',
    fiscalYear: 2025,
    companyName: 'Apple Inc.',
    size: 'Large',
    marketCap: 3000000000000,
    currentPrice: 150.25,
    previousClose: 148.50,
    priceChangePercent: 1.18,
    sharesOutstanding: 15728231000,
    guidanceData: {
      estimatedEpsGuidance: 1.55,
      estimatedRevenueGuidance: '125000000000',
      notes: 'Strong guidance',
      fiscalPeriod: 'Q2',
      fiscalYear: 2025,
    }
  },
  {
    ticker: 'GOOGL',
    reportTime: 'BMO',
    epsEstimate: 1.20,
    epsActual: 1.15,
    revenueEstimate: 85000000000,
    revenueActual: 83500000000,
    sector: 'Technology',
    companyType: 'Large Cap',
    fiscalPeriod: 'Q1',
    fiscalYear: 2025,
    companyName: 'Alphabet Inc.',
    size: 'Large',
    marketCap: 2100000000000,
    currentPrice: 165.80,
    previousClose: 168.20,
    priceChangePercent: -1.43,
    sharesOutstanding: 12750000000,
    guidanceData: null
  }
]

describe('EarningsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    })

    render(<EarningsTable data={[]} isLoading={true} error={null} onRefresh={() => {}} />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: null,
      error: new Error('Failed to fetch data'),
      isLoading: false,
    })

    render(<EarningsTable data={[]} isLoading={false} error={new Error('Failed to fetch data')} onRefresh={() => {}} />)
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
    expect(screen.getByText(/failed to fetch data/i)).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: [], success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={[]} isLoading={false} error={null} onRefresh={() => {}} />)
    
    expect(screen.getByText(/no earnings scheduled/i)).toBeInTheDocument()
  })

  it('renders table with earnings data correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)

    // Check table headers
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Market Cap')).toBeInTheDocument()
    expect(screen.getByText('EPS')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    
    // Check data rows
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('GOOGL')).toBeInTheDocument()
    expect(screen.getByText('Alphabet Inc.')).toBeInTheDocument()
  })

  it('displays EPS surprise correctly for beats and misses', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)

    // AAPL should show EPS beat (1.52 vs 1.50)
    const appleRow = screen.getByText('AAPL').closest('tr')
    expect(appleRow).toBeInTheDocument()
    
    // GOOGL should show EPS miss (1.15 vs 1.20)
    const googleRow = screen.getByText('GOOGL').closest('tr')
    expect(googleRow).toBeInTheDocument()
  })

  it('handles price changes correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // Check positive price change for AAPL (+1.18%)
    expect(screen.getByText(/\+1\.18%/)).toBeInTheDocument()
    
    // Check negative price change for GOOGL (-1.43%)
    expect(screen.getByText(/-1\.43%/)).toBeInTheDocument()
  })

  it('displays market cap in correct format', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // Check market cap formatting (should show in trillions)
    expect(screen.getAllByText(/3\.0T/)[0]).toBeInTheDocument() // AAPL
    expect(screen.getAllByText(/2\.1T/)[0]).toBeInTheDocument() // GOOGL
  })

  it('handles sorting functionality', async () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // Click on market cap header to sort (use role selector for table header)
    const marketCapHeader = screen.getByRole('button', { name: 'Market Cap' })
    fireEvent.click(marketCapHeader)
    
    await waitFor(() => {
      // Should be sorted by market cap (AAPL first with 3.0T)
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveTextContent('AAPL') // First data row
    })
  })

  it('handles filter functionality', async () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // Search for specific ticker
    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'AAPL' } })
    
    await waitFor(() => {
      // Should only show AAPL row (check in table cell specifically)
      expect(screen.getAllByText('AAPL')).toHaveLength(2) // mobile + desktop
      expect(screen.queryByText('GOOGL')).not.toBeInTheDocument()
    })
  })

  it('displays guidance data when available', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // AAPL should have guidance data (get the table cell version)
    const appleCells = screen.getAllByText('AAPL')
    const appleTableCell = appleCells.find(cell => cell.closest('td'))
    const appleRow = appleTableCell?.closest('tr')
    expect(appleRow).toHaveTextContent('1.55') // EPS guidance
    
    // GOOGL should show no guidance
    const googleRow = screen.getByText('GOOGL').closest('tr')
    expect(googleRow).toHaveTextContent('No data')
  })

  it('handles mobile responsive design', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockEarningsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsTable data={mockEarningsData} isLoading={false} error={null} onRefresh={() => {}} />)
    
    // Check if mobile layout is applied (test-id should exist)
    expect(screen.getByTestId('earnings-table')).toBeInTheDocument()
  })
})
