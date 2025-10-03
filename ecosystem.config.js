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
        PORT: 3000,
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
      },
      error_file: "./logs/cron-err.log",
      out_file: "./logs/cron-out.log",
      log_file: "./logs/cron-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
