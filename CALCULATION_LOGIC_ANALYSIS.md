# 🧮 Analýza Logiky Výpočtov - Stará vs. Nová Aplikácia

## 🎯 **Odpoveď na Vašu Otázku:**

**NIE, neprebral som logiku zo starej aplikácie.** Implementoval som **vlastnú logiku** založenú na štandardných finančných výpočtoch a moderných best practices.

---

## 📊 **AKTUÁLNA LOGIKA VÝPOČTOV (Nová Aplikácia)**

### **1. PRICE CHANGE CALCULATION**

```typescript
// src/queue/jobs/updateMarketData.ts:168-170
const priceChangePercent =
  previousClose > 0
    ? ((currentPrice - previousClose) / previousClose) * 100
    : 0;
```

**Formula:**

```
Price Change % = ((Current Price - Previous Close) / Previous Close) × 100
```

**Príklad:**

- Previous Close: $100
- Current Price: $105
- Price Change: ((105 - 100) / 100) × 100 = +5.00%

### **2. MARKET CAP CALCULATION**

```typescript
// src/queue/jobs/updateMarketData.ts:163-165
if (currentPrice > 0 && sharesOutstanding > 0) {
  marketCap = currentPrice * sharesOutstanding;
}
```

**Formula:**

```
Market Cap = Current Price × Shares Outstanding
```

**Príklad:**

- Current Price: $105
- Shares Outstanding: 1,000,000,000
- Market Cap: $105 × 1B = $105B

### **3. MARKET CAP DIFFERENCE CALCULATION**

```typescript
// src/queue/jobs/updateMarketData.ts:181-182
const marketCapDiff = marketCap - previousClose * sharesOutstanding;
const marketCapDiffBillions = marketCapDiff / 1000000000;
```

**Formula:**

```
Market Cap Diff = Current Market Cap - Previous Market Cap
Previous Market Cap = Previous Close × Shares Outstanding
```

**Príklad:**

- Current Market Cap: $105B
- Previous Market Cap: $100B (100 × 1B)
- Market Cap Diff: $105B - $100B = +$5B

### **4. SIZE CATEGORIZATION**

```typescript
// src/queue/jobs/updateMarketData.ts:173-178
let size = "Small";
if (marketCap >= 10000000000) {
  // $10B+
  size = "Large";
} else if (marketCap >= 2000000000) {
  // $2B+
  size = "Mid";
}
```

**Kategórie:**

- **Large Cap**: ≥ $10B
- **Mid Cap**: $2B - $9.99B
- **Small Cap**: < $2B

### **5. EPS/REVENUE SURPRISE CALCULATION**

```typescript
// src/components/EarningsTable.tsx:82-88
const formatSurprise = (
  actual: number | bigint | null,
  estimate: number | bigint | null
) => {
  if (!actual || !estimate) return "-";
  const actualNum = typeof actual === "bigint" ? Number(actual) : actual;
  const estimateNum =
    typeof estimate === "bigint" ? Number(estimate) : estimate;
  const surprise = ((actualNum - estimateNum) / estimateNum) * 100;
  return `${surprise >= 0 ? "+" : ""}${surprise.toFixed(1)}%`;
};
```

**Formula:**

```
Surprise % = ((Actual - Estimate) / Estimate) × 100
```

**Príklad:**

- EPS Estimate: $1.50
- EPS Actual: $1.65
- EPS Surprise: ((1.65 - 1.50) / 1.50) × 100 = +10.0%

---

## 🔍 **POROVNANIE SO ŠTANDARDNÝMI FINANČNÝMI VÝPOČTAMI**

### **✅ SPRÁVNE IMPLEMENTOVANÉ:**

1. **Price Change %**: Štandardný finančný vzorec
2. **Market Cap**: Základný vzorec (Price × Shares)
3. **Market Cap Diff**: Logický rozdiel medzi aktuálnou a predchádzajúcou hodnotou
4. **Surprise %**: Štandardný vzorec pre earnings surprise
5. **Size Categories**: Bežné kategórie (Large/Mid/Small cap)

### **📊 FORMATOVANIE:**

```typescript
// Currency formatting
const formatCurrency = (value: bigint | null) => {
  if (!value) return "-";
  const billions = Number(value) / 1e9;
  return `${billions.toFixed(0)}B`;
};

// Market cap diff formatting
const formatMarketCapDiff = (value: bigint | null) => {
  if (!value) return "-";
  const billions = Number(value) / 1e9;
  return `${billions >= 0 ? "+" : ""}${billions.toFixed(1)}B`;
};

// Price formatting
const formatPrice = (value: number | null) => {
  if (!value) return "-";
  return `$${value.toFixed(2)}`;
};
```

---

## 🤔 **CHÝBAJÚCE GUIDANCE VÝPOČTY**

### **Aktuálne chýba:**

- **EPS Guidance vs. Actual**
- **Revenue Guidance vs. Actual**
- **Guidance Surprise %**

### **Potrebné pridať:**

```typescript
// Guidance calculations (zatiaľ nie implementované)
const formatGuidanceSurprise = (
  actual: number | null,
  guidance: number | null
) => {
  if (!actual || !guidance) return "-";
  const surprise = ((actual - guidance) / guidance) * 100;
  return `${surprise >= 0 ? "+" : ""}${surprise.toFixed(1)}%`;
};
```

---

## 🎯 **ZÁVER**

### **Aktuálna situácia:**

- ✅ **Price, Change, Market Cap Diff**: Implementované správne
- ✅ **EPS/Revenue Surprise**: Implementované správne
- ❌ **Guidance calculations**: Zatiaľ nie implementované

### **Logika je:**

- **Vlastná implementácia** (nie zo starej aplikácie)
- **Založená na štandardných finančných vzorcoch**
- **Moderná a type-safe** (TypeScript)
- **Optimalizovaná pre performance**

### **Potrebné doplniť:**

1. **Guidance data** do databázy
2. **Guidance calculations** v queue jobs
3. **Guidance display** v tabuľke

**Chcete, aby som implementoval guidance calculations?** 🤔
