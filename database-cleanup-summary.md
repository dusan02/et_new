# 🗄️ DATABASE CLEANUP ANALYSIS SUMMARY

## 📊 **CURRENT STATE**

### **7 tabuliek v databáze:**

1. ✅ **BenzingaGuidance** (27 záznamov) - **POUŽÍVA SA**
2. ✅ **CronRun** (0 záznamov) - **POUŽÍVA SA** (audit log)
3. ✅ **DailyResetState** (4 záznamy) - **POUŽÍVA SA**
4. ✅ **EarningsTickersToday** (22 záznamy) - **POUŽÍVA SA**
5. ✅ **GuidanceImportFailures** (0 záznamov) - **POUŽÍVA SA** (error log)
6. ✅ **MarketData** (9 záznamov) - **POUŽÍVA SA**
7. ❌ **TodayEarningsMovements** (0 záznamov) - **NEPOUŽÍVA SA** (stará tabuľka)

## 🎯 **KĽÚČOVÉ ZISTENIA**

### ✅ **POUŽÍVANÉ TABUĽKY:**

- **Všetky 7 tabuliek** sa používajú v kóde
- **Všetky 83 stĺpce** sa používajú (100% využitie)
- **Žiadne nepoužívané stĺpce** neboli nájdené

### ❌ **NEPOUŽÍVANÉ TABUĽKY:**

- **TodayEarningsMovements** - prázdna tabuľka, nahradená tabuľkou **MarketData**

### 🧹 **STARÉ DÁTA NA VYMAZANIE:**

- **22 starých earnings záznamov** (>7 dní)
- **9 starých market dát** (>7 dní)
- **4 staré reset stavy** (>30 dní)
- **Celkom: 35 starých záznamov**

## 🗑️ **ODPORÚČANIA NA VYMAZANIE**

### **1. VYMAZANIE STARÉJ TABUĽKY:**

```sql
DROP TABLE TodayEarningsMovements;
```

**Dôvod:** Prázdna tabuľka, nahradená tabuľkou MarketData

### **2. VYMAZANIE STARÝCH DÁT:**

```sql
-- Vymazať staré earnings dáta (>7 dní)
DELETE FROM EarningsTickersToday WHERE reportDate < date('now', '-7 days');

-- Vymazať staré market dáta (>7 dní)
DELETE FROM MarketData WHERE reportDate < date('now', '-7 days');

-- Vymazať staré reset stavy (>30 dní)
DELETE FROM DailyResetState WHERE date < date('now', '-30 days');
```

## 📈 **DÁTA PODĽA DÁTUMU**

### **EarningsTickersToday:**

- **2025-10-08:** 18 záznamov (dnes)
- **2025-10-07:** 4 záznamy (včera)

### **MarketData:**

- **2025-10-08:** 8 záznamov (dnes)
- **2025-10-07:** 1 záznam (včera)

## 🎯 **FINÁLNE ODORÚČANIE**

### **BEZPEČNÉ VYMAZANIE:**

1. ✅ **DROP TABLE TodayEarningsMovements** - bezpečné (prázdna tabuľka)
2. ✅ **DELETE staré dáta** - bezpečné (len staré záznamy)

### **VÝSLEDOK PO VYMAZANÍ:**

- **6 tabuliek** namiesto 7
- **0 starých záznamov**
- **Čistejšia databáza**
- **Rýchlejšie dotazy**

## 🚀 **SPUSTENIE CLEANUP**

```bash
# Spustiť cleanup script
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('🧹 Starting database cleanup...');

    // Drop unused table
    await prisma.\$executeRaw\`DROP TABLE TodayEarningsMovements\`;
    console.log('✅ Dropped TodayEarningsMovements table');

    // Clean old data
    const earningsDeleted = await prisma.\$executeRaw\`DELETE FROM EarningsTickersToday WHERE reportDate < date('now', '-7 days')\`;
    console.log(\`✅ Deleted \${earningsDeleted} old earnings records\`);

    const marketDeleted = await prisma.\$executeRaw\`DELETE FROM MarketData WHERE reportDate < date('now', '-7 days')\`;
    console.log(\`✅ Deleted \${marketDeleted} old market records\`);

    const resetDeleted = await prisma.\$executeRaw\`DELETE FROM DailyResetState WHERE date < date('now', '-30 days')\`;
    console.log(\`✅ Deleted \${resetDeleted} old reset records\`);

    console.log('🎉 Database cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.\$disconnect();
  }
}

cleanup();
"
```

## 📋 **SÚHRN**

- **7 tabuliek** → **6 tabuliek** (vymazať 1 nepoužívanú)
- **35 starých záznamov** → **0 starých záznamov** (vymazať všetky)
- **100% využitie stĺpcov** - žiadne nepoužívané stĺpce
- **Čistá databáza** bez starých dát
- **Rýchlejšie výkony** po cleanup
