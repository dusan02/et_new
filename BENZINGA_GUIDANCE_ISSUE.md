# 🚨 Benzinga Guidance Issue - Kvartálne vs. Ročné Údaje

## 🎯 **Problém:**

Benzinga niekedy reportuje **kvartálne vs. ročné** guidance údaje, čo spôsobuje **veľké nepresnosti** v calculations.

## 🔍 **Typické Scenáre:**

### **Scenár 1: Kvartálne vs. Ročné**

```
EPS Guidance: $1.50 (kvartálne)
EPS Actual: $1.65 (kvartálne)
Surprise: +10.0% ✅ SPRÁVNE

EPS Guidance: $1.50 (kvartálne)
EPS Actual: $6.60 (ročné - 4 kvartály)
Surprise: +340% ❌ NESPRÁVNE!
```

### **Scenár 2: Revenue Guidance**

```
Revenue Guidance: $100M (kvartálne)
Revenue Actual: $110M (kvartálne)
Surprise: +10.0% ✅ SPRÁVNE

Revenue Guidance: $100M (kvartálne)
Revenue Actual: $440M (ročné - 4 kvartály)
Surprise: +340% ❌ NESPRÁVNE!
```

---

## 🛠️ **RIEŠENIE - Smart Guidance Detection**

### **1. Period Detection Logic**

```typescript
interface GuidanceData {
  epsGuidance: number | null;
  revenueGuidance: bigint | null;
  period: "quarterly" | "yearly" | "unknown";
  confidence: number; // 0-100%
}

function detectGuidancePeriod(
  actual: number | bigint,
  guidance: number | bigint,
  historicalData?: number[]
): GuidanceData {
  const actualNum = typeof actual === "bigint" ? Number(actual) : actual;
  const guidanceNum =
    typeof guidance === "bigint" ? Number(guidance) : guidance;

  const ratio = actualNum / guidanceNum;

  // Detect if guidance is quarterly vs yearly
  if (ratio >= 3.5 && ratio <= 4.5) {
    // Likely quarterly guidance vs yearly actual
    return {
      epsGuidance: guidanceNum * 4, // Convert to yearly
      revenueGuidance:
        typeof guidance === "bigint"
          ? guidance * BigInt(4)
          : BigInt(guidanceNum * 4),
      period: "quarterly",
      confidence: 85,
    };
  } else if (ratio >= 0.2 && ratio <= 0.3) {
    // Likely yearly guidance vs quarterly actual
    return {
      epsGuidance: guidanceNum / 4, // Convert to quarterly
      revenueGuidance:
        typeof guidance === "bigint"
          ? guidance / BigInt(4)
          : BigInt(guidanceNum / 4),
      period: "yearly",
      confidence: 85,
    };
  } else if (ratio >= 0.8 && ratio <= 1.2) {
    // Likely same period
    return {
      epsGuidance: guidanceNum,
      revenueGuidance: guidance,
      period: "unknown",
      confidence: 90,
    };
  }

  return {
    epsGuidance: guidanceNum,
    revenueGuidance: guidance,
    period: "unknown",
    confidence: 50,
  };
}
```

### **2. Enhanced Database Schema**

```prisma
model EarningsTickersToday {
  id           Int      @id @default(autoincrement())
  reportDate   DateTime
  ticker       String
  reportTime   String   // BMO, AMC, TNS
  epsActual    Float?
  epsEstimate  Float?
  revenueActual BigInt?
  revenueEstimate BigInt?

  // NEW: Guidance fields
  epsGuidance         Float?
  revenueGuidance     BigInt?
  guidancePeriod      String?  // 'quarterly', 'yearly', 'unknown'
  guidanceConfidence  Int?     // 0-100%
  guidanceSource      String?  // 'benzinga', 'finnhub', 'polygon'

  sector       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([reportDate, ticker])
  @@index([reportDate, reportTime])
  @@index([epsActual])
  @@index([revenueActual])
  @@index([epsGuidance])
  @@index([revenueGuidance])
  @@map("earnings_tickers_today")
}
```

### **3. Smart Guidance Calculation**

```typescript
function calculateGuidanceSurprise(
  actual: number | bigint,
  guidance: number | bigint,
  period: string,
  confidence: number
): {
  surprise: number;
  adjusted: boolean;
  warning?: string;
} {
  if (!actual || !guidance) {
    return { surprise: 0, adjusted: false };
  }

  const actualNum = typeof actual === "bigint" ? Number(actual) : actual;
  const guidanceNum =
    typeof guidance === "bigint" ? Number(guidance) : guidance;

  // If confidence is low, show warning
  if (confidence < 70) {
    return {
      surprise: ((actualNum - guidanceNum) / guidanceNum) * 100,
      adjusted: false,
      warning: "Low confidence in guidance period detection",
    };
  }

  // Calculate surprise with adjusted guidance
  const surprise = ((actualNum - guidanceNum) / guidanceNum) * 100;

  return {
    surprise,
    adjusted: period !== "unknown",
    warning:
      period !== "unknown"
        ? `Guidance adjusted from ${period} to match actual period`
        : undefined,
  };
}
```

