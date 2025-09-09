# 🚀 JEDNODUCHÉ POUŽITIE - Ako v starej appke

## ⚡ **JEDEN PRÍKAZ = VŠETKO FUNGUJE**

### **1. Dotiahnuť data teraz:**

```bash
npm run fetch
```

### **2. Spustiť cron (automatické dotahovanie každé 2 minúty):**

```bash
npm run cron
```

### **3. Dotiahnuť data A spustiť cron:**

```bash
npm run fetch-and-cron
```

---

## 🔧 **ČO SA DEJE:**

### **`npm run fetch`** - Dotiahne data teraz:

- ✅ Fetche earnings z Finnhub
- ✅ Fetche market data z Polygon
- ✅ Uloží do databázy
- ✅ Zobrazí výsledky

### **`npm run cron`** - Automatické dotahovanie:

- ✅ Spustí cron worker
- ✅ Každé 2 minúty dotiahne nové data
- ✅ Zobrazuje logy v real-time

---

## 🎯 **OČAKÁVANÉ VÝSLEDKY:**

Po spustení `npm run fetch`:

```
🚀 FETCHING DATA NOW - Simple approach
=====================================
📅 Date: 2025-09-09
🔑 Finnhub API: ✅ Set
🔑 Polygon API: ✅ Set

📊 Fetching earnings from Finnhub...
✅ Found 24 earnings records
✅ Saved: AAPL
✅ Saved: MSFT
...

📈 Fetching market data for 24 tickers...
✅ Market data: AAPL - $150.25 (2.5%)
✅ Market data: MSFT - $300.10 (-1.2%)
...

📊 FINAL RESULTS:
✅ Earnings records: 24
✅ Market records: 24

🎉 Data fetch completed!
🌐 Refresh your app at http://localhost:3000
```

---

## 🚨 **RIEŠENIE PROBLÉMOV:**

### **Problém: Databáza prázdna**

```bash
npm run fetch
```

### **Problém: Data sa neaktualizujú**

```bash
npm run cron
```

### **Problém: Cache nefunguje**

- Otvor http://localhost:3000
- Skontroluj terminal pre cache HIT/MISS

---

## 💡 **TIPY:**

1. **Vždy spusti `npm run fetch` najprv** - dotiahne data
2. **Potom `npm run cron`** - automatické updates
3. **Skontroluj terminal** - zobrazuje všetky logy
4. **Refresh browser** - zobrazí nové data

**Jednoduché ako v starej appke!** 🎉
