# 📊 Data Quality System

## Prehľad

Systém pre monitorovanie a zabezpečenie kvality dát v aplikácii Earnings Table. Implementuje validáciu, fallback mechanizmy a monitoring pre lepšie error handling.

## Komponenty

### 1. Data Quality Validator (`src/modules/shared/validation/data-quality.validator.ts`)

Centralizovaný validator pre kontrolu kvality dát z externých API.

**Funkcie:**

- Validácia earnings dát
- Validácia market dát
- Validácia API response
- Detekcia extrémnych hodnôt
- Klasifikácia issues podľa severity

**Príklad použitia:**

```typescript
const result = DataQualityValidator.validateMarketData(data, ticker);
if (!result.isValid) {
  DataQualityValidator.logIssues(result.issues, "Market Data Validation");
}
```

### 2. Data Fallback Service (`src/modules/shared/fallback/data-fallback.service.ts`)

Automatické fallback mechanizmy pre missing data.

**Strategie:**

- `use_previous_close_as_current` - použije previous close ako current price
- `calculate_market_cap_from_price_shares` - vypočíta market cap z ceny a akcií
- `use_ticker_as_company_name` - použije ticker ako company name
- `set_default_company_type` - nastaví default company type
- `classify_size_from_market_cap` - klasifikuje veľkosť z market cap

**Príklad použitia:**

```typescript
const result = DataFallbackService.applyMarketDataFallbacks(data, issues);
if (result.success) {
  console.log(`Applied strategies: ${result.appliedStrategies.join(", ")}`);
}
```

### 3. Data Quality Monitor (`src/modules/shared/monitoring/data-quality-monitor.ts`)

Monitoring systém pre sledovanie kvality dát a alertov.

**Funkcie:**

- Nahrávanie metrík
- Automatické alerty
- Trend analýza
- Cleanup starých dát

**Príklad použitia:**

```typescript
DataQualityMonitor.recordMetrics(
  totalRecords,
  validRecords,
  issues,
  fallbackResults
);
const latestMetrics = DataQualityMonitor.getLatestMetrics();
const activeAlerts = DataQualityMonitor.getActiveAlerts();
```

## API Endpoints

### Data Quality API (`/api/data-quality`)

**GET Parameters:**

- `action=metrics` - vráti aktuálne metriky
- `action=alerts` - vráti alerty
- `action=trend&hours=24` - vráti trend kvality
- `action=stats` - vráti štatistiky

**POST Actions:**

- `resolve_alert` - označí alert ako vyriešený
- `cleanup` - vyčistí staré dáta

**Príklady:**

```bash
# Získať metriky
curl "http://localhost:3000/api/data-quality?action=metrics"

# Získať alerty
curl "http://localhost:3000/api/data-quality?action=alerts"

# Získať trend za 24 hodín
curl "http://localhost:3000/api/data-quality?action=trend&hours=24"

# Vyriešiť alert
curl -X POST "http://localhost:3000/api/data-quality" \
  -H "Content-Type: application/json" \
  -d '{"action": "resolve_alert", "alertId": "alert_123"}'
```

## Integrácia

### V fetch-data-now.js

Script teraz obsahuje:

- Data quality validation pre každý ticker
- Warning logy pre problémy s dátami
- Súhrnné metriky na konci

**Príklad výstupu:**

```
⚠️ [DATA QUALITY] UNXP: 1 issues detected
  - HIGH: Missing current price
✅ Market data: UNXP - $1.79 (0.00%) N/A

📊 [DATA QUALITY SUMMARY]
   Total records processed: 62
   Data quality monitoring: Active
   Fallback mechanisms: Available
   Error handling: Enhanced
```

## Konfigurácia

### Thresholds

V `DataQualityValidator` sú definované thresholdy:

```typescript
private static readonly THRESHOLDS = {
  MIN_PRICE: 0.001,
  MAX_PRICE: 10000,
  MAX_PRICE_CHANGE_PERCENT: 50,
  MIN_MARKET_CAP: 1000,
  MAX_MARKET_CAP: 10000000000000,
  // ... ďalšie
}
```

### Alert Conditions

V `DataQualityMonitor` sú definované podmienky pre alerty:

- **CRITICAL**: Kvalita < 50%
- **HIGH**: Kvalita < 80%
- **MEDIUM**: Nadmerné použitie fallbackov (>50%)
- **LOW**: Vysoké množstvo high issues (>20%)

## Monitoring

### Metriky

Systém sleduje:

- Celkový počet záznamov
- Počet validných záznamov
- Quality score (0-100%)
- Issues podľa typu a severity
- Počet aplikovaných fallbackov

### Alerty

Typy alertov:

- `QUALITY_DROP` - pokles kvality dát
- `CRITICAL_ISSUES` - kritické problémy
- `FALLBACK_OVERUSE` - nadmerné použitie fallbackov
- `API_ERRORS` - chyby API

## Výhody

1. **Lepšie Error Handling** - automatická detekcia problémov
2. **Fallback Mechanizmy** - automatické riešenie missing dát
3. **Monitoring** - sledovanie kvality v reálnom čase
4. **Alerty** - upozornenia na problémy
5. **API** - programový prístup k metrikám
6. **Dokumentácia** - jasné logy a správy

## Budúce vylepšenia

- [ ] Machine learning pre predikciu problémov
- [ ] Automatické riešenie alertov
- [ ] Dashboard pre monitoring
- [ ] Email notifikácie
- [ ] Integrácia s externými monitoring systémami
