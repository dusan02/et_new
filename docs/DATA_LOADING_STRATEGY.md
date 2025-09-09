# 📊 Stratégia Načítavania Dát

## 🎯 Aktuálny Stav

### **Ako to funguje teraz:**

1. **Cron Jobs** - Bull Queue s Redis
2. **Finnhub API** - Earnings data (s limity)
3. **Polygon API** - Market data (bez limitov)
4. **Database** - SQLite/PostgreSQL storage
5. **Real-time** - Socket.IO updates

### **API Limity:**

- **Finnhub**: 60 calls/minute (Free tier)
- **Polygon**: Unlimited (s vašimi kľúčmi)
- **Benzinga**: Neobmedzené

## 🚀 Optimalizovaná Stratégia

### **1. Hierarchia API Calls**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Finnhub API   │    │  Polygon API    │    │  Benzinga API   │
│  (Earnings)     │    │ (Market Data)   │    │  (News/Events)  │
│  ⚠️ LIMITY      │    │  ✅ UNLIMITED   │    │  ✅ UNLIMITED   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Earnings    │  │ Market Data │  │ News/Events │            │
│  │ (Finnhub)   │  │ (Polygon)   │  │ (Benzinga)  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                    │
│              Real-time Updates (Socket.IO)                     │
└─────────────────────────────────────────────────────────────────┘
```

### **2. Optimalizované Cron Jobs**

#### **A. Earnings Data (Finnhub) - Každé 2 minúty**

```typescript
// Optimalizované pre Finnhub limity
const EARNINGS_SCHEDULE = {
  frequency: "*/2 * * * *", // Každé 2 minúty
  batchSize: 1, // Jeden call na batch
  delay: 1000, // 1s delay medzi calls
  maxRetries: 3,
  fallback: "polygon-earnings", // Fallback na Polygon
};
```

#### **B. Market Data (Polygon) - Každé 30 sekúnd**

```typescript
// Rýchlejšie pre Polygon (bez limitov)
const MARKET_DATA_SCHEDULE = {
  frequency: "*/30 * * * * *", // Každých 30 sekúnd
  batchSize: 10, // 10 tickerov naraz
  delay: 100, // 100ms delay
  maxRetries: 2,
  priority: "high",
};
```

#### **C. News/Events (Benzinga) - Každých 5 minút**

```typescript
// Pre news a events
const NEWS_SCHEDULE = {
  frequency: "*/5 * * * *", // Každých 5 minút
  batchSize: 5,
  delay: 500,
  maxRetries: 2,
};
```

### **3. Smart Caching Strategy**

#### **A. Redis Cache Layers**

```typescript
const CACHE_STRATEGY = {
  // Level 1: Hot data (1 minút)
  hot: {
    ttl: 60, // 1 minút
    keys: ["current-prices", "active-earnings"],
  },

  // Level 2: Warm data (5 minút)
  warm: {
    ttl: 300, // 5 minút
    keys: ["market-data", "earnings-stats"],
  },

  // Level 3: Cold data (1 hodina)
  cold: {
    ttl: 3600, // 1 hodina
    keys: ["company-info", "historical-data"],
  },
};
```

#### **B. Database Optimization**

```sql
-- Indexy pre rýchle queries
CREATE INDEX idx_earnings_date_ticker ON earningsTickersToday(reportDate, ticker);
CREATE INDEX idx_market_data_ticker ON todayEarningsMovements(ticker);
CREATE INDEX idx_earnings_updated ON earningsTickersToday(updatedAt);

-- Partitioning pre veľké tabuľky
CREATE TABLE earnings_2025 PARTITION OF earningsTickersToday
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

### **4. Fallback Strategy**

#### **A. Finnhub → Polygon Fallback**

```typescript
async function fetchEarningsWithFallback(date: string) {
  try {
    // Primary: Finnhub
    const finnhubData = await fetchFromFinnhub(date);
    if (finnhubData.length > 0) {
      return finnhubData;
    }
  } catch (error) {
    logger.warn("Finnhub failed, trying Polygon fallback");
  }

  try {
    // Fallback: Polygon
    const polygonData = await fetchFromPolygon(date);
    return polygonData;
  } catch (error) {
    logger.error("Both APIs failed");
    throw error;
  }
}
```

#### **B. API Health Monitoring**

```typescript
const API_HEALTH = {
  finnhub: {
    status: "healthy",
    lastSuccess: new Date(),
    errorCount: 0,
    rateLimit: 60, // calls per minute
  },
  polygon: {
    status: "healthy",
    lastSuccess: new Date(),
    errorCount: 0,
    rateLimit: Infinity,
  },
};
```

### **5. Real-time Updates Strategy**

#### **A. WebSocket Events**

