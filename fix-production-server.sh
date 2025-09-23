#!/bin/bash

# Script na opravu produkčného servera
# Spustiť na serveri: bash fix-production-server.sh

echo "🔧 Opravujem produkčný server na 89.185.250.213:3000"
echo "=================================================="

# Prejsť do aplikačného adresára
cd /var/www/earnings-table

echo "📁 Aktuálny adresár: $(pwd)"
echo "📋 Obsah adresára:"
ls -la

# Zastaviť existujúce procesy
echo "🛑 Zastavujem existujúce procesy..."
pkill -f "next"
pkill -f "node.*earnings"

# Inštalovať závislosti
echo "📦 Inštalujem závislosti..."
npm ci --production

# Generovať Prisma client
echo "🗄️ Generujem Prisma client..."
npx prisma generate

# Buildnúť aplikáciu
echo "🏗️ Buildujem aplikáciu..."
npm run build

# Skontrolovať či existuje .next adresár
if [ -d ".next" ]; then
    echo "✅ .next adresár existuje"
    ls -la .next/
    
    if [ -f ".next/server/app/page.js" ]; then
        echo "✅ page.js súbor existuje"
    else
        echo "❌ page.js súbor neexistuje, rebuild zlyhal"
        exit 1
    fi
else
    echo "❌ .next adresár neexistuje, build zlyhal"
    exit 1
fi

# Spustiť aplikáciu
echo "🚀 Spúšťam aplikáciu..."
NODE_ENV=production nohup npm start > app.log 2>&1 &

# Počkať a otestovať
echo "⏳ Čakám na spustenie aplikácie..."
sleep 10

# Test aplikácie
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Aplikácia beží správne!"
    echo "🌐 Dostupná na: http://89.185.250.213:3000"
else
    echo "❌ Aplikácia nereaguje"
    echo "📋 Posledné logy:"
    tail -n 20 app.log
fi

echo "✅ Oprava dokončená!"
