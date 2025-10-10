/**
 * Observability and Metrics Collection
 * Simple metrics collection for production monitoring
 */

interface Metric {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

// In-memory metrics store (in production, use Prometheus/DataDog/etc.)
const metrics: Metric[] = [];

// Metric collection functions
export function recordMetric(name: string, value: number, labels?: Record<string, string>) {
  metrics.push({
    name,
    value,
    labels,
    timestamp: new Date()
  });
  
  // Keep only last 1000 metrics to prevent memory leaks
  if (metrics.length > 1000) {
    metrics.splice(0, metrics.length - 1000);
  }
  
  console.log(`[METRIC] ${name}=${value} ${labels ? JSON.stringify(labels) : ''}`);
}

// Specific metric functions
export function recordEarningsIngest(source: string, count: number) {
  recordMetric('earnings_ingest_count', count, { source });
}

export function recordEarningsPublish(total: number) {
  recordMetric('earnings_publish_total', total);
}

export function recordApiLatency(endpoint: string, latencyMs: number) {
  recordMetric('earnings_api_latency_ms', latencyMs, { endpoint });
}

export function recordApiCount(endpoint: string, status: string) {
  recordMetric('earnings_api_count', 1, { endpoint, status });
}

export function recordApiError(endpoint: string, error: string) {
  recordMetric('earnings_api_errors', 1, { endpoint, error });
}

// Health check functions
export function getHealthMetrics() {
  const now = new Date();
  const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
  
  const recentMetrics = metrics.filter(m => m.timestamp >= last5Minutes);
  
  const ingestCount = recentMetrics
    .filter(m => m.name === 'earnings_ingest_count')
    .reduce((sum, m) => sum + m.value, 0);
    
  const publishCount = recentMetrics
    .filter(m => m.name === 'earnings_publish_total')
    .reduce((sum, m) => sum + m.value, 0);
    
  const errorCount = recentMetrics
    .filter(m => m.name === 'earnings_api_errors')
    .reduce((sum, m) => sum + m.value, 0);
    
  const avgLatency = recentMetrics
    .filter(m => m.name === 'earnings_api_latency_ms')
    .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);
  
  return {
    ingestCount,
    publishCount,
    errorCount,
    avgLatency: Math.round(avgLatency),
    totalMetrics: recentMetrics.length
  };
}

// Alert conditions
export function checkAlerts() {
  const health = getHealthMetrics();
  const alerts: string[] = [];
  
  // Check if ingest count is 0 (after 9:30 ET / 2h window)
  const now = new Date();
  const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const isAfter930ET = nyTime.getHours() >= 9 && nyTime.getMinutes() >= 30;
  const isWithin2HourWindow = nyTime.getHours() < 11;
  
  if (isAfter930ET && isWithin2HourWindow && health.ingestCount === 0) {
    alerts.push('earnings_ingest_count == 0 after 9:30 ET');
  }
  
  // Check if publish count is 0 when ingest count > 0
  if (health.ingestCount > 0 && health.publishCount === 0) {
    alerts.push('earnings_publish_total == 0 when ingest_count > 0');
  }
  
  // Check for high error rate
  if (health.errorCount > 10) {
    alerts.push(`High error rate: ${health.errorCount} errors in last 5 minutes`);
  }
  
  // Check for high latency
  if (health.avgLatency > 5000) {
    alerts.push(`High latency: ${health.avgLatency}ms average`);
  }
  
  return alerts;
}

// Export metrics for external monitoring
export function exportMetrics() {
  return {
    metrics: metrics.slice(-100), // Last 100 metrics
    health: getHealthMetrics(),
    alerts: checkAlerts()
  };
}
