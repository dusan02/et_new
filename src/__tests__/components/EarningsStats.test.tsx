/**
 * 🎨 EarningsStats Component Tests
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EarningsStats } from '@/components/EarningsStats'

// Mock SWR
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockStatsData = {
  totalEarnings: 125,
  totalCompanies: 125,
  totalRevenue: 2500000000000,
  totalMarketCap: 15000000000000,
  averageEpsSurprise: 5.2,
  averageRevenueSurprise: 3.8,
  beatsCount: 75,
  missesCount: 35,
  meetsCount: 15,
  sizeDistribution: {
    Large: 65,
    Mid: 40,
    Small: 20
  },
  timeDistribution: {
    BMO: 60,
    AMC: 55,
    TNS: 10
  },
  topGainers: [
    {
      ticker: 'AAPL',
      priceChangePercent: 8.5,
      companyName: 'Apple Inc.'
    },
    {
      ticker: 'MSFT',
      priceChangePercent: 6.2,
      companyName: 'Microsoft Corp.'
    }
  ],
  topLosers: [
    {
      ticker: 'META',
      priceChangePercent: -4.8,
      companyName: 'Meta Platforms'
    },
    {
      ticker: 'NFLX',
      priceChangePercent: -3.2,
      companyName: 'Netflix Inc.'
    }
  ]
}

describe('EarningsStats Component', () => {
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

    render(<EarningsStats />)
    
    expect(screen.getByTestId('stats-loading')).toBeInTheDocument()
  })

  it('renders error state correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: null,
      error: new Error('Failed to fetch stats'),
      isLoading: false,
    })

    render(<EarningsStats />)
    
    expect(screen.getByTestId('stats-error')).toBeInTheDocument()
    expect(screen.getByText(/failed to fetch stats/i)).toBeInTheDocument()
  })

  it('renders stats data correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Check main stats
    expect(screen.getByText('125')).toBeInTheDocument() // Total earnings
    expect(screen.getByText('$2.5T')).toBeInTheDocument() // Total revenue
    expect(screen.getByText('$15.0T')).toBeInTheDocument() // Total market cap
  })

  it('displays EPS surprise stats correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    expect(screen.getByText('5.2%')).toBeInTheDocument() // Avg EPS surprise
    expect(screen.getByText('3.8%')).toBeInTheDocument() // Avg Revenue surprise
    
    // Check beats/misses/meets
    expect(screen.getByText('75')).toBeInTheDocument() // Beats
    expect(screen.getByText('35')).toBeInTheDocument() // Misses
    expect(screen.getByText('15')).toBeInTheDocument() // Meets
  })

  it('displays size distribution correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Check size distribution
    expect(screen.getByText('Large Cap: 65')).toBeInTheDocument()
    expect(screen.getByText('Mid Cap: 40')).toBeInTheDocument()
    expect(screen.getByText('Small Cap: 20')).toBeInTheDocument()
  })

  it('displays time distribution correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Check time distribution
    expect(screen.getByText('Before Market: 60')).toBeInTheDocument()
    expect(screen.getByText('After Market: 55')).toBeInTheDocument()
    expect(screen.getByText('During Market: 10')).toBeInTheDocument()
  })

  it('displays top gainers and losers', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Check top gainers
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('+8.5%')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('+6.2%')).toBeInTheDocument()
    
    // Check top losers
    expect(screen.getByText('META')).toBeInTheDocument()
    expect(screen.getByText('-4.8%')).toBeInTheDocument()
    expect(screen.getByText('NFLX')).toBeInTheDocument()
    expect(screen.getByText('-3.2%')).toBeInTheDocument()
  })

  it('calculates beat rate percentage correctly', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Beat rate should be 75/125 = 60%
    expect(screen.getByText('60%')).toBeInTheDocument()
  })

  it('handles empty stats data gracefully', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { 
        data: {
          totalEarnings: 0,
          totalRevenue: 0,
          totalMarketCap: 0,
          topGainers: [],
          topLosers: []
        }, 
        success: true 
      },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    expect(screen.getByText('No stats available')).toBeInTheDocument()
  })

  it('displays stat cards with proper formatting', () => {
    const mockSWR = require('swr').default
    mockSWR.mockReturnValue({
      data: { data: mockStatsData, success: true },
      error: null,
      isLoading: false,
    })

    render(<EarningsStats />)
    
    // Check if stat cards are rendered
    const statCards = screen.getAllByTestId('stat-card')
    expect(statCards).toHaveLength(6) // Should have 6 main stat cards
    
    // Check card titles
    expect(screen.getByText('Total Earnings')).toBeInTheDocument()
    expect(screen.getByText('Total Revenue')).toBeInTheDocument()
    expect(screen.getByText('Total Market Cap')).toBeInTheDocument()
    expect(screen.getByText('Avg EPS Surprise')).toBeInTheDocument()
    expect(screen.getByText('Beat Rate')).toBeInTheDocument()
  })

  it('updates stats when date changes', async () => {
    const mockSWR = require('swr').default
    let callCount = 0
    
    mockSWR.mockImplementation(() => {
      callCount++
      return {
        data: { 
          data: { 
            ...mockStatsData, 
            totalEarnings: callCount === 1 ? 125 : 150 
          }, 
          success: true 
        },
        error: null,
        isLoading: false,
      }
    })

    const { rerender } = render(<EarningsStats />)
    
    expect(screen.getByText('125')).toBeInTheDocument()
    
    // Simulate date change by rerendering
    rerender(<EarningsStats />)
    
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })
})
