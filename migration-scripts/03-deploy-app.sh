#!/bin/bash

# 🚀 Fáza 3: Nasadenie Aplikácie z GitHub
# Spusti na: root@89.185.250.213

set -e

echo "📦 === FÁZA 3: NASADENIE APLIKÁCIE ==="

# Farby pre výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Konfiguračné premenné
GITHUB_REPO="https://github.com/dusan02/et_new.git"
APP_DIR="/var/www/earnings-table"
ENV_FILE="/etc/earnings-table/production.env"

log "Kontrola existencie .env súboru..."
if [ ! -f "$ENV_FILE" ]; then
    error ".env súbor neexistuje! Najprv spusti 02-setup-database.sh"
fi

log "Presun do aplikačného priečinka..."
cd /var/www

# Odstránenie starého priečinka ak existuje
if [ -d "earnings-table" ]; then
    log "Odstránenie starého nasadenia..."
    rm -rf earnings-table
fi

log "Klonovanie z GitHub..."
git clone "$GITHUB_REPO" earnings-table
cd earnings-table

# Nastavenie správnych vlastníctiev
chown -R www-data:www-data "$APP_DIR"

log "Inštalácia npm závislostí..."
# Prepnutie na www-data používateľa pre inštaláciu
sudo -u www-data npm install --production

log "Kopírovanie produkčného .env súboru..."
sudo -u www-data cp "$ENV_FILE" "$APP_DIR/.env"

# Vytvorenie produkčnej Prisma schémy pre PostgreSQL
log "Príprava Prisma schémy pre PostgreSQL..."
sudo -u www-data cat > "$APP_DIR/prisma/schema.prod.prisma" << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

/// ENUMY - PostgreSQL podporuje enums
enum ReportTime {
  BMO
  AMC
  TNS
}

enum CompanySize {
  Large
  Mid
  Small
}

/// Základná tabuľka s dnešnými earnings (kalendár)
model EarningsTickersToday {
  reportDate        DateTime
  ticker            String
  reportTime        ReportTime?
  epsActual         Float?
  epsEstimate       Float?
  revenueActual     BigInt?
  revenueEstimate   BigInt?
  sector            String?
  companyType       String?
  dataSource        String?
  sourcePriority    Int?
  fiscalPeriod      String?    // Q1, Q2, Q3, Q4, FY, H1, H2
  fiscalYear        Int?
  primaryExchange   String?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  @@id([reportDate, ticker])
  @@index([reportDate])
  @@index([reportDate, ticker])
  @@index([ticker])
  @@index([fiscalPeriod, fiscalYear])
  @@index([epsActual])
  @@index([revenueActual])
  @@index([reportDate, ticker, fiscalPeriod, fiscalYear])
  @@index([ticker, fiscalPeriod, fiscalYear])
  @@index([reportTime])
  @@index([sector])
  @@index([dataSource])
}

/// Pohyb/market data v deň reportu
model TodayEarningsMovements {
  ticker                   String
  reportDate               DateTime
  companyName              String
  currentPrice             Float?
  previousClose            Float?
  marketCap                BigInt?
  size                     CompanySize?
  marketCapDiff            Float?
  marketCapDiffBillions    Float?
  priceChangePercent       Float?
  sharesOutstanding        BigInt?
  updatedAt                DateTime? @default(now())
  companyType              String?
  primaryExchange          String?
  reportTime               ReportTime?

  @@id([ticker, reportDate])
  @@index([reportDate])
  @@index([reportDate, ticker])
  @@index([ticker])
  @@index([size])
  @@index([priceChangePercent])
  @@index([marketCap])
  @@index([reportDate, size])
  @@index([ticker, size])
  @@index([marketCapDiff])
  @@index([companyType])
}

/// Guidance od Benzinga/Polygon Benzinga
model BenzingaGuidance {
  id                           Int         @id @default(autoincrement())
  ticker                       String
  estimatedEpsGuidance         Float?
  estimatedRevenueGuidance     BigInt?
  epsGuideVsConsensusPct       Float?
  revenueGuideVsConsensusPct   Float?
  previousMinEpsGuidance       Float?
  previousMaxEpsGuidance       Float?
  previousMinRevenueGuidance   BigInt?
  previousMaxRevenueGuidance   BigInt?
  fiscalPeriod                 String?    // Q1, Q2, Q3, Q4, FY, H1, H2
  fiscalYear                   Int?
  releaseType                  String?
  notes                        String?
  lastUpdated                  DateTime?   @default(now())
  createdAt                    DateTime    @default(now())

  @@unique([ticker, fiscalPeriod, fiscalYear])
  @@index([ticker])
  @@index([ticker, fiscalPeriod, fiscalYear])
  @@index([fiscalPeriod, fiscalYear])
  @@index([lastUpdated])
  @@index([releaseType])
}

/// Log odmietnutých záznamov guidance (na debug)
model GuidanceImportFailures {
  id          Int       @id @default(autoincrement())
  ticker      String
  reason      String
  payload     String    // JSON string
  createdAt   DateTime  @default(now())
}
EOF

# Použitie produkčnej schémy
sudo -u www-data cp "$APP_DIR/prisma/schema.prod.prisma" "$APP_DIR/prisma/schema.prisma"

log "Generovanie Prisma client-a..."
sudo -u www-data npx prisma generate

log "Aplikovanie databázových migrácií..."
sudo -u www-data npx prisma db push

log "Build produkčnej verzie..."
sudo -u www-data npm run build

# Vytvorenie log súborov
log "Vytvorenie log súborov..."
touch /var/log/earnings-table/app.log
touch /var/log/earnings-table/error.log
touch /var/log/earnings-table/access.log
chown www-data:www-data /var/log/earnings-table/*.log

# Vytvorenie PM2 ecosystem konfigurácie
log "Vytvorenie PM2 konfigurácie..."
sudo -u www-data cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'earnings-table',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/earnings-table',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      log_file: '/var/log/earnings-table/app.log',
      error_file: '/var/log/earnings-table/error.log',
      out_file: '/var/log/earnings-table/access.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'earnings-cron',
      script: 'npm',
      args: 'run cron',
      cwd: '/var/www/earnings-table',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      cron_restart: '0 */6 * * *', // Reštart každých 6 hodín
      autorestart: true,
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: '30s'
    }
  ]
};
EOF

log "Test aplikácie..."
cd "$APP_DIR"
if sudo -u www-data npm run build > /dev/null 2>&1; then
    log "✅ Build úspešný!"
else
    warn "⚠️  Build zlyhal, ale pokračujeme..."
fi

log "🎉 FÁZA 3 DOKONČENÁ! Aplikácia je nasadená."
log "📁 Aplikácia: $APP_DIR"
log "📋 Logy: /var/log/earnings-table/"
log "Ďalej spusti: ./04-configure-production.sh"
