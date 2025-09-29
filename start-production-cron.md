# 🚀 SPUSTENIE CRON WORKER NA PRODUKCII

## Pripojenie na earningstable.com:

```bash
ssh root@earningstable.com
# Heslo: EJXTfBOG2t
```

## Príkazy pre spustenie cron worker-a:

```bash
# 1. Prejdite do projektového adresára
cd /var/www/earnings-table

# 2. Skontrolujte aktuálny stav worker-a
ps aux | grep worker-new

# 3. Ukončite starý worker (ak beží)
pkill -f "worker-new" || echo "No worker running"

# 4. Spustite nový cron worker v pozadí
cd src/queue
nohup node worker-new.js > /var/log/earnings-cron.log 2>&1 &

# 5. Skontrolujte že worker beží
ps aux | grep worker-new | grep -v grep

# 6. Sledujte logy worker-a (CTRL+C na ukončenie)
tail -f /var/log/earnings-cron.log

# 7. Overenie funkčnosti - mali by ste vidieť:
# ✅ "🚀 Starting Earnings Queue Worker with NY Timezone..."
# ✅ "✅ Queue worker started successfully!"
# ✅ "📅 Schedule: ..."
# ✅ Fetch operácie každých 10 minút (after-hours)
```

## Očakávaný výstup:

```
🚀 Starting Earnings Queue Worker with NY Timezone...
🔄 Running initial data fetch...
✅ Queue worker started successfully!
📅 Schedule:
  - Main fetch: Daily at 2:00 AM NY time
  - Market updates: Every 2 minutes during market hours (9:30 AM - 4:00 PM ET)
  - Pre-market: Every 5 minutes (4:00 AM - 9:30 AM ET)
  - After-hours: Every 10 minút (4:00 PM - 8:00 PM ET)
  - Weekend: Every hour
🕐 Current NY time: ...
```

## V prípade problémov:

```bash
# Skontrolujte logy
tail -50 /var/log/earnings-cron.log

# Skontrolujte .env súbor
cd /var/www/earnings-table
cat .env

# Reštartujte worker
pkill -f "worker-new"
cd src/queue
nohup node worker-new.js > /var/log/earnings-cron.log 2>&1 &
```

## Správny stav:

- Worker proces beží v pozadí
- Každých 10 minút vidíte "After-hours update" v logoch
- API volania na Polygon API sú úspešné (200 responses)
- Dáta sa zapisujú do databázy ("Upserted X records")

