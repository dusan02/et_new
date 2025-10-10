/**
 * 🚨 Alerting System
 * Centralized alerting for pipeline health monitoring
 */

export interface AlertConfig {
  webhookUrl?: string;
  slackChannel?: string;
  email?: string;
}

export class AlertManager {
  private config: AlertConfig;

  constructor(config: AlertConfig = {}) {
    this.config = config;
  }

  /**
   * Send alert when Finnhub returns data but DB is empty
   */
  async alertDataInconsistency(finnhubCount: number, dbCount: number, date: string) {
    if (finnhubCount > 0 && dbCount === 0) {
      const message = `🚨 [ALERT] Data inconsistency detected!\n` +
        `📅 Date: ${date}\n` +
        `📊 Finnhub returned: ${finnhubCount} tickers\n` +
        `💾 Database has: ${dbCount} tickers\n` +
        `🔍 Possible causes: DB write failure, timezone mismatch, or fetch job error`;
      
      await this.sendAlert('WARN', message);
    }
  }

  /**
   * Send alert when DB has data but API returns 0
   */
  async alertApiInconsistency(dbCount: number, apiCount: number, date: string) {
    if (dbCount > 0 && apiCount === 0) {
      const message = `🚨 [ALERT] API inconsistency detected!\n` +
        `📅 Date: ${date}\n` +
        `💾 Database has: ${dbCount} tickers\n` +
        `🌐 API returned: ${apiCount} tickers\n` +
        `🔍 Possible causes: API route error, cache issue, or date range mismatch`;
      
      await this.sendAlert('ERROR', message);
    }
  }

  /**
   * Send alert when data is stale during market hours
   */
  async alertStaleData(lastUpdated: Date, thresholdMinutes: number = 15) {
    const now = new Date();
    const ageMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    
    if (ageMinutes > thresholdMinutes) {
      const message = `⚠️ [ALERT] Data is stale!\n` +
        `🕐 Last updated: ${lastUpdated.toISOString()}\n` +
        `⏰ Age: ${Math.round(ageMinutes)} minutes\n` +
        `🔍 Possible causes: Cron job failure, API rate limits, or system issues`;
      
      await this.sendAlert('WARN', message);
    }
  }

  /**
   * Send daily health summary
   */
  async sendDailySummary(stats: {
    finnhub: number;
    db: number;
    published: number;
    api: number;
    date: string;
    duration: number;
  }) {
    const status = stats.finnhub === stats.db && stats.db === stats.api ? '✅' : '⚠️';
    
    const message = `${status} [DAILY] finnhub=${stats.finnhub} db=${stats.db} published=${stats.published} api=${stats.api} tz=UTC duration=${stats.duration}ms`;
    
    console.log(message);
    
    // Send to webhook if configured
    if (this.config.webhookUrl) {
      await this.sendWebhook({
        text: message,
        stats,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async sendAlert(level: 'WARN' | 'ERROR', message: string) {
    console.error(`[ALERT][${level}] ${message}`);
    
    if (this.config.webhookUrl) {
      await this.sendWebhook({
        text: `[${level}] ${message}`,
        level,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async sendWebhook(payload: any) {
    if (!this.config.webhookUrl) return;

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`Failed to send webhook: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }
}

// Global alert manager instance
export const alertManager = new AlertManager({
  webhookUrl: process.env.ALERT_WEBHOOK_URL,
});
