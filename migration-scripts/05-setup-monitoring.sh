#!/bin/bash

# 🚀 Fáza 5: Monitoring a Záverečné Testy
# Spusti na: root@89.185.250.213

set -e

echo "📊 === FÁZA 5: MONITORING A TESTY ==="

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

DOMAIN="89.185.250.213"
APP_DIR="/var/www/earnings-table"

log "Inštalácia monitoring nástrojov..."
apt install -y htop iotop nethogs ncdu

log "Vytvorenie health check skriptu..."
cat > /usr/local/bin/earnings-health-check.sh << 'EOF'
#!/bin/bash

# Farby
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🏥 EARNINGS TABLE HEALTH CHECK${NC}"
echo "======================================="
echo "Čas: $(date)"
echo ""

# System resources
echo -e "${YELLOW}📊 SYSTÉMOVÉ ZDROJE:${NC}"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
echo ""

# Services status
echo -e "${YELLOW}🔧 SLUŽBY:${NC}"
services=("postgresql" "redis-server" "nginx" "earnings-webhook" "fail2ban")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo -e "✅ $service: ${GREEN}RUNNING${NC}"
    else
        echo -e "❌ $service: ${RED}STOPPED${NC}"
    fi
done
echo ""

# PM2 processes
echo -e "${YELLOW}🚀 PM2 PROCESY:${NC}"
sudo -u www-data pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"' 2>/dev/null || echo "PM2 info nedostupné"
echo ""

# Network connectivity
echo -e "${YELLOW}🌐 SIEŤOVÉ TESTY:${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "✅ Next.js app: ${GREEN}RESPONDING${NC}"
else
    echo -e "❌ Next.js app: ${RED}NOT RESPONDING${NC}"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/hooks/deploy-earnings-table | grep -q "200\|405"; then
    echo -e "✅ Webhook: ${GREEN}RESPONDING${NC}"
else
    echo -e "❌ Webhook: ${RED}NOT RESPONDING${NC}"
fi
echo ""

# Database connectivity
echo -e "${YELLOW}🗄️  DATABÁZA:${NC}"
if PGPASSWORD="EarningsSecure2024!#" psql -h localhost -U earnings_user -d earnings_table_prod -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "✅ PostgreSQL: ${GREEN}CONNECTED${NC}"
    # Count records
    EARNINGS_COUNT=$(PGPASSWORD="EarningsSecure2024!#" psql -h localhost -U earnings_user -d earnings_table_prod -t -c "SELECT COUNT(*) FROM \"EarningsTickersToday\";" 2>/dev/null | xargs)
    echo "   Earnings records: $EARNINGS_COUNT"
else
    echo -e "❌ PostgreSQL: ${RED}CONNECTION FAILED${NC}"
fi
echo ""

# Redis connectivity
echo -e "${YELLOW}📦 REDIS:${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "✅ Redis: ${GREEN}CONNECTED${NC}"
else
    echo -e "❌ Redis: ${RED}CONNECTION FAILED${NC}"
fi
echo ""

# Recent logs
echo -e "${YELLOW}📋 POSLEDNÉ LOGY:${NC}"
echo "Nginx errors (last 5):"
tail -5 /var/log/nginx/earnings-table.error.log 2>/dev/null || echo "No nginx errors"
echo ""
echo "App errors (last 5):"
tail -5 /var/log/earnings-table/error.log 2>/dev/null || echo "No app errors"
echo ""

echo "======================================="
echo -e "${GREEN}Health check dokončený!${NC}"
EOF

chmod +x /usr/local/bin/earnings-health-check.sh

log "Vytvorenie system monitoring skriptu..."
cat > /usr/local/bin/earnings-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/earnings-table/monitor.log"
ALERT_EMAIL="admin@yourdomain.com"  # NASTAV SVOJ EMAIL

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=90
DISK_THRESHOLD=90

log_alert() {
    echo "[$(date)] ALERT: $1" >> "$LOG_FILE"
    # Mail alert (ak máš nastavený mail server)
    # echo "$1" | mail -s "Earnings Table Alert" "$ALERT_EMAIL"
}

# CPU check
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' | awk -F'us' '{print $1}')
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    log_alert "High CPU usage: ${CPU_USAGE}%"
fi

# Memory check
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.2f", ($3/$2) * 100.0}')
if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
    log_alert "High memory usage: ${MEMORY_USAGE}%"
fi

# Disk check
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    log_alert "High disk usage: ${DISK_USAGE}%"
fi

# Service checks
services=("postgresql" "redis-server" "nginx" "earnings-webhook")
for service in "${services[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        log_alert "Service $service is down"
        systemctl restart "$service"
    fi
done

# PM2 process check
if ! sudo -u www-data pm2 list | grep -q "online"; then
    log_alert "PM2 processes are down"
    sudo -u www-data pm2 resurrect
fi
EOF

chmod +x /usr/local/bin/earnings-monitor.sh

# Pridanie monitoring do crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/earnings-monitor.sh") | crontab -

