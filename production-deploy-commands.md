# 🚀 PRODUCTION DEPLOYMENT COMMANDS

## 📋 **KROK 1: Pripojenie na server a príprava priečinkov**

```bash
# Pripojenie na server
ssh root@89.185.250.213

# Vytvorenie hlavného priečinka aplikácie
mkdir -p /opt/earnings-table
cd /opt/earnings-table

# Vytvorenie priečinkov pre aplikáciu
mkdir -p src
mkdir -p public
mkdir -p prisma
mkdir -p scripts
mkdir -p deployment
mkdir -p docs

# Vytvorenie priečinkov pre logy a cache
mkdir -p logs
mkdir -p cache
mkdir -p backups

# Nastavenie oprávnení
chown -R www-data:www-data /opt/earnings-table
chmod -R 755 /opt/earnings-table
```

## 📋 **KROK 2: Klonovanie kódu z gitu**

```bash
# Prejsť do hlavného priečinka
cd /opt/earnings-table

# Klonovanie repozitára (ak ešte neexistuje)
git clone https://github.com/dusan02/et_new.git .

# Alebo ak už existuje, aktualizácia
git pull origin main

# Overenie, že sme na správnom commite
git log --oneline -5
```

## 📋 **KROK 3: Inštalácia závislostí**

```bash
# Prejsť do priečinka aplikácie
cd /opt/earnings-table

# Inštalácia Node.js závislostí
npm ci --production

# Overenie inštalácie
npm list --depth=0
```

## 📋 **KROK 4: Konfigurácia prostredia**

```bash
# Kopírovanie produkčného env súboru
cp env.production.example .env.production

# Úprava env súboru
nano .env.production

# Overenie env súboru
cat .env.production | grep -v "PASSWORD\|KEY\|SECRET"
```

## 📋 **KROK 5: Build aplikácie**

```bash
# Prejsť do priečinka aplikácie
cd /opt/earnings-table

# Build aplikácie
npm run build

# Overenie build súborov
ls -la .next/
```

## 📋 **KROK 6: Nastavenie databázy**

```bash
# Prejsť do priečinka aplikácie
cd /opt/earnings-table

# Spustenie Prisma migrácií
npx prisma migrate deploy

# Generovanie Prisma klienta
npx prisma generate

# Overenie databázy
npx prisma db pull
```

## 📋 **KROK 7: Nastavenie PM2**

```bash
# Prejsť do priečinka aplikácie
cd /opt/earnings-table

# Spustenie aplikácie cez PM2
pm2 start ecosystem.config.js --env production

# Nastavenie PM2 pre auto-restart
pm2 startup
pm2 save

# Overenie stavu
pm2 status
pm2 logs earningstable --lines 50
```

## 📋 **KROK 8: Nastavenie Nginx**

```bash
# Kopírovanie Nginx konfigurácie
cp nginx-production.conf /etc/nginx/sites-available/earningstable

# Aktivácia site
ln -sf /etc/nginx/sites-available/earningstable /etc/nginx/sites-enabled/

# Test Nginx konfigurácie
nginx -t

# Reštart Nginx
systemctl restart nginx

# Overenie stavu
systemctl status nginx
```

## 📋 **KROK 9: Nastavenie SSL certifikátu**

```bash
# Inštalácia Certbot
apt-get install certbot python3-certbot-nginx

# Získanie SSL certifikátu
certbot --nginx -d earningstable.com -d www.earningstable.com

# Overenie certifikátu
certbot certificates
```

## 📋 **KROK 10: Nastavenie cron jobov**

```bash
# Prejsť do priečinka aplikácie
cd /opt/earnings-table

# Spustenie cron worker-a
pm2 start src/queue/worker-new.js --name "earnings-cron"

# Overenie cron jobov
pm2 status
pm2 logs earnings-cron --lines 20
```

## 📋 **KROK 11: Finálne overenie**

```bash
# Health check aplikácie
curl -f http://localhost:3000/api/monitoring/health

# Test API endpointu
curl -s http://localhost:3000/api/earnings/stats | head -20

# Overenie logov
pm2 logs earningstable --lines 10
pm2 logs earnings-cron --lines 10

# Overenie procesov
ps aux | grep node
```

## 📋 **KROK 12: Monitoring a údržba**

```bash
# Spustenie monitoringu
./monitor-production.sh

# Backup databázy
./backup-production.sh

# Overenie disk space
df -h

# Overenie pamäte
free -h

# Overenie CPU
top -bn1 | grep "Cpu(s)"
```

---

## 🔧 **ÚDRŽBA A AKTUALIZÁCIE**

### Aktualizácia kódu:

```bash
cd /opt/earnings-table
git pull origin main
npm ci --production
npm run build
pm2 restart earningstable
pm2 restart earnings-cron
```

### Reštart aplikácie:

```bash
pm2 restart earningstable
pm2 restart earnings-cron
```

### Kontrola logov:

```bash
pm2 logs earningstable
pm2 logs earnings-cron
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🚨 **TROUBLESHOOTING**

### Ak aplikácia neštartuje:

```bash
pm2 logs earningstable --lines 100
npm run build
pm2 restart earningstable
```

### Ak databáza nefunguje:

```bash
npx prisma migrate status
npx prisma db push
npx prisma generate
```

### Ak Nginx nefunguje:

```bash
nginx -t
systemctl restart nginx
systemctl status nginx
```

---

**🌐 Finálne URL:**

- **HTTP**: http://89.185.250.213:3000
- **HTTPS**: https://earningstable.com
- **API**: https://earningstable.com/api/earnings
