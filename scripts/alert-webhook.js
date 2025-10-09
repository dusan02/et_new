#!/usr/bin/env node

/**
 * Alert Webhook Script
 * Sends alerts for critical system issues
 */

import { config } from "dotenv";
import { getJSON } from "../src/lib/redis.js";
import { logger } from "../src/lib/logger.js";

// Load environment variables
config();

const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

interface AlertData {
  type: "coverage_low" | "publish_stale" | "system_error";
  message: string;
  severity: "warning" | "critical";
  data?: any;
}

async function sendAlert(alert: AlertData) {
  if (!WEBHOOK_URL && !ALERT_EMAIL) {
    logger.warn("No webhook URL or email configured for alerts");
    return;
  }

  const payload = {
    text: `🚨 Earnings Table Alert: ${alert.message}`,
    attachments: [
      {
        color: alert.severity === "critical" ? "danger" : "warning",
        fields: [
          { title: "Type", value: alert.type, short: true },
          { title: "Severity", value: alert.severity, short: true },
          { title: "Time", value: new Date().toISOString(), short: true },
        ],
        data: alert.data,
      },
    ],
  };

  try {
    if (WEBHOOK_URL) {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }
    }

    logger.info("Alert sent successfully", {
      type: alert.type,
      severity: alert.severity,
    });
  } catch (error) {
    logger.error("Failed to send alert:", error);
  }
}

async function checkPublishFreshness() {
  try {
    const meta = await getJSON("earnings:latest:meta");

    if (!meta || !meta.publishedAt) {
      await sendAlert({
        type: "publish_stale",
        message: "No published data found",
        severity: "critical",
      });
      return;
    }

    const publishedAt = new Date(meta.publishedAt);
    const ageMinutes = Math.floor(
      (Date.now() - publishedAt.getTime()) / (1000 * 60)
    );

    if (ageMinutes > 60) {
      await sendAlert({
        type: "publish_stale",
        message: `Published data is ${ageMinutes} minutes old`,
        severity: "critical",
        data: { ageMinutes, publishedAt: meta.publishedAt },
      });
    }
  } catch (error) {
    logger.error("Error checking publish freshness:", error);
  }
}

async function checkCoverage() {
  try {
    const meta = await getJSON("earnings:latest:meta");

    if (!meta || !meta.coverage) {
      return;
    }

    const { coverage } = meta;
    const now = new Date();
    const hour = now.getUTCHours();
    const isAfterMarketOpen = hour >= 15; // 10:00 ET = 15:00 UTC
    const isAfterMarketClose = hour >= 21; // 16:00 ET = 21:00 UTC

    // Check price coverage after market open
    if (isAfterMarketOpen && coverage.price < 90) {
      await sendAlert({
        type: "coverage_low",
        message: `Price coverage is ${coverage.price}% (threshold: 90%)`,
        severity: "warning",
        data: { coverage, threshold: 90 },
      });
    }

    // Check EPS/REV coverage after market close
    if (isAfterMarketClose && coverage.epsRev < 70) {
      await sendAlert({
        type: "coverage_low",
        message: `EPS/REV coverage is ${coverage.epsRev}% (threshold: 70%)`,
        severity: "warning",
        data: { coverage, threshold: 70 },
      });
    }
  } catch (error) {
    logger.error("Error checking coverage:", error);
  }
}

async function main() {
  logger.info("Starting alert checks...");

  await Promise.all([checkPublishFreshness(), checkCoverage()]);

  logger.info("Alert checks completed");
}

main().catch((error) => {
  logger.error("Alert script failed:", error);
  process.exit(1);
});
