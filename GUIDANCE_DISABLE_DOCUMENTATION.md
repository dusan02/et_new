# 🚫 GUIDANCE DISABLE DOCUMENTATION

## 📋 **PREHĽAD**

Guidance sekcia bola dočasne zakomentovaná pre produkciu kvôli problémom s period mismatch (FY vs Q) a extrémnymi percentami (+300%!!).

## 🔧 **ČO BOLO ZAKOMENTOVANÉ**

### 1. **API Routes**

- `src/app/api/earnings/route.ts` - guidance data fetching a processing
- `src/app/api/earnings/clear-cache/route.ts` - cache clearing

### 2. **Frontend Components**

- `src/components/EarningsTable.tsx` - guidance tlačidlá a tabuľka
- `src/components/EarningsDashboard.tsx` - guidance data interface

### 3. **Cron Jobs**

- `scripts/fetch-data-now.js` - fetchGuidanceData funkcia
- `src/jobs/fetch-today.ts` - fetchBenzingaGuidance funkcia

### 4. **Utility Functions**

- `src/lib/guidance-utils.ts` - celý súbor
- `src/utils/guidance.ts` - celý súbor
- `src/utils/guidanceLogic.ts` - celý súbor
- `src/lib/guidance.ts` - celý súbor
- `src/utils/fetchers.ts` - batchFetchBenzingaData funkcia
- `src/utils/format.ts` - getGuidanceTitle funkcia

### 5. **Test Files**

- `src/__tests__/api-calls.test.js` - Benzinga API testy
- `src/__tests__/api-endpoints.test.js` - guidance data testy
- `src/__tests__/frontend.test.js` - guidance rendering testy
- `src/__tests__/integration.test.js` - guidance data validation
- `src/__tests__/database.test.js` - guidance database testy
- `src/utils/__tests__/guidance.test.ts` - guidance utility testy

### 6. **Scripts**

- `scripts/monitor-data-flow.js` - guidance count
- `scripts/seed-data.js` - guidance polia v test data

## 🔄 **AKO RE-ENABLE**

### 1. **API Routes**

```typescript
// src/app/api/earnings/route.ts
// Odkomentovať:
import { isGuidanceCompatible, calculateGuidanceSurprise } from '@/lib/guidance-utils'

// Odkomentovať guidance data fetching
const guidanceData = todayTickers.length > 0 ? await prisma.benzingaGuidance.findMany({...})

// Odkomentovať guidance processing v combinedData map
```

### 2. **Frontend Components**

```typescript
// src/components/EarningsTable.tsx
// Odkomentovať:
import { formatGuidePercent, getGuidanceTitle } from "@/utils/format";

// Odkomentovať view toggle buttons
// Odkomentovať guidance table rendering
```

### 3. **Cron Jobs**

```typescript
// scripts/fetch-data-now.js
// Odkomentovať:
async function fetchGuidanceData(tickers) { ... }
await fetchGuidanceData(tickers);

// src/jobs/fetch-today.ts
// Odkomentovať:
async function fetchBenzingaGuidance(tickers: string[]) { ... }
```

### 4. **Utility Functions**

```typescript
// src/lib/guidance-utils.ts
// Odkomentovať celý súbor

// src/utils/guidance.ts
// Odkomentovať celý súbor

// src/utils/guidanceLogic.ts
// Odkomentovať celý súbor

// src/lib/guidance.ts
// Odkomentovať celý súbor

// src/utils/fetchers.ts
// Odkomentovať:
export async function batchFetchBenzingaData(...)

// src/utils/format.ts
// Odkomentovať:
export function getGuidanceTitle(...)
```

### 5. **Test Files**

```javascript
// src/__tests__/api-calls.test.js
// Odkomentovať:
describe("🎯 Benzinga API Tests - Real Implementation", ...)

// src/__tests__/api-endpoints.test.js
// Odkomentovať:
test("Applies guidance data filters correctly", ...)

// src/__tests__/frontend.test.js
// Odkomentovať:
test("Renders guidance data correctly", ...)
test("Renders fallback message for missing guidance", ...)

// src/__tests__/integration.test.js
// Odkomentovať:
expect(record).toHaveProperty("guidanceData");
```

### 6. **Scripts**

```javascript
// scripts/monitor-data-flow.js
// Odkomentovať:
const guidanceCount = await prisma.benzingaGuidance.count();

// scripts/seed-data.js
// Odkomentovať guidance polia v testEarnings array
```

## ⚠️ **DÔLEŽITÉ POZNÁMKY**

1. **Period Mismatch**: Hlavný problém bol v porovnávaní FY (yearly) guidance s Q (quarterly) estimates
2. **BigInt Conversion**: Revenue guidance sa ukladá ako BigInt, treba správne konvertovať
3. **API Rate Limits**: Benzinga API má strict rate limits, treba batch processing
4. **Data Quality**: Guidance data nie je vždy dostupné alebo presné

## 🎯 **PRI RE-ENABLE**

1. **Najprv otestovať** guidance data fetching
2. **Overiť period matching** logic
3. **Testovať surprise calculations** s rôznymi scenármi
4. **Overiť API rate limits** a error handling
5. **Spustiť všetky testy** pred merge do main

## 📅 **DÁTUM ZAKOMENTOVANIA**

2025-01-09 - Guidance sekcia zakomentovaná pre produkciu

## 👤 **AUTOR**

AI Assistant - Cursor

---

**TODO**: Keď sa vrátime k guidance, implementovať robust period matching a lepšie error handling.
