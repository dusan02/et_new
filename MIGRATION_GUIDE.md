# Migration Guide - VPS Deployment

Tento guide vás prevedie procesom migrácie vášho Earnings Table projektu na VPS server (bardus).

## Server Informácie

- **Server IP**: 89.185.250.213
- **OS**: Debian 12
- **Login**: root
- **Heslo**: EJXTfBOG2t
- **VNC**: 89.185.250.242:5903 (heslo: 2uSI25ci)

## Rýchly Start

### Windows (s WSL)

1. **Kompletná migrácia** (odporúčané):

   ```cmd
   scripts\complete-migration.bat
   ```

2. **Postupné kroky**:
   ```cmd
   scripts\cleanup-server.bat
   scripts\deploy-to-server.bat
   ```

### Linux/macOS

1. **Kompletná migrácia** (odporúčané):

   ```bash
   chmod +x scripts/complete-migration.sh
   ./scripts/complete-migration.sh
   ```

2. **Postupné kroky**:
   ```bash
   chmod +x scripts/cleanup-server.sh
   chmod +x scripts/deploy-to-server.sh
   ./scripts/cleanup-server.sh
   ./scripts/deploy-to-server.sh
   ```

## Čo sa stane po migrácii

1. **Vyčistenie servera**: Všetky existujúce súbory a služby budú odstránené
2. **Inštalácia Docker**: Docker a Docker Compose budú nainštalované
3. **Nasadenie projektu**: Váš projekt bude skopírovaný na server
4. **Spustenie služieb**: Aplikácia bude spustená v Docker kontajneroch

## Po migrácii

### 1. Konfigurácia API kľúčov

Pripojte sa na server a upravte `.env` súbor:

```bash
ssh root@89.185.250.213
cd /opt/earnings-table
nano .env
```

Upravte tieto hodnoty:

```env
FINNHUB_API_KEY="your_actual_finnhub_key"
POLYGON_API_KEY="your_actual_polygon_key"
```

### 2. Reštart služieb

```bash
cd /opt/earnings-table
docker-compose -f deployment/docker-compose.yml restart
```

### 3. Test aplikácie

Aplikácia bude dostupná na: http://89.185.250.213:3000

## Užitočné príkazy

### Pripojenie na server

```bash
ssh root@89.185.250.213
```

### Správa služieb

```bash
cd /opt/earnings-table

# Zobrazenie stavu služieb
docker-compose -f deployment/docker-compose.yml ps

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
```

### Monitorovanie

```bash
# Test API endpointu
curl http://89.185.250.213:3000/api/earnings

# Health check
docker-compose exec app node src/workers/health-check.js
```

## Aktualizácia aplikácie

Pre aktualizáciu aplikácie jednoducho spustite deployment skript znovu:

```bash
./scripts/deploy-to-server.sh
```

Alebo manuálne:

```bash
ssh root@89.185.250.213
cd /opt/earnings-table
git pull  # ak používate git
docker-compose -f deployment/docker-compose.yml build --no-cache
docker-compose -f deployment/docker-compose.yml up -d
```

## Riešenie problémov

### Aplikácia sa nespustí

```bash
# Skontrolujte logy
docker-compose -f deployment/docker-compose.yml logs app

# Skontrolujte stav kontajnerov
docker-compose ps

# Reštart všetkých služieb
docker-compose -f deployment/docker-compose.yml down && docker-compose -f deployment/docker-compose.yml up -d
```

### Problémy s databázou

```bash
# Skontrolujte stav PostgreSQL
docker-compose -f deployment/docker-compose.yml logs postgres

# Reštart databázy
docker-compose -f deployment/docker-compose.yml restart postgres
```

### Problémy s cron jobmi

```bash
# Skontrolujte logy cron workeru
docker-compose -f deployment/docker-compose.yml logs cron-worker

# Reštart cron workeru
docker-compose -f deployment/docker-compose.yml restart cron-worker
```

## Bezpečnosť

⚠️ **DÔLEŽITÉ**: Po migrácii nezabudnite:

1. **Zmeniť heslo root používateľa**
2. **Nastaviť SSH kľúče** namiesto hesla
3. **Nakonfigurovať firewall**
4. **Nastaviť SSL certifikát** pre HTTPS
5. **Pravidelne aktualizovať systém**

## Podpora

Ak máte problémy s migráciou, skontrolujte:

1. **Logy aplikácie**: `docker-compose -f deployment/docker-compose.yml logs -f`
2. **Stav služieb**: `docker-compose ps`
3. **Systémové logy**: `journalctl -f`
4. **Dostupnosť servera**: `ping 89.185.250.213`

## Štruktúra projektu na serveri

```
/opt/earnings-table/
├── .env                 # Environment variables
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile.prod      # Production Dockerfile
├── Dockerfile.cron      # Cron worker Dockerfile
├── src/                 # Source code
├── prisma/              # Database schema
├── public/              # Static files
└── logs/                # Application logs
```