log "Konfigurácia webhook pre GitHub deployment..."
cat > /etc/webhook.conf << 'EOF'
[
  {
    "id": "deploy-earnings-table",
    "execute-command": "/usr/local/bin/webhook-deploy.sh",
    "command-working-directory": "/var/www",
    "response-message": "Deployment started",
    "trigger-rule": {
      "and": [
        {
          "match": {
            "type": "payload-hash-sha1",
            "secret": "earnings-webhook-secret-2024",
            "parameter": {
              "source": "header",
              "name": "X-Hub-Signature"
            }
          }
        },
        {
          "match": {
            "type": "value",
            "value": "refs/heads/main",
            "parameter": {
              "source": "payload",
              "name": "ref"
            }
          }
        }
      ]
    }
  }
]
EOF

log "Vytvorenie webhook deployment skriptu..."
cat > /usr/local/bin/webhook-deploy.sh << 'EOF'
#!/bin/bash

exec > /var/log/earnings-table/deploy.log 2>&1

echo "=== WEBHOOK DEPLOYMENT STARTED: $(date) ==="

cd /var/www/earnings-table

# Backup current version
cp -r /var/www/earnings-table /var/backups/earnings-table-$(date +%Y%m%d_%H%M%S)

# Git pull latest changes
sudo -u www-data git pull origin main

# Install/update dependencies
sudo -u www-data npm install --production

# Rebuild application
sudo -u www-data npm run build

# Update database schema
sudo -u www-data npx prisma db push

# Restart PM2 processes
sudo -u www-data pm2 reload all

# Restart nginx
systemctl reload nginx

echo "=== WEBHOOK DEPLOYMENT COMPLETED: $(date) ==="
EOF

chmod +x /usr/local/bin/webhook-deploy.sh
chown www-data:www-data /usr/local/bin/webhook-deploy.sh

log "Spustenie komplexných testov..."

# Test databázového pripojenia
log "Test databázy..."
if PGPASSWORD="EarningsSecure2024!#" psql -h localhost -U earnings_user -d earnings_table_prod -c "SELECT version();" > /dev/null 2>&1; then
    log "✅ Databáza: OK"
else
    warn "❌ Databáza: PROBLÉM"
fi

# Test Redis
log "Test Redis..."
if redis-cli ping > /dev/null 2>&1; then
    log "✅ Redis: OK"
else
    warn "❌ Redis: PROBLÉM"
fi

# Test webovej aplikácie
log "Test webovej aplikácie..."
sleep 5  # Daj čas na štart
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    log "✅ Web aplikácia: OK"
else
    warn "❌ Web aplikácia: PROBLÉM"
fi

# Test webhook-u
log "Test webhook endpoint..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/hooks/deploy-earnings-table | grep -q "200\|405"; then
    log "✅ Webhook: OK"
else
    warn "❌ Webhook: PROBLÉM"
fi

# Spustenie health check
log "Spustenie health check..."
/usr/local/bin/earnings-health-check.sh

log "Vytvorenie súhrnu nasadenia..."
cat > /root/DEPLOYMENT_SUMMARY.txt << EOF
🎉 EARNINGS TABLE DEPLOYMENT DOKONČENÝ
=====================================

🌐 APLIKÁCIA:
- URL: http://${DOMAIN}
- Port: 3000 (internal), 80 (external)
- Status: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

🗄️  DATABÁZA:
- Type: PostgreSQL 15
- Database: earnings_table_prod
- User: earnings_user
- Status: $(systemctl is-active postgresql)

📦 REDIS:
- URL: redis://localhost:6379
- Status: $(systemctl is-active redis-server)

🔗 WEBHOOK:
- URL: http://${DOMAIN}:9000/hooks/deploy-earnings-table
- Secret: earnings-webhook-secret-2024
- Status: $(systemctl is-active earnings-webhook)

📁 DÔLEŽITÉ CESTY:
- Aplikácia: ${APP_DIR}
- Logy: /var/log/earnings-table/
- Konfigurácia: /etc/earnings-table/production.env
- Backups: /var/backups/earnings-table/

🛠️  UŽITOČNÉ PRÍKAZY:
- Health check: /usr/local/bin/earnings-health-check.sh
- PM2 status: sudo -u www-data pm2 status
- View logs: tail -f /var/log/earnings-table/app.log
- Manual backup: /usr/local/bin/earnings-backup.sh

🔧 NASTAVENIE GITHUB WEBHOOK:
1. Choď na: https://github.com/dusan02/et_new/settings/hooks
2. Klikni "Add webhook"
3. Nastav:
   - Payload URL: http://${DOMAIN}:9000/hooks/deploy-earnings-table
   - Content type: application/json
   - Secret: earnings-webhook-secret-2024
   - Events: Just the push event

⚠️  NEZABUDNI:
- Nastav API kľúče v /etc/earnings-table/production.env
- Konfigurácia email alertov v /usr/local/bin/earnings-monitor.sh
- SSL certifikát (Let's Encrypt)

Deployment dokončený: $(date)
EOF

log "🎉 FÁZA 5 DOKONČENÁ! Monitoring je nastavený."
log "📋 Súhrn nasadenia: /root/DEPLOYMENT_SUMMARY.txt"
log ""
log "🚀 KOMPLETNÁ MIGRÁCIA DOKONČENÁ!"
log "🌐 Aplikácia beží na: http://${DOMAIN}"
log "🔍 Health check: /usr/local/bin/earnings-health-check.sh"
