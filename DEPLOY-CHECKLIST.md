# ⚡ Deployment Checklist - Ultra-short

## Pre produkčný server (SSH session)

```bash
# 1. Prejdi do projektu
cd /var/www/earnings-table

# 2. Pull changes
git pull origin main

# 3. Cleanup (jednorazovo)
chmod +x *.sh
./cleanup-crlf.sh

# 4. OKAMŽITÉ obnovenie dát
./immediate-data-restore.sh

# 5. Validation
./post-hotfix-check.sh
```

---

## ✅ Kontroly po deployment

### Quick test

```bash
curl -s "http://127.0.0.1:3001/api/earnings?nocache=1" | head -c 300
```

**Očakávaš:** `{"status":"ok","data":[...`  
**Ak nie:** `./manual-fetch-fallback.sh`

### Website

https://www.earningstable.com → mala by byť tabuľka

### Logy

```bash
pm2 logs earnings-cron --lines 30
```

**Hľadaj:** `✅ Today's data PRESERVED`

---

## 🔄 Budúce reštarty

**Namiesto `pm2 restart`:**

```bash
./pm2-start.sh
```

**Prečo:** Správne načíta `.env.production` do oboch procesov.

---

## 🆘 Ak zlyhá

1. `pm2 logs --lines 100`
2. `pm2 status`
3. Pošli output + API response
