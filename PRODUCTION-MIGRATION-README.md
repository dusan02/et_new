# 🚀 Production Migration Guide - 1:1 Parity with Localhost

## 📋 Overview

This guide ensures **identical** configuration between localhost and production environments:

- ✅ Same database tables (Prisma migrations)
- ✅ Same API endpoints (`/api/earnings/today`, `/api/earnings/stats`, `/api/health`)
- ✅ Same runtime (PM2 processes, **no** system `crontab`)
- ✅ Same Redis flow: `:staging → :published` (atomic rename)
- ✅ All infrastructure defined **in repo** (idempotent scripts)

## 🏗️ Infrastructure Files

### Core Configuration
- `docker-compose.yml` - Redis service with persistence (port 6379)
- `pm2.config.cjs` - Exactly 3 processes: `web`, `scheduler`, `watchdog`
- `env.production.example` - Complete environment template

### Deployment Scripts
- `deploy-production.sh` - Idempotent production deployment
- `rollback-production.sh` - Rollback with Redis data recovery
- `scripts/production-sanity-check.js` - Automated health verification

## 🔧 PM2 Process Configuration

```javascript
// pm2.config.cjs
{
  apps: [
    { name: "web", script: "npm", args: "start:prod" },           // Next.js server (port 3000)
    { name: "scheduler", script: "npm", args: "run cron:start" }, // Cron scheduler
    { name: "watchdog", script: "npm", args: "run watchdog:start" } // Daemon mode
  ]
}
```

## 📦 Required Environment Variables

Copy `env.production.example` to `.env.production` and fill in:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/earnings_table_prod"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys (REPLACE WITH REAL KEYS)
POLYGON_API_KEY="your_polygon_api_key_here"
FINNHUB_API_KEY="your_finnhub_api_key_here"

# Data Quality Thresholds
DQ_SCHEDULE_THRESHOLD=95
DQ_PRICE_THRESHOLD=98
DQ_EPSREV_THRESHOLD=90

# Node Environment
NODE_ENV=production
PORT=3000
TZ="America/New_York"
```

## 🚀 Deployment Process

### 1. Prepare Environment
```bash
# On VPS server
cd /opt/earningstable/app
cp env.production.example .env.production
# Edit .env.production with real values
```

### 2. Deploy (Idempotent)
```bash
npm run deploy:prod
```

This script will:
1. ✅ Start Redis with Docker Compose
2. ✅ Install dependencies (`npm ci`)
3. ✅ Deploy database migrations (`npx prisma migrate deploy`)
4. ✅ Build application (`npm run build`)
5. ✅ Run parity check (`npm run parity:check`)
6. ✅ Start/restart PM2 processes
7. ✅ Warm-up processes (prices, EPS/Revenue, publish)
8. ✅ Run smoke test
9. ✅ Run production sanity check

### 3. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check health
curl http://localhost:3000/api/health

# Check earnings data
curl http://localhost:3000/api/earnings/today
```

## 🔄 Rollback Process

```bash
# Rollback to previous commit
npm run rollback:prod HEAD~1

# Rollback to specific tag
npm run rollback:prod v1.2.3
```

## 🧪 Testing & Validation

### Manual Health Checks
```bash
# API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/earnings/today
curl http://localhost:3000/api/earnings/stats

# PM2 processes
pm2 status

# Redis connection
docker compose exec redis redis-cli ping
```

### Automated Sanity Check
```bash
npm run sanity:check
```

## 🔒 Parity Guarantees

### Cron Jobs
- ✅ All cron jobs run via **PM2** (`scheduler` process)
- ✅ **No** system `crontab` entries
- ✅ Graceful shutdown with Redis/DB cleanup

### API Endpoints
- ✅ No URL or payload changes
- ✅ Frontend reads **only** from `:published` Redis keys
- ✅ Same response format as localhost

### Redis Flow
- ✅ Production uses real Redis (not mock)
- ✅ Atomic operations: `:staging → :published`
- ✅ Automatic fallback to database if Redis fails

### Environment
- ✅ `REDIS_URL` from `.env.production`
- ✅ No localhost-specific configurations
- ✅ Same timezone handling (`America/New_York`)

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   ```bash
   docker compose up -d redis
   docker compose exec redis redis-cli ping
   ```

2. **PM2 Processes Not Starting**
   ```bash
   pm2 delete all
   pm2 start pm2.config.cjs
   pm2 save
   ```

3. **Database Migration Failed**
   ```bash
   npx prisma migrate deploy
   npx prisma db push
   ```

4. **API Endpoints Not Responding**
   ```bash
   curl -v http://localhost:3000/api/health
   pm2 logs web
   ```

### Logs
```bash
# PM2 logs
pm2 logs web
pm2 logs scheduler
pm2 logs watchdog

# Application logs
tail -f logs/web-combined.log
tail -f logs/scheduler-combined.log
tail -f logs/watchdog-combined.log
```

## 📊 Success Criteria

After deployment, verify:

- ✅ `curl http://localhost:3000/api/health` → `{"status":"healthy"}`
- ✅ `curl http://localhost:3000/api/earnings/today` → Data exists
- ✅ `pm2 status` → 3 processes running
- ✅ `docker compose exec redis redis-cli ping` → `PONG`
- ✅ No API keys in logs (masked query parameters)
- ✅ Smoke test passes

## 🔧 Maintenance

### Daily Operations
- Monitor PM2 processes: `pm2 status`
- Check Redis: `docker compose exec redis redis-cli info`
- Review logs: `pm2 logs --lines 100`

### Weekly Operations
- Run sanity check: `npm run sanity:check`
- Backup data: `npm run backup`
- Update dependencies: `npm ci && npm run build`

---

**🎯 Goal**: Production environment that is **1:1 identical** to localhost, with no manual configuration or system-level changes required.
