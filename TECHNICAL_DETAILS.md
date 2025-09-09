# 🔧 Technical Details & Considerations

## 🗄️ Database Architecture - Detailed Analysis

### **Denormalization Strategy**

**Current Structure:**

```
EarningsTickersToday (Main table)
├── Basic earnings data (ticker, eps, revenue)
├── Market data (close_price, pre_market, after_hours) ← DUPLICATED
└── Company info (name, sector, size)

TodayEarningsMovements (Market data table)
├── Market data (close_price, pre_market, after_hours) ← DUPLICATED
└── Price movements, volume data
```

**⚠️ Risk of Data Inconsistency:**

- Market data je duplikované v oboch tabuľkách
- Ak cron job update neprebehne konzistentne → **data mismatch**
- Riešenie: Transactional updates alebo single source of truth

**Recommended Approach:**

```sql
-- Option 1: Single table with all data
EarningsTickersToday (denormalized)
├── All earnings data
├── All market data
└── All company data

-- Option 2: Normalized with proper relationships
EarningsTickersToday (earnings only)
├── ticker, eps_actual, eps_estimate, revenue_actual, revenue_estimate

TodayEarningsMovements (market data only)
├── ticker, close_price, pre_market, after_hours, volume

-- JOIN when needed for display
```

## 💰 Revenue Storage - BigInt Handling

### **Current Implementation:**

```typescript
// Storage
revenueActual: string | null; // BigInt serialized as string
revenueEstimate: string | null; // BigInt serialized as string

// Example values:
("1234567890000"); // $1.23 trillion
("500000000000"); // $500 billion
```

### **⚠️ Critical Conversion Requirements:**

**1. Display Formatting:**

```typescript
const formatRevenue = (value: string | bigint | null) => {
  if (!value) return "-";

  // CRITICAL: Convert string back to number
  const num = typeof value === "string" ? Number(value) : Number(value);

  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  return `$${num.toFixed(0)}`;
};
```

**2. Calculations:**

```typescript
const calculateRevenueSurprise = (actual: string, estimate: string) => {
  // CRITICAL: Convert strings to numbers for calculations
  const actualNum = Number(actual);
  const estimateNum = Number(estimate);

  return ((actualNum - estimateNum) / estimateNum) * 100;
};
```

**3. Database Queries:**

```typescript
// Prisma query with BigInt conversion
const earnings = await prisma.earningsTickersToday.findMany({
  select: {
    ticker: true,
    revenueActual: true, // Returns as string
    revenueEstimate: true, // Returns as string
  },
});

// Convert for calculations
earnings.forEach((earning) => {
  const actual = Number(earning.revenueActual);
  const estimate = Number(earning.revenueEstimate);
  // ... calculations
});
```

### **⚠️ Potential Issues:**

**1. Precision Loss:**

```typescript
// BigInt can handle very large numbers
const bigRevenue = BigInt("1234567890123456789");

// But Number() conversion might lose precision for very large numbers
const converted = Number(bigRevenue); // Might lose precision
```

**2. Type Safety:**

```typescript
// Always validate before conversion
const safeConvert = (value: string | null): number => {
  if (!value) return 0;

  try {
    const num = Number(value);
    if (isNaN(num)) throw new Error("Invalid number");
    return num;
  } catch (error) {
    console.error("Revenue conversion error:", error);
    return 0;
  }
};
```

## 🔄 Data Consistency Solutions

### **Option 1: Transactional Updates**

```typescript
// Update both tables in single transaction
await prisma.$transaction(async (tx) => {
  // Update main table
  await tx.earningsTickersToday.update({
    where: { ticker },
    data: { closePrice: newPrice },
  });

  // Update movements table
  await tx.todayEarningsMovements.update({
    where: { ticker },
    data: { closePrice: newPrice },
  });
});
```

### **Option 2: Single Source of Truth**

```typescript
// Store market data only in one table
// Reference it from main table
const earningsWithMarket = await prisma.earningsTickersToday.findMany({
  include: {
    marketData: true, // JOIN with movements table
  },
});
```

### **Option 3: Event-Driven Updates**

```typescript
// Update main table first, then trigger movement update
await prisma.earningsTickersToday.update({
  where: { ticker },
  data: { closePrice: newPrice },
});

// Trigger movement update via event
await updateMarketMovements(ticker, newPrice);
```

## 📊 Performance Considerations

### **Current Denormalization Benefits:**

- ✅ Faster queries (no JOINs)
- ✅ Simpler frontend code
- ✅ Better caching

### **Current Denormalization Risks:**

- ❌ Data inconsistency
- ❌ Storage overhead
- ❌ Update complexity

### **Recommended Hybrid Approach:**

```sql
-- Keep denormalized for read performance
EarningsTickersToday (denormalized for display)

-- Add normalized for consistency
EarningsMarketData (single source of truth)
├── ticker, timestamp, price, volume

-- Sync strategy
1. Update normalized table first
2. Propagate to denormalized table
3. Use transactions for consistency
```

## 🎯 Implementation Recommendations

### **Immediate Actions:**

1. **Add data validation** for BigInt conversions
2. **Implement transactional updates** for market data
3. **Add consistency checks** in cron jobs
4. **Monitor data drift** between tables

### **Long-term Improvements:**

1. **Consider single table** approach
2. **Implement event-driven updates**
3. **Add data integrity constraints**
4. **Create data reconciliation jobs**

**Tieto technické detaily sú kritické pre stabilitu a konzistentnosť aplikácie!** 🎯
