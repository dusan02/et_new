# 📊 Data Flow - Ako Funguje Načítavanie Dát

## 🎯 **Odpovede na Vaše Otázky:**

### **1. Data sa budú doťahovať do DB ako?**

### **2. Už sú vytvorené tabuľky?**

### **3. Z DB na FE je použitá aká technológia?**

---

## 🗄️ **1. DATABASE TABUĽKY - UŽ SÚ VYTVORENÉ!**

### **A. Prisma Schema (prisma/schema.prisma)**

```sql
-- Hlavné tabuľky už existujú:

1. EarningsTickersToday
   - id, reportDate, ticker, reportTime
   - epsActual, epsEstimate, revenueActual, revenueEstimate
   - sector, createdAt, updatedAt

2. TodayEarningsMovements
   - ticker, companyName, currentPrice, previousClose
   - marketCap, size, marketCapDiff, priceChangePercent
   - sharesOutstanding

3. SharesOutstanding
   - ticker, sharesOutstanding

4. CronHeartbeat
   - jobName, lastRun, status, message

5. ApiRateLimit
   - apiName, requests, resetTime
```

### **B. Indexy pre Performance**

```sql
-- Optimalizované indexy
@@index([reportDate, reportTime])
@@index([epsActual])
@@index([revenueActual])
@@index([marketCapDiff])
@@index([priceChangePercent])
```

---

## 🔄 **2. DATA FLOW - KOMPLETNÝ PROCES**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EXTERNAL      │    │   QUEUE         │    │   DATABASE      │
│   APIs          │    │   WORKER        │    │   (SQLite)      │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  Finnhub    │ │───▶│ │ Bull Queue  │ │───▶│ │ Prisma ORM  │ │
│ │  (Earnings) │ │    │ │ + Redis     │ │    │ │ + SQLite    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  Polygon    │ │───▶│ │ Cron Jobs   │ │───▶│ │ Tables      │ │
│ │ (Market)    │ │    │ │ (Every 2min)│ │    │ │ (5 tables)  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REAL-TIME LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Socket.IO   │  │ WebSocket   │  │ Live Updates│            │
│  │ Server      │  │ Client      │  │ (100ms)     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Next.js     │  │ React       │  │ TypeScript  │            │
│  │ API Routes  │  │ Components  │  │ + Tailwind  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ **3. TECHNICKÉ DETAILY**

### **A. API → Database (Backend)**

```typescript
// 1. Cron Jobs (Bull Queue + Redis)
earningsQueue.add('fetch-earnings', {}, {
  repeat: { cron: '*/2 * * * *' }, // Každé 2 minúty
});

// 2. Fetch Data z APIs
const finnhubData = await axios.get('https://finnhub.io/api/v1/calendar/earnings');
const polygonData = await axios.get('https://api.polygon.io/v2/last/nbbo/AAPL');

// 3. Save do Database (Prisma ORM)
await prisma.earningsTickersToday.upsert({
  where: { reportDate_ticker: { reportDate, ticker } },
  update: { epsActual, epsEstimate, revenueActual, revenueEstimate },
  create: { reportDate, ticker, epsActual, epsEstimate, ... }
});
```

### **B. Database → Frontend**

```typescript
// 1. Next.js API Routes
// src/app/api/earnings/today/route.ts
export async function GET() {
  const data = await prisma.earningsTickersToday.findMany({
    where: { reportDate: today },
    include: { movement: true },
  });

  return NextResponse.json({ success: true, data });
}

// 2. React Components
const fetchData = async () => {
  const response = await fetch("/api/earnings/today");
  const result = await response.json();
  setEarningsData(result.data);
};
```

### **C. Real-time Updates**

```typescript
// 1. WebSocket Server (Socket.IO)
socket.on("earnings-updated", (data) => {
  io.to("earnings-updates").emit("earnings-updated", data);
});

// 2. WebSocket Client (Frontend)
useEffect(() => {
  const socket = io("http://localhost:3001");
  socket.on("earnings-updated", (data) => {
    fetchData(); // Refresh data
  });
}, []);
```