### **4. Benzinga Data Processing**

```typescript
async function processBenzingaGuidance(ticker: string, reportDate: Date) {
  try {
    // Fetch from Benzinga API
    const benzingaResponse = await axios.get(
      `https://api.benzinga.com/api/v2.1/calendar/earnings`,
      {
        params: {
          token: process.env.BENZINGA_API_KEY,
          symbols: ticker,
          date: reportDate.toISOString().split("T")[0],
        },
      }
    );

    const data = benzingaResponse.data;

    // Process each guidance entry
    for (const entry of data.earnings) {
      const guidanceData = detectGuidancePeriod(
        entry.eps_actual,
        entry.eps_guidance,
        entry.historical_eps // If available
      );

      // Save with period detection
      await prisma.earningsTickersToday.upsert({
        where: {
          reportDate_ticker: {
            reportDate,
            ticker: entry.symbol,
          },
        },
        update: {
          epsGuidance: guidanceData.epsGuidance,
          revenueGuidance: guidanceData.revenueGuidance,
          guidancePeriod: guidanceData.period,
          guidanceConfidence: guidanceData.confidence,
          guidanceSource: "benzinga",
        },
        create: {
          reportDate,
          ticker: entry.symbol,
          epsActual: entry.eps_actual,
          epsEstimate: entry.eps_estimate,
          epsGuidance: guidanceData.epsGuidance,
          revenueGuidance: guidanceData.revenueGuidance,
          guidancePeriod: guidanceData.period,
          guidanceConfidence: guidanceData.confidence,
          guidanceSource: "benzinga",
          reportTime:
            entry.hour === "bmo" ? "BMO" : entry.hour === "amc" ? "AMC" : "TNS",
        },
      });
    }
  } catch (error) {
    logger.error(`Failed to process Benzinga guidance for ${ticker}:`, error);
  }
}
```

### **5. Frontend Display with Warnings**

```typescript
const formatGuidanceSurprise = (
  actual: number | bigint | null,
  guidance: number | bigint | null,
  period: string | null,
  confidence: number | null
) => {
  if (!actual || !guidance) return "-";

  const result = calculateGuidanceSurprise(
    actual,
    guidance,
    period || "unknown",
    confidence || 0
  );

  return (
    <div className="flex items-center gap-1">
      <span className={getSurpriseClass(result.surprise)}>
        {result.surprise >= 0 ? "+" : ""}
        {result.surprise.toFixed(1)}%
      </span>
      {result.adjusted && (
        <span className="text-xs text-yellow-600" title={result.warning}>
          ⚠️
        </span>
      )}
      {result.warning && (
        <span className="text-xs text-red-600" title={result.warning}>
          ⚠️
        </span>
      )}
    </div>
  );
};
```

---

## 🎯 **IMPLEMENTAČNÝ PLÁN**

### **Fáza 1: Database Schema Update**

1. ✅ Pridať guidance fields do Prisma schema
2. ✅ Migrácia databázy
3. ✅ Update TypeScript interfaces

### **Fáza 2: Period Detection Logic**

1. ✅ Implementovať `detectGuidancePeriod` funkciu
2. ✅ Pridať confidence scoring
3. ✅ Testovať s rôznymi scenármi

### **Fáza 3: Benzinga Integration**

1. ✅ Pridať Benzinga API calls
2. ✅ Implementovať smart processing
3. ✅ Pridať error handling

### **Fáza 4: Frontend Display**

1. ✅ Pridať guidance columns do tabuľky
2. ✅ Implementovať warning indicators
3. ✅ Pridať tooltips s vysvetlením

---

## 🚨 **DÔLEŽITÉ POZNÁMKY**

### **1. Confidence Thresholds**

- **90%+**: Vysoká dôvera - zobraziť bez varovania
- **70-89%**: Stredná dôvera - zobraziť s malým varovaním
- **<70%**: Nízka dôvera - zobraziť s veľkým varovaním

### **2. Historical Data**

- Použiť historické údaje pre lepšiu detekciu
- Porovnať s predchádzajúcimi kvartálmi
- Implementovať machine learning pre pattern recognition

### **3. Multiple Sources**

- Kombinovať Benzinga + Finnhub + Polygon
- Cross-validate guidance data
- Použiť consensus z viacerých zdrojov

---

## 🎯 **ZÁVER**

**Problém s Benzinga guidance je reálny a dôležitý!**

Implementácia smart period detection a confidence scoring pomôže:

- ✅ **Eliminovať falošné surprise** z kvartálnych vs. ročných údajov
- ✅ **Zvýšiť presnosť** guidance calculations
- ✅ **Poskytnúť transparentnosť** používateľom
- ✅ **Zabrániť zavádzajúcim výsledkom**

**Chcete, aby som implementoval túto logiku?** 🤔
