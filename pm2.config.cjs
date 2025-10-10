/**
 * 🔒 PM2 ECOSYSTEM CONFIG - 1:1 PARITY S LOCALHOST
 *
 * Tento config zabezpečuje identické správanie localhost ↔ production
 * Presne 3 procesy: web, scheduler, watchdog
 */

module.exports = {
  apps: [
    {
      name: "web",
      script: "npm",
      args: "start:prod",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/web-err.log",
      out_file: "./logs/web-out.log",
      log_file: "./logs/web-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "scheduler",
      script: "npm",
      args: "run cron:start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        TZ: "America/New_York",
      },
      error_file: "./logs/scheduler-err.log",
      out_file: "./logs/scheduler-out.log",
      log_file: "./logs/scheduler-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "watchdog",
      script: "npm",
      args: "run watchdog:start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        WATCHDOG_MODE: "daemon",
        WATCHDOG_INTERVAL_MS: "300000",
        TZ: "America/New_York",
      },
      error_file: "./logs/watchdog-err.log",
      out_file: "./logs/watchdog-out.log",
      log_file: "./logs/watchdog-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
