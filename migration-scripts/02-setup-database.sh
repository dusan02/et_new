#!/bin/bash

# 🚀 Fáza 2: Nastavenie PostgreSQL Databázy
# Spusti na: root@89.185.250.213

set -e

echo "🗄️ === FÁZA 2: NASTAVENIE DATABÁZY ==="

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
DB_NAME="earnings_table_prod"
DB_USER="earnings_user"
DB_PASSWORD="EarningsSecure2024!#"
DB_HOST="localhost"
DB_PORT="5432"

log "Konfigurácia PostgreSQL..."

# Prepnutie na postgres používateľa a vytvorenie databázy
sudo -u postgres psql << EOF
-- Vytvorenie databázy
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};

-- Vytvorenie používateľa
DROP USER IF EXISTS ${DB_USER};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';

-- Udelenie práv
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER USER ${DB_USER} CREATEDB;

-- Zobrazenie informácií
\l
\du
EOF

log "Konfigurácia PostgreSQL pre vzdialené pripojenia..."

# Backup pôvodných konfigurácií
cp /etc/postgresql/*/main/postgresql.conf /etc/postgresql/*/main/postgresql.conf.backup
cp /etc/postgresql/*/main/pg_hba.conf /etc/postgresql/*/main/pg_hba.conf.backup

# Konfigurácia postgresql.conf
POSTGRES_VERSION=$(ls /etc/postgresql/)
PG_CONF="/etc/postgresql/${POSTGRES_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${POSTGRES_VERSION}/main/pg_hba.conf"

# Povolenie pripojení
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
sed -i "s/#port = 5432/port = 5432/" "$PG_CONF"

# Konfigurácia autentifikácie
echo "host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5" >> "$PG_HBA"
echo "local   ${DB_NAME}    ${DB_USER}                     md5" >> "$PG_HBA"

# Reštart PostgreSQL
systemctl restart postgresql

# Testovanie pripojenia
log "Testovanie pripojenia k databáze..."
if PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" > /dev/null 2>&1; then
    log "✅ Pripojenie k databáze úspešné!"
else
    error "❌ Pripojenie k databáze zlyhalo!"
fi

# Vytvorenie .env súboru pre produkciu
log "Vytvorenie produkčného .env súboru..."
cat > /etc/earnings-table/production.env << EOF
# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://89.185.250.213"
PORT="3000"

# Redis
REDIS_URL="redis://localhost:6379"

# API Keys (NASTAV SVOJE KĽÚČE!)
POLYGON_API_KEY="NASTAV_SVOJ_KLUC"
FINNHUB_API_KEY="NASTAV_SVOJ_KLUC"

# Queue
QUEUE_REDIS_HOST="localhost"
QUEUE_REDIS_PORT="6379"
QUEUE_REDIS_PASSWORD=""

# WebSocket
WS_PORT="3002"

# Security
SESSION_SECRET="EarningsSecureSession2024!@#$"
JWT_SECRET="EarningsJWTSecret2024!@#$"

# Logging
LOG_LEVEL="info"
LOG_FILE="/var/log/earnings-table/app.log"
EOF

chmod 600 /etc/earnings-table/production.env
chown www-data:www-data /etc/earnings-table/production.env

# Zobrazenie informácií o databáze
log "📊 INFORMÁCIE O DATABÁZE:"
echo "   Databáza: ${DB_NAME}"
echo "   Používateľ: ${DB_USER}"
echo "   Host: ${DB_HOST}"
echo "   Port: ${DB_PORT}"
echo "   Connection String: postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}"

log "🎉 FÁZA 2 DOKONČENÁ! Databáza je pripravená."
log "⚠️  NEZABUDNI NASTAVIŤ API KĽÚČE v /etc/earnings-table/production.env"
log "Ďalej spusti: ./03-deploy-app.sh"
