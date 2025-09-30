module.exports = {
  apps: [{
    name: 'earningstable',
    script: 'npm',
    args: 'start',
    cwd: '/path/to/your/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      FINNHUB_API_KEY: 'd28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0',
      POLYGON_API_KEY: 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
      DATABASE_URL: 'file:./prisma/dev.db',
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      FINNHUB_API_KEY: 'd28f1dhr01qjsuf342ogd28f1dhr01qjsuf342p0',
      POLYGON_API_KEY: 'Vi_pMLcusE8RA_SUvkPAmiyziVzlmOoX',
      DATABASE_URL: 'file:./prisma/dev.db',
      NEXT_TELEMETRY_DISABLED: '1',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