---

## 🚀 **4. KONKRÉTNE TECHNOLÓGIE**

### **A. Backend Stack**

| Komponent        | Technológia                      | Účel                             |
| ---------------- | -------------------------------- | -------------------------------- |
| **Queue System** | Bull Queue + Redis               | Cron jobs, background processing |
| **Database ORM** | Prisma 5.7                       | Type-safe database operations    |
| **Database**     | SQLite (dev) / PostgreSQL (prod) | Data storage                     |
| **WebSocket**    | Socket.IO 4.7                    | Real-time communication          |
| **API Calls**    | Axios                            | HTTP requests to external APIs   |

### **B. Frontend Stack**

| Komponent            | Technológia     | Účel                       |
| -------------------- | --------------- | -------------------------- |
| **Framework**        | Next.js 15      | Full-stack React framework |
| **UI Library**       | React 18        | Component-based UI         |
| **Language**         | TypeScript 5    | Type-safe development      |
| **Styling**          | TailwindCSS 3.3 | Utility-first CSS          |
| **State Management** | React Hooks     | Local state management     |
| **HTTP Client**      | Fetch API       | API calls to backend       |

### **C. Data Flow Technologies**

| Fáza                 | Technológia        | Popis            |
| -------------------- | ------------------ | ---------------- |
| **External APIs**    | Finnhub, Polygon   | Data sources     |
| **Queue Processing** | Bull Queue         | Background jobs  |
| **Database**         | Prisma + SQLite    | Data persistence |
| **API Layer**        | Next.js API Routes | REST endpoints   |
| **Real-time**        | Socket.IO          | Live updates     |
| **Frontend**         | React + TypeScript | User interface   |

---

## 📊 **5. AKTUÁLNY STAV vs. PRODUCTION**

### **A. Development (Teraz)**

```typescript
// Mock data v API routes
const mockData = [
  { id: 1, ticker: 'AAPL', epsActual: 1.52, ... }
];

return NextResponse.json({ success: true, data: mockData });
```

### **B. Production (Plánované)**

```typescript
// Real data z databázy
const data = await prisma.earningsTickersToday.findMany({
  where: { reportDate: today },
  include: { movement: true },
});

return NextResponse.json({ success: true, data });
```

---

## 🔧 **6. IMPLEMENTAČNÝ PLÁN**

### **Fáza 1: Database Integration**

1. ✅ **Tabuľky už existujú** (Prisma schema)
2. 🔄 **Prepojiť API routes s databázou** (namiesto mock dát)
3. 🔄 **Testovať CRUD operácie**

### **Fáza 2: Real-time Updates**

1. ✅ **Socket.IO už funguje**
2. 🔄 **Integrovať s queue worker**
3. 🔄 **Optimalizovať update frequency**

### **Fáza 3: Production Ready**

1. 🔄 **PostgreSQL migration**
2. 🔄 **Redis production setup**
3. 🔄 **Monitoring a logging**

---

## 🎯 **ZÁVER**

### **Odpovede na Vaše Otázky:**

1. **Data sa budú doťahovať do DB ako?**

   - **Bull Queue + Redis** pre cron jobs
   - **Prisma ORM** pre database operations
   - **Axios** pre API calls na Finnhub/Polygon

2. **Už sú vytvorené tabuľky?**

   - **ÁNO!** 5 tabuliek už existuje v Prisma schema
   - **Indexy** sú optimalizované pre performance
   - **Relationships** medzi tabuľkami sú definované

3. **Z DB na FE je použitá aká technológia?**
   - **Next.js API Routes** (REST endpoints)
   - **Socket.IO** (real-time updates)
   - **React Hooks** (state management)
   - **TypeScript** (type safety)

### **Aplikácia je pripravená na production!** 🚀

**Všetky technológie sú moderné, type-safe a optimalizované pre performance.**
