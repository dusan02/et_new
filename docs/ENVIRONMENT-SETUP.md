# 🔧 Environment Setup Guide

## Environment Variables Loading Order

### Development (`npm run dev`)

Next.js automatically loads environment variables in this order:

1. `.env.local` (highest priority)
2. `.env.development.local`
3. `.env.development`
4. `.env` (lowest priority)

### Production (`npm run start`)

1. `.env.production.local`
2. `.env.production`
3. `.env.local`
4. `.env`

### Scripts (cron, jobs, tests)

Use `dotenv-cli` to ensure consistent environment loading:

```bash
# Development
dotenv -e .env.local -- tsx scripts/cron-scheduler.ts

# Production
dotenv -e .env.production -- tsx scripts/cron-scheduler.ts
```

## Required Environment Variables

### Core Application

```bash
NODE_ENV=development|production
DATABASE_URL=file:./prisma/dev.db
```

### API Keys

```bash
FINNHUB_API_KEY=your_finnhub_key
POLYGON_API_KEY=your_polygon_key
```

### Optional

```bash
REDIS_URL=redis://localhost:6379
ALERT_WEBHOOK_URL=https://hooks.slack.com/...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Production Deployment

### Systemd Service

```ini
[Unit]
Description=Earnings Table API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/earnings-table
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:/var/www/earnings-table/prisma/dev.db
Environment=FINNHUB_API_KEY=your_key
Environment=POLYGON_API_KEY=your_key
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### PM2 Ecosystem

```javascript
module.exports = {
  apps: [
    {
      name: "earnings-table",
      script: "npm",
      args: "start",
      cwd: "/var/www/earnings-table",
      env: {
        NODE_ENV: "production",
        DATABASE_URL: "file:/var/www/earnings-table/prisma/dev.db",
        FINNHUB_API_KEY: "your_key",
        POLYGON_API_KEY: "your_key",
      },
    },
  ],
};
```

## Environment Validation

The application uses a centralized environment loader (`src/lib/env.ts`) that:

- Validates required variables using Zod
- Provides type-safe access to environment variables
- Fails fast with clear error messages if validation fails

## Troubleshooting

### Environment Variables Not Loading

1. Check file permissions and location
2. Verify variable names (case-sensitive)
3. Ensure no spaces around `=` in `.env` files
4. Restart the application after changes

### Different Environments

- Development: Uses `.env.local` or `.env`
- Production: Uses system environment variables or `.env.production`
- Scripts: Use `dotenv-cli` for explicit file loading

### Validation Errors

Check the console output for specific validation errors:

```
❌ [ENV][ERROR] Invalid environment configuration:
{
  DATABASE_URL: [ 'Invalid input: expected string, received undefined' ]
}
```
