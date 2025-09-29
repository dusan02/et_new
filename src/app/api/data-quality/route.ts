/**
 * 📊 DATA QUALITY API ENDPOINT
 * Poskytuje metriky a alerty pre data quality monitoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { DataQualityMonitor } from '@/modules/shared/monitoring/data-quality-monitor'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'metrics'
    
    switch (action) {
      case 'metrics':
        return getMetrics()
      
      case 'alerts':
        return getAlerts()
      
      case 'trend':
        return getTrend(searchParams)
      
      case 'stats':
        return getStats()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: metrics, alerts, trend, stats' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Data quality API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getMetrics() {
  const latestMetrics = DataQualityMonitor.getLatestMetrics()
  const allMetrics = DataQualityMonitor.getAllMetrics()
  
  return NextResponse.json({
    success: true,
    data: {
      latest: latestMetrics,
      history: allMetrics.slice(-10), // Posledných 10 záznamov
      summary: {
        totalMeasurements: allMetrics.length,
        averageQuality: allMetrics.length > 0 
          ? allMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / allMetrics.length 
          : 0,
        lastUpdate: latestMetrics?.timestamp || null
      }
    }
  })
}

async function getAlerts() {
  const activeAlerts = DataQualityMonitor.getActiveAlerts()
  const allAlerts = DataQualityMonitor.getAllAlerts()
  
  return NextResponse.json({
    success: true,
    data: {
      active: activeAlerts,
      all: allAlerts.slice(-20), // Posledných 20 alertov
      summary: {
        totalAlerts: allAlerts.length,
        activeAlerts: activeAlerts.length,
        criticalAlerts: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
        highAlerts: activeAlerts.filter(a => a.severity === 'HIGH').length
      }
    }
  })
}

async function getTrend(searchParams: URLSearchParams) {
  const hours = parseInt(searchParams.get('hours') || '24')
  const trend = DataQualityMonitor.getQualityTrend(hours)
  
  return NextResponse.json({
    success: true,
    data: {
      trend,
      period: `${hours} hours`,
      summary: {
        dataPoints: trend.length,
        averageQuality: trend.length > 0 
          ? trend.reduce((sum, t) => sum + t.qualityScore, 0) / trend.length 
          : 0,
        minQuality: trend.length > 0 ? Math.min(...trend.map(t => t.qualityScore)) : 0,
        maxQuality: trend.length > 0 ? Math.max(...trend.map(t => t.qualityScore)) : 0
      }
    }
  })
}

async function getStats() {
  const stats = DataQualityMonitor.getApiStats()
  
  return NextResponse.json({
    success: true,
    data: stats
  })
}

// POST endpoint pre riešenie alertov
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, alertId } = body
    
    if (action === 'resolve_alert' && alertId) {
      const resolved = DataQualityMonitor.resolveAlert(alertId)
      
      if (resolved) {
        return NextResponse.json({
          success: true,
          message: `Alert ${alertId} resolved successfully`
        })
      } else {
        return NextResponse.json(
          { error: 'Alert not found' },
          { status: 404 }
        )
      }
    }
    
    if (action === 'cleanup') {
      DataQualityMonitor.cleanup()
      return NextResponse.json({
        success: true,
        message: 'Old data cleaned up successfully'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: resolve_alert, cleanup' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Data quality POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
