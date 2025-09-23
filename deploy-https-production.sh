#!/bin/bash

# HTTPS Production Deployment Script
# Kompletný deployment s SSL/HTTPS na server 89.185.250.213

echo "🚀 HTTPS Production Deployment"
echo "=============================="
echo "🌐 Server: 89.185.250.213"
echo "🔒 HTTPS: Enabled"
echo ""

# Farby pre výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# 1. Update systému
print_status "Aktualizujem systém..."
sudo apt update && sudo apt upgrade -y

# 2. Inštalácia Node.js 18+
print_status "Inštalujem Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Inštalácia Nginx
print_status "Inštalujem Nginx..."
sudo apt install -y nginx

# 4. Inštalácia Certbot pre Let's Encrypt
print_status "Inštalujem Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# 5. Vytvorenie aplikačného adresára
APP_DIR="/var/www/earnings-table-https"
print_status "Vytváram aplikačný adresár: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# 6. Kopírovanie súborov (predpokladá sa, že ste v projektovom adresári)
print_status "Kopírujem aplikačné súbory..."
cp -r . $APP_DIR/
cd $APP_DIR

# 7. Inštalácia závislostí a build
print_status "Inštalujem závislosti..."
npm ci --production

print_status "Generujem Prisma client..."
npx prisma generate

print_status "Buildujem aplikáciu..."
npm run build

# 8. Vytvorenie systemd service
print_status "Vytváram systemd service..."
sudo tee /etc/systemd/system/earnings-https.service > /dev/null <<EOF
[Unit]
Description=EarningsTable HTTPS Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# 9. Vytvorenie Nginx konfigurácie (dočasne HTTP)
print_status "Vytváram Nginx konfiguráciu..."
sudo tee /etc/nginx/sites-available/earnings-https > /dev/null <<EOF
server {
    listen 80;
    server_name 89.185.250.213;
    
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
    }
    
    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF

# 10. Aktivácia Nginx konfigurácie
print_status "Aktivujem Nginx konfiguráciu..."
sudo ln -sf /etc/nginx/sites-available/earnings-https /etc/nginx/sites-enabled/
sudo nginx -t

# 11. Spustenie služieb
print_status "Spúšťam služby..."
sudo systemctl daemon-reload
sudo systemctl enable earnings-https
sudo systemctl start earnings-https
sudo systemctl restart nginx

# 12. Čakanie na spustenie
print_status "Čakám na spustenie aplikácie..."
sleep 15

# 13. Test HTTP
print_status "Testujem HTTP prístup..."
if curl -f http://89.185.250.213 > /dev/null 2>&1; then
    print_success "HTTP prístup funguje!"
else
    print_error "HTTP prístup nefunguje"
    print_status "Logy aplikácie:"
    sudo journalctl -u earnings-https --no-pager --lines=20
    exit 1
fi

# 14. SSL/HTTPS setup
print_warning "Pre HTTPS potrebujete doménu. IP adresa nepodporuje Let's Encrypt."
print_status "Ak máte doménu, spustite:"
echo "sudo certbot --nginx -d vasadomena.sk"
echo ""

# 15. Alternatíva: Self-signed certifikát pre HTTPS
read -p "Chcete vytvoriť self-signed SSL certifikát? (y/n): " create_ssl

if [[ $create_ssl == "y" || $create_ssl == "Y" ]]; then
    print_status "Vytváram self-signed SSL certifikát..."
    
    sudo mkdir -p /etc/nginx/ssl
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/earnings.key \
        -out /etc/nginx/ssl/earnings.crt \
        -subj "/C=SK/ST=Slovakia/L=Bratislava/O=EarningsTable/CN=89.185.250.213"
    
    # Aktualizácia Nginx konfigurácie pre HTTPS
    sudo tee /etc/nginx/sites-available/earnings-https > /dev/null <<EOF
server {
    listen 80;
    server_name 89.185.250.213;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 89.185.250.213;
    
    ssl_certificate /etc/nginx/ssl/earnings.crt;
    ssl_certificate_key /etc/nginx/ssl/earnings.key;
    
    # SSL konfigurácia
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
    
    sudo nginx -t && sudo systemctl reload nginx
    print_success "HTTPS s self-signed certifikátom je nastavené!"
    print_warning "Prehliadač zobrazí upozornenie o nedôveryhodnom certifikáte - to je normálne."
fi

echo ""
print_success "🎉 Deployment dokončený!"
echo ""
print_status "📊 Stav služieb:"
sudo systemctl status earnings-https --no-pager --lines=3
echo ""
print_status "🌐 Prístupné URL:"
echo "   HTTP:  http://89.185.250.213"
if [[ $create_ssl == "y" || $create_ssl == "Y" ]]; then
    echo "   HTTPS: https://89.185.250.213"
fi
echo ""
print_status "📋 Užitočné príkazy:"
echo "   sudo systemctl status earnings-https    # Stav aplikácie"
echo "   sudo journalctl -u earnings-https -f    # Logy aplikácie"
echo "   sudo systemctl restart earnings-https   # Reštart aplikácie"
echo "   sudo nginx -t                           # Test Nginx konfigurácie"
echo ""
