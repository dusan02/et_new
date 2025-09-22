#!/bin/bash

# 🚀 Fáza 1: Príprava Debian Servera pre Earnings Table
# Spusti na: root@89.185.250.213

set -e

echo "🔧 === FÁZA 1: PRÍPRAVA SERVERA ==="

# Farby pre výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Kontrola, či sme na Debian systéme
if ! grep -q "debian" /etc/os-release; then
    error "Tento script je navrhnutý pre Debian systém!"
fi

log "Aktualizácia systému..."
apt update && apt upgrade -y

log "Inštalácia základných nástrojov..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https \
    ca-certificates lsb-release git vim htop tree unzip build-essential

# Node.js 20.x inštalácia
log "Inštalácia Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Overenie Node.js verzie
NODE_VERSION=$(node --version)
log "Node.js verzia: $NODE_VERSION"

# PostgreSQL 15 inštalácia
log "Inštalácia PostgreSQL 15..."
apt install -y postgresql postgresql-contrib postgresql-client

# Redis inštalácia
log "Inštalácia Redis..."
apt install -y redis-server

# nginx inštalácia
log "Inštalácia nginx..."
apt install -y nginx

# PM2 inštalácia globálne
log "Inštalácia PM2..."
npm install -g pm2

# ufw firewall konfigurácia
log "Konfigurácia firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 9000  # Pre webhook

# Vytvorenie priečinkov pre aplikáciu
log "Vytvorenie aplikačných priečinkov..."
mkdir -p /var/www/earnings-table
mkdir -p /var/log/earnings-table
mkdir -p /etc/earnings-table

# Nastavenie správnych vlastníctiev
chown -R www-data:www-data /var/www/earnings-table
chown -R www-data:www-data /var/log/earnings-table

# Spustenie služieb
log "Spustenie služieb..."
systemctl enable postgresql
systemctl enable redis-server
systemctl enable nginx
systemctl start postgresql
systemctl start redis-server
systemctl start nginx

# Kontrola stavu služieb
log "Kontrola stavu služieb..."
systemctl is-active --quiet postgresql && log "✅ PostgreSQL: RUNNING" || warn "❌ PostgreSQL: STOPPED"
systemctl is-active --quiet redis-server && log "✅ Redis: RUNNING" || warn "❌ Redis: STOPPED"
systemctl is-active --quiet nginx && log "✅ nginx: RUNNING" || warn "❌ nginx: STOPPED"

log "🎉 FÁZA 1 DOKONČENÁ! Server je pripravený."
log "Ďalej spusti: ./02-setup-database.sh"
