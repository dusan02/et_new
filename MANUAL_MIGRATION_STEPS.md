# Manuálne kroky pre migráciu

## 🔧 Potrebné nástroje:

- **PuTTY** alebo **Windows Terminal** s SSH
- **WinSCP** alebo **FileZilla** pre kopírovanie súborov

## 📋 Kroky migrácie:

### 1. **Pripojenie na server**

```bash
ssh root@89.185.250.213
# Heslo: EJXTfBOG2t
```

### 2. **Vyčistenie servera**

```bash
# Zastavenie všetkých služieb
systemctl stop nginx || true
systemctl stop apache2 || true
systemctl stop mysql || true
systemctl stop postgresql || true
docker-compose -f deployment/docker-compose.yml down || true
docker stop $(docker ps -aq) || true
docker rm $(docker ps -aq) || true

# Odstránenie existujúcich projektov
rm -rf /opt/earnings-table || true
rm -rf /var/www/html/* || true
rm -rf /home/*/public_html/* || true

# Vyčistenie Docker
docker system prune -af || true
docker volume prune -f || true
docker network prune -f || true

# Vyčistenie systémových adresárov
rm -rf /tmp/* || true
rm -rf /var/tmp/* || true
rm -rf /var/log/*.log || true
```

### 3. **Inštalácia Docker**

```bash
# Inštalácia Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Inštalácia Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Vytvorenie projektového adresára
mkdir -p /opt/earnings-table
chmod 755 /opt/earnings-table
```

### 4. **Kopírovanie projektových súborov**

Použite **WinSCP** alebo **FileZilla**:

- **Host**: 89.185.250.213
- **User**: root
- **Password**: EJXTfBOG2t
- **Port**: 22

Skopírujte celý projekt do `/opt/earnings-table/`

### 5. **Nastavenie produkčného prostredia**

```bash
cd /opt/earnings-table

# Nastavenie produkčnej Prisma schémy
cp prisma/schema.prod.prisma prisma/schema.prisma

# Vytvorenie .env súboru
cat > .env << 'EOF'
# Production Environment Variables
DATABASE_URL="postgresql://earnings_user:earnings_password@postgres:5432/earnings_table"
REDIS_URL="redis://redis:6379"
NODE_ENV="production"

# API Keys - REPLACE WITH YOUR ACTUAL KEYS
FINNHUB_API_KEY="your_finnhub_api_key_here"
POLYGON_API_KEY="your_polygon_api_key_here"

# Next.js
NEXTAUTH_URL="http://89.185.250.213:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Application
NEXT_PUBLIC_APP_URL="http://89.185.250.213:3000"
CRON_ENABLED="true"
CRON_TIMEZONE="America/New_York"
EOF
```

### 6. **Spustenie služieb**

```bash
# Build a spustenie
docker-compose -f deployment/docker-compose.yml down --remove-orphans || true
docker-compose -f deployment/docker-compose.yml build --no-cache
docker-compose -f deployment/docker-compose.yml up -d

# Čakanie na spustenie
sleep 30

# Kontrola stavu
docker-compose -f deployment/docker-compose.yml ps
docker-compose -f deployment/docker-compose.yml logs --tail=20
```

### 7. **Test aplikácie**

```bash
# Test API endpointu
curl http://localhost:3000/api/earnings

# Test v prehliadači
# http://89.185.250.213:3000
```

## ⚠️ **Dôležité po migrácii:**

### 1. **Nakonfigurovať API kľúče**

```bash
nano .env
# Upraviť:
# FINNHUB_API_KEY="your_actual_finnhub_key"
# POLYGON_API_KEY="your_actual_polygon_key"
```

### 2. **Reštart služieb**

```bash
docker-compose -f deployment/docker-compose.yml restart
```

## 🔧 **Užitočné príkazy:**

```bash
# Zobrazenie logov
docker-compose -f deployment/docker-compose.yml logs -f app
docker-compose -f deployment/docker-compose.yml logs -f cron-worker

# Reštart služieb
docker-compose -f deployment/docker-compose.yml restart app
docker-compose -f deployment/docker-compose.yml restart cron-worker

# Zastavenie všetkých služieb
docker-compose -f deployment/docker-compose.yml down

# Spustenie všetkých služieb
docker-compose -f deployment/docker-compose.yml up -d

# Monitorovanie
curl http://89.185.250.213:3000/api/earnings
```

## 📊 **Kontrola po migrácii:**

- ✅ Aplikácia dostupná na: http://89.185.250.213:3000
- ✅ API endpoint funguje: http://89.185.250.213:3000/api/earnings
- ✅ Cron joby bežia: `docker-compose -f deployment/docker-compose.yml logs cron-worker`
- ✅ Databáza funguje: `docker-compose -f deployment/docker-compose.yml logs postgres`