```typescript
const WEBSOCKET_EVENTS = {
  // Immediate updates
  "price-update": { priority: "high", throttle: 100 },
  "earnings-update": { priority: "high", throttle: 500 },

  // Batch updates
  "market-data-batch": { priority: "medium", throttle: 1000 },
  "stats-update": { priority: "low", throttle: 5000 },
};
```

#### **B. Client-side Optimization**

```typescript
// Frontend throttling
const useThrottledUpdates = (callback, delay) => {
  const throttledCallback = useCallback(throttle(callback, delay), [
    callback,
    delay,
  ]);

  return throttledCallback;
};
```

## 🔧 Implementácia

### **1. Optimalizované Job Scheduler**

```typescript
// src/queue/optimizedScheduler.ts
export class OptimizedScheduler {
  private finnhubRateLimit = new RateLimiter(60, 60000); // 60 calls per minute
  private polygonRateLimit = new RateLimiter(1000, 60000); // 1000 calls per minute

  async scheduleEarningsFetch() {
    // Respektovať Finnhub limity
    await this.finnhubRateLimit.acquire();

    const data = await this.fetchEarningsData();
    await this.cacheData("earnings", data, 300); // 5 min cache

    return data;
  }

  async scheduleMarketDataUpdate() {
    // Polygon bez limitov - môžeme byť agresívnejší
    const tickers = await this.getActiveTickers();

    for (const batch of this.chunkArray(tickers, 10)) {
      await Promise.all(batch.map((ticker) => this.updateMarketData(ticker)));

      // Krátky delay pre stability
      await this.delay(100);
    }
  }
}
```

### **2. Smart Caching Layer**

```typescript
// src/cache/smartCache.ts
export class SmartCache {
  private redis: Redis;

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Skús cache
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch a cache
    const data = await fetcher();
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data;
  }

  async invalidatePattern(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### **3. API Health Monitor**

```typescript
// src/monitoring/apiHealth.ts
export class APIHealthMonitor {
  private healthStatus = new Map<string, APIStatus>();

  async checkAPIHealth(apiName: string): Promise<boolean> {
    try {
      const start = Date.now();
      await this.pingAPI(apiName);
      const responseTime = Date.now() - start;

      this.updateHealthStatus(apiName, {
        status: "healthy",
        responseTime,
        lastCheck: new Date(),
      });

      return true;
    } catch (error) {
      this.updateHealthStatus(apiName, {
        status: "unhealthy",
        error: error.message,
        lastCheck: new Date(),
      });

      return false;
    }
  }

  async getOptimalAPI(apis: string[]): Promise<string> {
    const healthyAPIs = apis.filter(
      (api) => this.healthStatus.get(api)?.status === "healthy"
    );

    // Vráť najrýchlejší
    return healthyAPIs.sort(
      (a, b) =>
        this.healthStatus.get(a)!.responseTime -
        this.healthStatus.get(b)!.responseTime
    )[0];
  }
}
```

## 📊 Monitoring & Metrics

### **1. Performance Metrics**

```typescript
const METRICS = {
  apiCalls: {
    finnhub: { total: 0, success: 0, failed: 0 },
    polygon: { total: 0, success: 0, failed: 0 },
  },
  cache: {
    hitRate: 0.85, // 85% cache hit rate
    missRate: 0.15,
  },
  performance: {
    avgResponseTime: 250, // ms
    p95ResponseTime: 500,
    p99ResponseTime: 1000,
  },
};
```

### **2. Alerting**

```typescript
const ALERTS = {
  finnhubRateLimit: {
    threshold: 50, // calls per minute
    action: "switchToPolygon",
  },
  apiErrorRate: {
    threshold: 0.1, // 10% error rate
    action: "alertAdmin",
  },
  cacheHitRate: {
    threshold: 0.7, // 70% hit rate
    action: "optimizeCache",
  },
};
```

## 🎯 Výsledky

### **Očakávané Zlepšenia:**

- **API Efficiency**: 90% redukcia Finnhub calls
- **Response Time**: 50% rýchlejšie načítanie
- **Cache Hit Rate**: 85%+ cache hit rate
- **Error Rate**: <5% error rate
- **Real-time Updates**: <100ms latency

### **Cost Optimization:**

- **Finnhub**: Minimalizácia calls (ušetrenie $)
- **Polygon**: Maximálne využitie (bez limitov)
- **Infrastructure**: Efektívnejšie využitie resources

## 🚀 Implementačný Plán

### **Fáza 1 (1 týždeň)**

1. Implementovať smart caching
2. Optimalizovať cron jobs
3. Pridať API health monitoring

### **Fáza 2 (2 týždne)**

1. Implementovať fallback strategy
2. Pridať performance metrics
3. Optimalizovať WebSocket updates

### **Fáza 3 (3 týždne)**

1. Implementovať alerting
2. Pridať advanced monitoring
3. Fine-tuning performance

**Táto stratégia zabezpečí efektívne načítavanie dát s respektovaním API limitov a maximálnym výkonom!** 🚀
