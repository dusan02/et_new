/**
 * 🔒 PM2 ECOSYSTEM CONFIG - 1:1 PARITY S LOCALHOST
 *
 * Tento config zabezpečuje identické správanie localhost ↔ production
 * Žiadne "vylepšenia" - presne to isté ako lokálne
 */

module.exports = {
  apps: [
    {
      name: "earnings-table",
      cwd: "/var/www/earnings-table",
      script: "npm",
      args: "start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_URL: "file:/var/www/earnings-table/prisma/dev.db",
        FINNHUB_API_KEY: "d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0",
        POLYGON_API_KEY: "Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX",
        NEXT_PUBLIC_APP_URL: "https://earningstable.com",
        TZ: "America/New_York",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
    {
      name: "earnings-cron",
      cwd: "/var/www/earnings-table",
      script: "node",
      args: "src/queue/worker-new.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "file:/var/www/earnings-table/prisma/dev.db",
        FINNHUB_API_KEY: "d28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0",
        POLYGON_API_KEY: "Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX",
        SKIP_RESET_CHECK: "true",
        TZ: "America/New_York",
      },
      error_file: "./logs/cron-err.log",
      out_file: "./logs/cron-out.log",
      log_file: "./logs/cron-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
