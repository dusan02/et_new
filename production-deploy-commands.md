# 🚀 PRODUKČNÉ DEPLOYMENT PRÍKAZY

## 1. SSH pripojenie na server

```bash
ssh root@your-server-ip
# alebo
ssh user@your-server-ip
```

## 2. Navigácia do projektu

```bash
cd /path/to/your/earnings-table-project
# alebo
cd ~/earnings-table
```

## 3. Pull najnovší kód

```bash
git pull origin main
```

## 4. Inštalácia závislostí (ak potrebné)

```bash
npm install
# alebo
npm ci --production
```

## 5. Build aplikácie

```bash
npm run build
```

## 6. Database migrácia (ak potrebné)

```bash
npx prisma db push --accept-data-loss
# alebo
npx prisma migrate deploy
```

## 7. Restart PM2 procesov

```bash
# Zastavenie všetkých procesov
pm2 stop all

# Restart s novou konfiguráciou
pm2 start ecosystem.production.config.js

# Alebo restart konkrétnych procesov
pm2 restart earnings-worker
pm2 restart earnings-app
```

## 8. Kontrola stavu

```bash
# Stav PM2 procesov
pm2 status

# Logy
pm2 logs earnings-worker --lines 50
pm2 logs earnings-app --lines 50

# Health check
curl http://localhost:3000/api/health
```

## 9. Testovanie

```bash
# Test API endpointu
curl http://localhost:3000/api/earnings

# Test frontendu
curl http://localhost:3000/
```

## 10. Nginx restart (ak potrebné)

```bash
sudo systemctl restart nginx
# alebo
sudo service nginx restart
```

## 11. Kontrola Redis (ak používaš)

```bash
# Spustenie Redis
sudo systemctl start redis
sudo systemctl enable redis

# Test Redis
redis-cli ping
```

## 12. Monitoring

```bash
# Sledovanie logov v reálnom čase
pm2 logs --follow

# Sledovanie výkonu
pm2 monit
```

## 🚨 TROUBLESHOOTING

### Ak sa worker nespustí:

```bash
# Kontrola logov
pm2 logs earnings-worker

# Manuálny test
node src/queue/worker-new.js

# Kontrola environment variables
cat .env.production
```

### Ak API nefunguje:

```bash
# Kontrola portu
netstat -tlnp | grep 3000

# Test build
npm run build

# Restart aplikácie
pm2 restart earnings-app
```

### Ak sú problémy s databázou:

```bash
# Kontrola DB pripojenia
npx prisma db pull

# Reset DB (POZOR: vymaže dáta!)
npx prisma db push --force-reset
```

## 📊 POST-DEPLOY VALIDÁCIA

1. **Health check**: `curl http://localhost:3000/api/health`
2. **API test**: `curl http://localhost:3000/api/earnings`
3. **Frontend test**: Otvor `http://your-domain.com`
4. **Worker test**: `pm2 logs earnings-worker --lines 20`
5. **Data test**: Skontroluj či sa načítavajú earnings dáta

## 🎯 OČAKÁVANÉ VÝSLEDKY

- ✅ Worker sa spustí za ~2 sekundy (vs. 5+ minút pôvodne)
- ✅ API vracia `ready: true` s earnings dátami
- ✅ Frontend zobrazuje earnings tabuľku
- ✅ Žiadne duplicitné cron behy (lock funguje)
- ✅ UPSERT operácie bez duplicít
- ✅ Change calculation s NULL handling

## 🔧 ENVIRONMENT VARIABLES

Skontroluj `.env.production`:

```bash
DATABASE_URL="file:./prisma/production.db"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
FINNHUB_API_KEY="your-finnhub-key"
POLYGON_API_KEY="your-polygon-key"
NODE_ENV="production"
```

## 📞 SUPPORT

Ak máš problémy:

1. Skontroluj `pm2 logs`
2. Testuj manuálne: `node src/queue/worker-new.js`
3. Skontroluj environment variables
4. Restart PM2 procesov
5. Skontroluj nginx konfiguráciu
