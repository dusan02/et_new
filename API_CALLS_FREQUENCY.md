# 📊 Frekvencia API Volaní - Presný Prehľad

## 🎯 **Aktuálne Nastavenie (Teraz)**

### **1. FINNHUB API (Earnings Data)**

```typescript
// Cron: Každé 2 minúty
repeat: {
  cron: "*/2 * * * *";
}

// Počet volaní za minútu: 0.5 calls/min
// Počet volaní za hodinu: 30 calls/hour
// Počet volaní za deň: 720 calls/day
```

### **2. POLYGON API (Market Data)**

```typescript
// Cron: Každých 5 minút
repeat: {
  cron: "*/5 * * * *";
}

// Pre každý ticker sa volajú 2-3 API endpoints:
// 1. /v2/last/nbbo/{ticker} (current quote)
// 2. /v2/aggs/ticker/{ticker}/prev (previous close)
// 3. /v3/reference/tickers/{ticker} (shares outstanding - ak nie je v DB)

// Batch size: 5 tickerov naraz
// Delay medzi batchmi: 2 sekundy
```

---

## 📈 **Detailný Výpočet Polygon API Calls**

### **Scenár 1: 10 tickerov s earnings dnes**

```
- Job sa spustí: každých 5 minút
- Batch size: 5 tickerov
- Počet batchov: 2 (10 tickerov ÷ 5)
- API calls na ticker: 2-3
- Delay medzi batchmi: 2s

Výpočet za 5 minút:
- Batch 1: 5 tickerov × 2.5 calls = 12.5 calls
- Delay: 2s
- Batch 2: 5 tickerov × 2.5 calls = 12.5 calls
- Celkom: 25 calls za 5 minút

Za minútu: 25 ÷ 5 = 5 calls/min
Za hodinu: 5 × 60 = 300 calls/hour
Za deň: 300 × 24 = 7,200 calls/day
```

### **Scenár 2: 50 tickerov s earnings dnes**

```
- Job sa spustí: každých 5 minút
- Batch size: 5 tickerov
- Počet batchov: 10 (50 tickerov ÷ 5)
- API calls na ticker: 2-3
- Delay medzi batchmi: 2s

Výpočet za 5 minút:
- 10 batchov × 5 tickerov × 2.5 calls = 125 calls
- Delay: 9 × 2s = 18s celkovo
- Celkom: 125 calls za 5 minút

Za minútu: 125 ÷ 5 = 25 calls/min
Za hodinu: 25 × 60 = 1,500 calls/hour
Za deň: 1,500 × 24 = 36,000 calls/day
```

---

## 🚨 **API LIMITY vs. NAŠE VOLANIA**

### **FINNHUB LIMITY**

```
Free Tier: 60 calls/minute
Premium: 300 calls/minute

Naše volania: 0.5 calls/min
✅ BEZPEČNÉ - využívame len 0.8% limitu!
```

### **POLYGON/BENZINGA LIMITY**

```
🎉 NEOMBEDZENÝ LIMIT! 🎉
Unlimited API Calls
Unlimited Data Access
No Rate Limits

Naše volania: 5-250 calls/min
✅ ÚPLNE BEZPEČNÉ - môžeme volať koľko chceme!
```

---

## 🔧 **OPTIMALIZOVANÉ NASTAVENIE - NEOMBEDZENÝ LIMIT!**

### **Pre Polygon/Benzinga (Unlimited API Calls)**

```typescript
// Môžeme znížiť interval na každé 2 minúty!
marketDataQueue.add('update-market-data', {}, {
  repeat: { cron: '*/2 * * * *' }, // Every 2 minutes
});

// Batch size: 20 tickerov (viac agresívne)
const batchSize = 20;

// Minimálny delay: 100ms medzi batchmi
await new Promise(resolve => setTimeout(resolve, 100));

Výsledok:
- 10 tickerov: 12.5 calls/min ✅
- 50 tickerov: 62.5 calls/min ✅
- 100 tickerov: 125 calls/min ✅
- 500 tickerov: 625 calls/min ✅
```

### **Ešte Agresívnejšie Nastavenie**

```typescript
// Každú minútu!
marketDataQueue.add('update-market-data', {}, {
  repeat: { cron: '* * * * *' }, // Every minute
});

// Batch size: 50 tickerov
const batchSize = 50;

// Bez delay - maximálna rýchlosť
// await new Promise(resolve => setTimeout(resolve, 0));

Výsledok:
- 100 tickerov: 250 calls/min ✅
- 500 tickerov: 1,250 calls/min ✅
- 1,000 tickerov: 2,500 calls/min ✅
```

