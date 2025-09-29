/**
 * 📊 DATA QUALITY MONITOR
 * Monitoring systém pre sledovanie kvality dát
 */

import { DataQualityIssue } from '../validation/data-quality.validator'
import { FallbackResult } from '../fallback/data-fallback.service'

export interface DataQualityMetrics {
  timestamp: Date
  totalRecords: number
  validRecords: number
  invalidRecords: number
  qualityScore: number
  issuesByType: Record<string, number>
  issuesBySeverity: Record<string, number>
  fallbacksApplied: number
  criticalIssues: number
  highIssues: number
  mediumIssues: number
  lowIssues: number
}

export interface DataQualityAlert {
  id: string
  timestamp: Date
  type: 'QUALITY_DROP' | 'CRITICAL_ISSUES' | 'FALLBACK_OVERUSE' | 'API_ERRORS'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  metrics: Partial<DataQualityMetrics>
  ticker?: string
  resolved: boolean
}

export class DataQualityMonitor {
  private static metrics: DataQualityMetrics[] = []
  private static alerts: DataQualityAlert[] = []
  private static readonly MAX_METRICS_HISTORY = 100
  private static readonly MAX_ALERTS_HISTORY = 50

  /**
   * Nahrá nové metriky
   */
  static recordMetrics(
    totalRecords: number,
    validRecords: number,
    issues: DataQualityIssue[],
    fallbackResults: FallbackResult[]
  ): void {
    const invalidRecords = totalRecords - validRecords
    const qualityScore = totalRecords > 0 ? (validRecords / totalRecords) * 100 : 100
    
    // Počítať issues podľa typu
    const issuesByType: Record<string, number> = {}
    const issuesBySeverity: Record<string, number> = {}
    
    issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1
    })
    
    const fallbacksApplied = fallbackResults.reduce((sum, result) => 
      sum + result.appliedStrategies.length, 0
    )
    
    const metrics: DataQualityMetrics = {
      timestamp: new Date(),
      totalRecords,
      validRecords,
      invalidRecords,
      qualityScore,
      issuesByType,
      issuesBySeverity,
      fallbacksApplied,
      criticalIssues: issuesBySeverity.CRITICAL || 0,
      highIssues: issuesBySeverity.HIGH || 0,
      mediumIssues: issuesBySeverity.MEDIUM || 0,
      lowIssues: issuesBySeverity.LOW || 0
    }
    
    this.metrics.push(metrics)
    
    // Udržiavať len posledné metriky
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_HISTORY)
    }
    
    // Kontrolovať alerty
    this.checkAlerts(metrics)
    
    // Logovať súhrn
    this.logMetrics(metrics)
  }

  /**
   * Kontroluje či treba vytvoriť alert
   */
  private static checkAlerts(metrics: DataQualityMetrics): void {
    // Alert pre kritické issues
    if (metrics.criticalIssues > 0) {
      this.createAlert({
        type: 'CRITICAL_ISSUES',
        severity: 'CRITICAL',
        message: `${metrics.criticalIssues} critical data quality issues detected`,
        metrics
      })
    }
    
    // Alert pre pokles kvality
    if (metrics.qualityScore < 80) {
      this.createAlert({
        type: 'QUALITY_DROP',
        severity: metrics.qualityScore < 50 ? 'HIGH' : 'MEDIUM',
        message: `Data quality dropped to ${metrics.qualityScore.toFixed(1)}%`,
        metrics
      })
    }
    
    // Alert pre nadmerné použitie fallbackov
    if (metrics.fallbacksApplied > metrics.totalRecords * 0.5) {
      this.createAlert({
        type: 'FALLBACK_OVERUSE',
        severity: 'MEDIUM',
        message: `High fallback usage: ${metrics.fallbacksApplied} fallbacks for ${metrics.totalRecords} records`,
        metrics
      })
    }
    
    // Alert pre vysoké množstvo high issues
    if (metrics.highIssues > metrics.totalRecords * 0.2) {
      this.createAlert({
        type: 'API_ERRORS',
        severity: 'HIGH',
        message: `${metrics.highIssues} high severity issues detected`,
        metrics
      })
    }
  }

  /**
   * Vytvorí nový alert
   */
  private static createAlert(alertData: Omit<DataQualityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: DataQualityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData
    }
    
    this.alerts.push(alert)
    
    // Udržiavať len posledné alerty
    if (this.alerts.length > this.MAX_ALERTS_HISTORY) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS_HISTORY)
    }
    
    // Logovať alert
    this.logAlert(alert)
  }

  /**
   * Loguje metriky
   */
  private static logMetrics(metrics: DataQualityMetrics): void {
    const emoji = metrics.qualityScore >= 90 ? '🟢' : 
                  metrics.qualityScore >= 70 ? '🟡' : 
                  metrics.qualityScore >= 50 ? '🟠' : '🔴'
    
    console.log(`📊 [DATA QUALITY] ${emoji} Quality: ${metrics.qualityScore.toFixed(1)}% | ` +
                `Valid: ${metrics.validRecords}/${metrics.totalRecords} | ` +
                `Issues: ${metrics.criticalIssues}C ${metrics.highIssues}H ${metrics.mediumIssues}M ${metrics.lowIssues}L | ` +
                `Fallbacks: ${metrics.fallbacksApplied}`)
  }

  /**
   * Loguje alert
   */
  private static logAlert(alert: DataQualityAlert): void {
    const emoji = alert.severity === 'CRITICAL' ? '🚨' :
                  alert.severity === 'HIGH' ? '⚠️' :
                  alert.severity === 'MEDIUM' ? '⚡' : 'ℹ️'
    
    console.log(`${emoji} [DATA QUALITY ALERT] ${alert.severity}: ${alert.message}`)
  }

  /**
   * Vráti posledné metriky
   */
  static getLatestMetrics(): DataQualityMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  /**
   * Vráti všetky metriky
   */
  static getAllMetrics(): DataQualityMetrics[] {
    return [...this.metrics]
  }

  /**
   * Vráti nevyriešené alerty
   */
  static getActiveAlerts(): DataQualityAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Vráti všetky alerty
   */
  static getAllAlerts(): DataQualityAlert[] {
    return [...this.alerts]
  }

  /**
   * Označí alert ako vyriešený
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      console.log(`✅ [DATA QUALITY] Alert ${alertId} resolved`)
      return true
    }
    return false
  }

  /**
   * Vráti trend kvality dát
   */
  static getQualityTrend(hours: number = 24): { timestamp: Date; qualityScore: number }[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics
      .filter(m => m.timestamp >= cutoff)
      .map(m => ({ timestamp: m.timestamp, qualityScore: m.qualityScore }))
  }

  /**
   * Vráti štatistiky pre API endpoint
   */
  static getApiStats(): {
    totalRecords: number
    averageQuality: number
    activeAlerts: number
    topIssues: Array<{ type: string; count: number }>
  } {
    const latest = this.getLatestMetrics()
    if (!latest) {
      return {
        totalRecords: 0,
        averageQuality: 0,
        activeAlerts: 0,
        topIssues: []
      }
    }
    
    const topIssues = Object.entries(latest.issuesByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }))
    
    return {
      totalRecords: latest.totalRecords,
      averageQuality: latest.qualityScore,
      activeAlerts: this.getActiveAlerts().length,
      topIssues
    }
  }

  /**
   * Vyčistí staré dáta
   */
  static cleanup(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 dní
    
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff)
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff)
    
    console.log(`🧹 [DATA QUALITY] Cleaned up old metrics and alerts`)
  }
}
