#!/bin/bash

# 🚀 ONE-CLICK EARNINGS TABLE DEPLOYMENT
# Spusti tento script priamo na serveri cez VNC alebo PuTTY

set -e

echo "🚀 === ONE-CLICK DEPLOYMENT STARTED ==="

# Farby
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# 1. PRÍPRAVA SYSTÉMU
log "Krok 1/7: Príprava systému..."
apt update && apt upgrade -y
apt install -y curl wget git docker.io docker-compose nodejs npm

# 2. DOCKER SETUP
log "Krok 2/7: Konfigurácia Docker..."
systemctl enable docker
systemctl start docker
usermod -aG docker root

# 3. KLONOVANIE REPOZITÁRA
log "Krok 3/7: Klonovanie aplikácie..."
cd /var/www
rm -rf earnings-table
git clone https://github.com/dusan02/et_new.git earnings-table
cd earnings-table

# 4. VYTVORENIE PRODUKČNÉHO .ENV
log "Krok 4/7: Konfigurácia environment..."
cat > production.env << 'EOF'
# Database
DATABASE_URL="postgresql://earnings_user:EarningsSecure2024@db:5432/earnings_table_prod"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="http://89.185.250.213:3000"
PORT="3000"

# API Keys (NASTAV SVOJE!)
POLYGON_API_KEY="NASTAV_SVOJ_KLUC"
FINNHUB_API_KEY="NASTAV_SVOJ_KLUC"

# Redis
REDIS_URL="redis://redis:6379"

# Queue
QUEUE_REDIS_HOST="redis"
QUEUE_REDIS_PORT="6379"
QUEUE_REDIS_PASSWORD=""
EOF

# 5. DOCKER COMPOSE KONFIGURÁCIA
log "Krok 5/7: Príprava Docker Compose..."
mkdir -p deployment
cat > deployment/docker-compose.yml << 'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: earnings_table_prod
      POSTGRES_USER: earnings_user
      POSTGRES_PASSWORD: EarningsSecure2024
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - production.env
    depends_on:
      - db
      - redis
    restart: unless-stopped
    volumes:
      - app_logs:/app/logs

volumes:
  postgres_data:
  app_logs:
EOF

# 6. DOCKERFILE
log "Krok 6/7: Vytvorenie Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/queue/package*.json ./queue/

# Install dependencies
RUN npm install --production
RUN cd queue && npm install --production

# Copy application code
COPY . .

# Build application
RUN npm run build

# Create logs directory
RUN mkdir -p logs

EXPOSE 3000

# Start application
CMD ["npm", "start"]
EOF

# 7. WEBHOOK SETUP
log "Krok 7/7: Nastavenie webhook..."

# Webhook script
cat > /usr/local/bin/webhook-deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🚀 Webhook deployment started..."

cd /var/www/earnings-table

# Backup
cp -r /var/www/earnings-table /var/backups/earnings-table-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

# Update code
git fetch origin
git reset --hard origin/main
git clean -fd

# Restart services
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml up -d --build

echo "✅ Webhook deployment completed!"
EOF

chmod +x /usr/local/bin/webhook-deploy.sh

# Webhook config
cat > /etc/webhook.conf << 'EOF'
[
  {
    "id": "deploy-earnings-table",
    "execute-command": "/usr/local/bin/webhook-deploy.sh",
    "command-working-directory": "/tmp",
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

# Install webhook
apt install -y webhook

# 8. PRVÉ NASADENIE
log "Spúšťam aplikáciu..."
cp src/queue/package*.json ./
cp production.env .env

# Start services
docker-compose -f deployment/docker-compose.yml up -d --build

# Start webhook service
pkill webhook 2>/dev/null || true
nohup webhook -hooks /etc/webhook.conf -verbose -port 9000 > /var/log/webhook.log 2>&1 &

# 9. FIREWALL
log "Konfigurácia firewall..."
ufw --force enable
ufw allow 22
ufw allow 3000
ufw allow 9000

log "⏳ Čakám na spustenie služieb..."
sleep 60

# 10. HEALTH CHECK
log "Kontrola stavu aplikácie..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "✅ Aplikácia beží úspešne!"
else
    warn "⚠️  Aplikácia ešte nie je pripravená, skontroluj logy"
fi

echo ""
echo "🎉 === DEPLOYMENT DOKONČENÝ ==="
echo ""
echo "📍 DÔLEŽITÉ INFORMÁCIE:"
echo "🌐 Aplikácia: http://89.185.250.213:3000"
echo "🔗 Webhook: http://89.185.250.213:9000/hooks/deploy-earnings-table"
echo "🔑 Webhook secret: earnings-webhook-secret-2024"
echo ""
echo "📋 ĎALŠIE KROKY:"
echo "1. Nastav API kľúče v production.env"
echo "2. Nastav GitHub webhook na: https://github.com/dusan02/et_new/settings/hooks"
echo "3. Skontroluj logy: docker-compose -f deployment/docker-compose.yml logs"
echo ""
echo "🛠️  UŽITOČNÉ PRÍKAZY:"
echo "docker-compose -f deployment/docker-compose.yml ps     # Status služieb"
echo "docker-compose -f deployment/docker-compose.yml logs   # Logy"
echo "docker-compose -f deployment/docker-compose.yml restart # Reštart"
echo ""