---

## 📊 **POROVNANIE SCENÁROV - NEOMBEDZENÝ LIMIT!**

| Scenár         | Tickerov | Polygon Calls/min | Finnhub Calls/min | Status       |
| -------------- | -------- | ----------------- | ----------------- | ------------ |
| **Malý**       | 10       | 12.5              | 0.5               | ✅ UNLIMITED |
| **Stredný**    | 50       | 62.5              | 0.5               | ✅ UNLIMITED |
| **Veľký**      | 100      | 125               | 0.5               | ✅ UNLIMITED |
| **Enterprise** | 500      | 625               | 0.5               | ✅ UNLIMITED |
| **Massive**    | 1,000    | 1,250             | 0.5               | ✅ UNLIMITED |

---

## 🎯 **ODPORÚČANIA - NEOMBEDZENÝ LIMIT!**

### **1. Pre Development/Testing**

```typescript
// Polygon/Benzinga UNLIMITED
- Cron: každých 2 minúty
- Batch size: 20 tickerov
- Max tickerov: UNLIMITED
- Delay: 100ms medzi batchmi
```

### **2. Pre Production (Optimal)**

```typescript
// Polygon/Benzinga UNLIMITED
- Cron: každú minútu
- Batch size: 50 tickerov
- Max tickerov: UNLIMITED
- Delay: 50ms medzi batchmi
```

### **3. Pre Production (Maximum Performance)**

```typescript
// Polygon/Benzinga UNLIMITED
- Cron: každých 30 sekúnd
- Batch size: 100 tickerov
- Max tickerov: UNLIMITED
- Delay: 10ms medzi batchmi
```

---

## 💰 **COST ANALYSIS - NEOMBEDZENÝ LIMIT!**

### **Finnhub**

```
Free Tier: 60 calls/min limit
Naše využitie: 0.5 calls/min
Cost: $0 (v rámci free tieru)
```

### **Polygon/Benzinga**

```
🎉 UNLIMITED API CALLS! 🎉
Unlimited Data Access
No Rate Limits
No Monthly Costs

Naše využitie: 5-2,500 calls/min
Cost: $0 (UNLIMITED ACCESS!)
```

---

## 🚀 **IMPLEMENTAČNÝ PLÁN - NEOMBEDZENÝ LIMIT!**

### **Fáza 1: Optimalizácia pre Maximum Performance**

1. ✅ Zmeniť cron na každých 2 minúty (alebo každú minútu)
2. ✅ Zvýšiť batch size na 20-50 tickerov
3. ✅ Znížiť delay na 50-100ms
4. ✅ Podporovať UNLIMITED tickerov

### **Fáza 2: Real-time Updates**

1. ✅ Zmeniť cron na každých 30 sekúnd
2. ✅ Zvýšiť batch size na 100 tickerov
3. ✅ Znížiť delay na 10ms
4. ✅ Implementovať WebSocket pre live data

### **Fáza 3: Enterprise Scale**

1. ✅ Zmeniť cron na každých 15 sekúnd
2. ✅ Zvýšiť batch size na 200 tickerov
3. ✅ Bez delay - maximálna rýchlosť
4. ✅ Podporovať tisíce tickerov

---

## 🎯 **ZÁVER - NEOMBEDZENÝ LIMIT!**

### **Aktuálne API Calls za minútu:**

- **Finnhub**: 0.5 calls/min ✅ (v rámci free tieru)
- **Polygon/Benzinga**: 5-2,500 calls/min ✅ (UNLIMITED!)

### **Výhoda:**

🎉 **UNLIMITED API CALLS** na Polygon/Benzinga znamená:

- Žiadne rate limity
- Žiadne mesačné poplatky
- Maximálna rýchlosť aktualizácií
- Podpora tisíce tickerov

### **Optimalizované Nastavenie:**

```typescript
// Každú minútu s veľkými batchmi
marketDataQueue.add(
  "update-market-data",
  {},
  {
    repeat: { cron: "* * * * *" }, // Every minute
  }
);

const batchSize = 50; // Veľké batchy
const delay = 50; // Minimálny delay
```

**S týmto nastavením môžeme podporovať UNLIMITED tickerov s earnings každý deň!** 🚀

### **Možnosti:**

- **1,000+ tickerov** s earnings
- **Real-time updates** každú minútu
- **Žiadne obmedzenia** na API calls
- **Maximálna performance** aplikácie
