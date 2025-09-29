/**
 * 📊 Monitoring Metrics Endpoint
 * Exports application metrics in Prometheus format
 */

import { NextResponse } from 'next/server'
import { getMonitoring } from '@/lib/monitoring'

export async function GET() {
  try {
    const monitoring = getMonitoring()
    const data = monitoring.exportData()
    
    // Convert to Prometheus format
    const prometheusMetrics = convertToPrometheusFormat(data)
    
    return new Response(prometheusMetrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Metrics unavailable',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}

function convertToPrometheusFormat(data: any): string {
  const lines: string[] = []
  
  // Add metadata
  lines.push('# HELP earnings_table_info Application information')
  lines.push('# TYPE earnings_table_info gauge')
  lines.push(`earnings_table_info{version="${data.config.version}",environment="${data.config.environment}"} 1`)
  lines.push('')
  
  // Process metrics
  if (data.metrics && data.metrics.length > 0) {
    const metricGroups = groupMetricsByName(data.metrics)
    
    for (const [metricName, metrics] of Object.entries(metricGroups)) {
      const sanitizedName = sanitizeMetricName(metricName)
      
      lines.push(`# HELP ${sanitizedName} Application metric`)
      lines.push(`# TYPE ${sanitizedName} gauge`)
      
      for (const metric of metrics as any[]) {
        const labels = formatLabels(metric.tags || {})
        const timestamp = metric.timestamp || Date.now()
        lines.push(`${sanitizedName}${labels} ${metric.value} ${timestamp}`)
      }
      lines.push('')
    }
  }
  
  // Add error metrics
  if (data.errors && data.errors.length > 0) {
    lines.push('# HELP earnings_table_errors_total Total number of errors')
    lines.push('# TYPE earnings_table_errors_total counter')
    
    const errorGroups = groupErrorsByType(data.errors)
    for (const [errorType, count] of Object.entries(errorGroups)) {
      lines.push(`earnings_table_errors_total{type="${errorType}"} ${count}`)
    }
    lines.push('')
  }
  
  // Add system metrics
  const memory = process.memoryUsage()
  lines.push('# HELP nodejs_memory_usage_bytes Node.js memory usage')
  lines.push('# TYPE nodejs_memory_usage_bytes gauge')
  lines.push(`nodejs_memory_usage_bytes{type="rss"} ${memory.rss}`)
  lines.push(`nodejs_memory_usage_bytes{type="heapTotal"} ${memory.heapTotal}`)
  lines.push(`nodejs_memory_usage_bytes{type="heapUsed"} ${memory.heapUsed}`)
  lines.push(`nodejs_memory_usage_bytes{type="external"} ${memory.external}`)
  lines.push('')
  
  lines.push('# HELP nodejs_process_uptime_seconds Node.js process uptime')
  lines.push('# TYPE nodejs_process_uptime_seconds gauge')
  lines.push(`nodejs_process_uptime_seconds ${process.uptime()}`)
  
  return lines.join('\n')
}

function groupMetricsByName(metrics: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  
  for (const metric of metrics) {
    if (!groups[metric.name]) {
      groups[metric.name] = []
    }
    groups[metric.name].push(metric)
  }
  
  return groups
}

function groupErrorsByType(errors: any[]): Record<string, number> {
  const groups: Record<string, number> = {}
  
  for (const error of errors) {
    const errorType = error.error?.name || 'UnknownError'
    groups[errorType] = (groups[errorType] || 0) + 1
  }
  
  return groups
}

function sanitizeMetricName(name: string): string {
  return `earnings_table_${name.replace(/[^a-zA-Z0-9_]/g, '_')}`
}

function formatLabels(tags: Record<string, string>): string {
  const labelPairs = Object.entries(tags)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',')
  
  return labelPairs ? `{${labelPairs}}` : ''
}
