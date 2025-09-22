#!/bin/bash

# 🚀 Fáza 4: Konfigurácia Produkčných Služieb
# Spusti na: root@89.185.250.213

set -e

echo "⚙️ === FÁZA 4: PRODUKČNÁ KONFIGURÁCIA ==="

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

APP_DIR="/var/www/earnings-table"
DOMAIN="89.185.250.213"

log "Konfigurácia nginx reverse proxy..."

# Vytvorenie nginx konfigurácie
cat > /etc/nginx/sites-available/earnings-table << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Gzip kompresja
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Main app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Webhook endpoint
    location /hooks/ {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/earnings-table.access.log;
    error_log /var/log/nginx/earnings-table.error.log;
}
EOF

# Aktivácia konfigurácie
ln -sf /etc/nginx/sites-available/earnings-table /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx konfigurácie
if nginx -t; then
    log "✅ nginx konfigurácia je v poriadku"
    systemctl reload nginx
else
    error "❌ nginx konfigurácia má chyby!"
fi

log "Konfigurácia PM2 aplikácie..."

# Prepnutie na www-data a štart aplikácie cez PM2
sudo -u www-data bash << 'EOF'
cd /var/www/earnings-table

# Zastavenie existujúcich procesov
pm2 delete all 2>/dev/null || true

# Štart aplikácie
pm2 start ecosystem.config.js

# Uloženie PM2 nastavenia
pm2 save

# Zobrazenie stavu
pm2 status
EOF

log "Konfigurácia PM2 startup..."
# PM2 startup ako root ale pre www-data používateľa
env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/www

log "Vytvorenie systemd služby pre webhook..."
cat > /etc/systemd/system/earnings-webhook.service << 'EOF'
[Unit]
Description=Earnings Table Webhook Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/earnings-table
ExecStart=/usr/bin/webhook -hooks /etc/webhook.conf -verbose -port 9000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Aktivácia webhook služby
systemctl daemon-reload
systemctl enable earnings-webhook
systemctl start earnings-webhook

log "Konfigurácia logrotate..."
cat > /etc/logrotate.d/earnings-table << 'EOF'
/var/log/earnings-table/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/earnings-table.*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi; \
    endscript
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

log "Konfigurácia fail2ban pre bezpečnosť..."
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

systemctl enable fail2ban
systemctl start fail2ban

log "Nastavenie automatických bezpečnostných aktualizácií..."
apt install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' >> /etc/apt/apt.conf.d/50unattended-upgrades

log "Vytvorenie backup skriptu..."
cat > /usr/local/bin/earnings-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/earnings-table"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="earnings_table_prod"
DB_USER="earnings_user"

mkdir -p "$BACKUP_DIR"

# Database backup
PGPASSWORD="EarningsSecure2024!#" pg_dump -h localhost -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/db_backup_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" -C /var/www earnings-table

# Keep only last 7 backups
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /usr/local/bin/earnings-backup.sh

# Pridanie do crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/earnings-backup.sh") | crontab -

log "Kontrola stavu všetkých služieb..."
systemctl is-active --quiet postgresql && log "✅ PostgreSQL: RUNNING" || warn "❌ PostgreSQL: STOPPED"
systemctl is-active --quiet redis-server && log "✅ Redis: RUNNING" || warn "❌ Redis: STOPPED"
systemctl is-active --quiet nginx && log "✅ nginx: RUNNING" || warn "❌ nginx: STOPPED"
systemctl is-active --quiet earnings-webhook && log "✅ Webhook: RUNNING" || warn "❌ Webhook: STOPPED"
systemctl is-active --quiet fail2ban && log "✅ fail2ban: RUNNING" || warn "❌ fail2ban: STOPPED"

log "Kontrola PM2 procesov..."
sudo -u www-data pm2 status

log "🎉 FÁZA 4 DOKONČENÁ! Produkčné služby sú nakonfigurované."
log "🌐 Aplikácia je dostupná na: http://${DOMAIN}"
log "🔗 Webhook endpoint: http://${DOMAIN}:9000/hooks/deploy-earnings-table"
log "Ďalej spusti: ./05-setup-monitoring.sh"
