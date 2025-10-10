# 🎛️ Mock Switch System

## Prehľad

Tento systém poskytuje robustný prepínač medzi mock a live dátami pre earnings API, zabraňuje regresiám a zaisťuje jednotný zdroj pravdy.

## 🚀 Rýchle spustenie

### Development (Mock Mode)

```bash
# V .env súbore
USE_MOCK_EARNINGS=1

# Spusti server
npm run dev

# Spusti sanity test
node scripts/sanity-test.js
```

### Production (Live Mode)

```bash
# V .env súbore
USE_MOCK_EARNINGS=0

# Spusti server
npm run start
```

## 📁 Štruktúra

```
src/app/api/earnings/
├── _shared/
│   └── buildEarnings.ts          # Jednotný zdroj pravdy
├── route.ts                      # /api/earnings endpoint
└── stats/
    └── route.ts                  # /api/earnings/stats endpoint

scripts/
└── sanity-test.js               # Automatizovaný test
```

## 🔧 Ako to funguje

### 1. Environment Switch

- `USE_MOCK_EARNINGS=1` → Mock dáta (development)
- `USE_MOCK_EARNINGS=0` → Live dáta (production)

### 2. Unified Builder

- `buildLiveOrMockEarnings()` - jediná funkcia pre oba módy
- Vracia konzistentný payload: `{ data, meta: { stats, ... } }`
- Automatický fallback pri chybách

### 3. API Endpoints

- `/api/earnings` - vracia `data` + `meta.stats`
- `/api/earnings/stats` - číta z `/api/earnings` a vracia len `stats`
- **Žiadna duplicita** - jeden zdroj pravdy

### 4. Error Handling

- Nikdy nevrátia 500 - vždy 200 s fallback dátami
- Logujú chyby pre debugging
- Frontend nikdy neuvidí "Try Again" tlačidlo

## 🧪 Testing

### Sanity Test

```bash
node scripts/sanity-test.js
```

Testuje:

- ✅ Oba endpointy fungujú (HTTP 200)
- ✅ Data consistency (earnings count = stats total)
- ✅ Required fields present
- ✅ Cache headers configured
- ✅ Sample data valid

### Manual Test

```bash
# Test earnings endpoint
curl -s localhost:3000/api/earnings | jq '{count: (.data|length), hasStats: (.meta.stats!=null)}'

# Test stats endpoint
curl -s localhost:3000/api/earnings/stats | jq '.data.totalEarnings'

# Test mock switch
USE_MOCK_EARNINGS=0 node scripts/sanity-test.js
```

## 🔄 Migrácia na Live Data

Keď budeš pripravený na live dáta:

1. **Nastav environment:**

   ```bash
   USE_MOCK_EARNINGS=0
   ```

2. **Implementuj live branch v `buildLiveOrMockEarnings()`:**

   ```typescript
   if (USE_MOCK) {
     return mockPayload;
   }

   // TODO: Implement live data fetching
   const liveData = await fetchFromRedisOrDB();
   return livePayload;
   ```

3. **Spusti sanity test:**

   ```bash
   node scripts/sanity-test.js
   ```

4. **Pridaj e2e test do CI:**
   ```bash
   # Ak /api/earnings vráti count>0, tak /api/earnings/stats.total musí byť rovné count
   ```

## 🛡️ Service Worker

Service Worker je nakonfigurovaný tak, aby:

- ✅ Cache-oval statické assets (CSS/JS/fonty)
- ❌ **Necache-oval** `/api/earnings*` endpointy (vždy fresh data)
- ✅ Fallback na cached verzie pri network chybách

## 🚨 Troubleshooting

### Frontend zobrazuje "Try Again"

- Skontroluj, či oba API endpointy vracajú HTTP 200
- Spusti `node scripts/sanity-test.js`
- Skontroluj DevTools Console pre chyby

### Data inconsistency

- `/api/earnings` a `/api/earnings/stats` musia používať rovnaký zdroj
- Skontroluj, či `buildLiveOrMockEarnings()` vracia konzistentné dáta

### Cache problémy

- Service Worker skipuje `/api/earnings*` endpointy
- API vracajú `Cache-Control: no-store`
- Hard refresh (Ctrl+F5) pre vymazanie cache

## 📊 Monitoring

### Logy

- `[BUILDER] USE_MOCK=true/false` - prepínač stav
- `[API][UNIFIED] count=X hasStats=true/false` - API stav
- `[STATS][UNIFIED] totalEarnings=X` - stats stav

### Metrics

- Earnings count vs Stats total (musia byť rovnaké)
- API response times
- Error rates (malé by mali byť 0%)

## 🎯 Výhody

1. **Žiadne regresie** - mock a live používajú rovnaký kód
2. **Jednotný zdroj pravdy** - `/api/earnings/stats` číta z `/api/earnings`
3. **Robustné error handling** - nikdy 500, vždy fallback
4. **Automatizované testovanie** - sanity test pre každú zmenu
5. **Jednoduché prepínanie** - jedna environment variable
6. **Service Worker safe** - earnings API nie sú cache-ované

---

**💡 Tip:** Vždy spusti sanity test po zmene API kódu!

