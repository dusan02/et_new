# Cron Job Fix - Daily Data Reset

## Problém

Tabuľka sa neresetovala pre nový deň a zostali staré dáta. Cron job bežal správne, ale cleanup script nevyčistil aktuálny deň pred načítaním nových dát.

## Riešenie

Pridaná funkcionalita pre reset aktuálneho dňa pred načítaním nových dát.

## Zmeny v súboroch

### 1. `src/queue/jobs/clearOldData.ts`

- ✅ Pridaná funkcia `resetCurrentDayData()` pre reset aktuálneho dňa
- ✅ Upravená funkcia `clearOldData()` - teraz vyčistí aj aktuálny deň
- ✅ Lepšie logovanie s počtami zmazaných záznamov

### 2. `src/queue/worker-new.js`

- ✅ Pridaná funkcia `runCurrentDayReset()` pre spustenie resetu
- ✅ Upravený hlavný cron job (2:00 AM NY time) - teraz:
  1. Vyčistí staré dáta (7+ dní)
  2. Resetuje aktuálny deň
  3. Načíta nové dáta
- ✅ Upravený startup proces - rovnaká sekvencia

### 3. `scripts/reset-current-day.js` (nový)

- ✅ Manuálny script pre okamžitý reset aktuálneho dňa
- ✅ Môže sa spustiť nezávisle od cron jobu

## Deployment inštrukcie

### Okamžitý fix (manuálny reset)

```bash
# 1. Spusti manuálny reset aktuálneho dňa
node scripts/reset-current-day.js

# 2. Spusti fetch pre nové dáta
npx tsx src/jobs/fetch-today.ts
```

### Trvalý fix (deploy zmeny)

```bash
# 1. Deploy zmeny na produkciu
git add .
git commit -m "Fix: Add daily data reset functionality to cron job"
git push origin main

# 2. Restart worker procesu
pm2 restart earnings-worker

# 3. Skontroluj logy
pm2 logs earnings-worker --lines 50
```

### Verifikácia

```bash
# Skontroluj, či worker beží
pm2 status

# Skontroluj logy
pm2 logs earnings-worker --lines 100

# Skontroluj, či sa dáta resetovali
# Otvor web aplikáciu a skontroluj timestamp
```

## Čo sa zmenilo v cron jobe

### Pred opravou:

1. 2:00 AM NY time → Cleanup starých dát (7+ dní)
2. 2:00 AM NY time + 5s → Fetch nových dát
3. **Problém**: Staré dáta pre aktuálny deň zostali

### Po oprave:

1. 2:00 AM NY time → Cleanup starých dát (7+ dní)
2. 2:00 AM NY time + 5s → Reset aktuálneho dňa
3. 2:00 AM NY time + 8s → Fetch nových dát
4. **Riešenie**: Čistý štart pre každý nový deň

## Testovanie

### 1. Manuálny test

```bash
# Spusti reset
node scripts/reset-current-day.js

# Spusti fetch
npx tsx src/jobs/fetch-today.ts

# Skontroluj web aplikáciu
```

### 2. Cron job test

```bash
# Skontroluj logy workeru
pm2 logs earnings-worker --lines 100

# Hľadaj tieto správy:
# - "🧹 Starting cleanup of old data..."
# - "🔄 Resetting current day data for..."
# - "📊 Reset records:"
# - "🔄 Running Main earnings calendar fetch"
```

## Monitoring

### Kľúčové log správy:

- `🧹 Starting cleanup of old data...` - Začiatok cleanupu
- `🔄 Resetting current day data for...` - Reset aktuálneho dňa
- `📊 Reset records:` - Počet zmazaných záznamov
- `✅ Cleanup completed successfully!` - Úspešné dokončenie

### Časový plán:

- **2:00 AM NY time**: Hlavný fetch s resetom
- **9:30 AM - 4:00 PM ET**: Market updates každé 2 minúty
- **4:00 AM - 9:30 AM ET**: Pre-market updates každých 5 minút
- **4:00 PM - 8:00 PM ET**: After-hours updates každých 10 minút

## Rollback (ak je potrebný)

```bash
# Vráť pôvodné súbory
git checkout HEAD~1 -- src/queue/jobs/clearOldData.ts
git checkout HEAD~1 -- src/queue/worker-new.js

# Restart worker
pm2 restart earnings-worker
```

## Poznámky

- Reset sa spustí automaticky každý deň o 2:00 AM NY time
- Manuálny reset je dostupný cez `scripts/reset-current-day.js`
- Všetky zmeny sú backward compatible
- Logovanie je rozšírené pre lepšie sledovanie
