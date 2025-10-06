module.exports = {
  apps: [
    {
      name: "earnings-table",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: "/var/www/earnings-table",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/app-error.log",
      out_file: "logs/app-out.log",
      time: true,
    },
    {
      name: "earnings-cron",
      script: "node",
      args: "scripts/cron.js",
      cwd: "/var/www/earnings-table",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "logs/cron-error.log",
      out_file: "logs/cron-out.log",
      time: true,
    },
  ],
};
