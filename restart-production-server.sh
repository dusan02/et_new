#!/bin/bash

# Rýchly reštart produkčného servera pre earningstable.com
# Spustiť na serveri: bash restart-production-server.sh

echo "🔄 Reštartujem produkčný server pre earningstable.com"
echo "=================================================="
echo "Server: root@89.185.250.213"
echo "Dátum: $(date)"
echo ""

# Farby pre výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Krok 1: Zastaviť všetky procesy
print_status "Krok 1: Zastavujem všetky procesy..."
pkill -f "next" 2>/dev/null && print_success "Zastavené Next.js procesy" || print_warning "Žiadne Next.js procesy na zastavenie"
pkill -f "node.*earnings" 2>/dev/null && print_success "Zastavené earnings procesy" || print_warning "Žiadne earnings procesy na zastavenie"

# Zastaviť systemd služby
for service in "earnings-table" "earnings-app" "earnings-https"; do
    if systemctl is-active --quiet "$service" 2>/dev/null; then
        print_status "Zastavujem systemd službu: $service"
        systemctl stop "$service"
        print_success "Zastavené $service"
    fi
done

# Krok 2: Reštartovať Nginx
print_status "Krok 2: Reštartujem Nginx..."
systemctl restart nginx
if [ $? -eq 0 ]; then
    print_success "Nginx reštartovaný"
else
    print_error "Chyba pri reštarte Nginx"
    systemctl status nginx --no-pager
    exit 1
fi

# Krok 3: Nájsť a spustiť aplikáciu
print_status "Krok 3: Hľadám aplikáciu..."
APP_DIRS=("/var/www/earnings-table" "/var/www/earnings-table-https" "/opt/earnings-table" "/home/earnings" "/root/earnings-table")

for dir in "${APP_DIRS[@]}"; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        print_success "Našiel som aplikáciu v: $dir"
        cd "$dir"
        break
    fi
done

if [ ! -f "package.json" ]; then
    print_error "Nenašiel som aplikáciu v žiadnom očakávanom adresári"
    exit 1
fi

# Krok 4: Spustiť aplikáciu
print_status "Krok 4: Spúšťam aplikáciu..."
NODE_ENV=production nohup npm start > app.log 2>&1 &
APP_PID=$!
print_success "Aplikácia spustená s PID: $APP_PID"

# Krok 5: Počkať a otestovať
print_status "Krok 5: Čakám na spustenie aplikácie..."
sleep 15

# Test aplikácie
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Aplikácia funguje na porte 3000!"
else
    print_error "Aplikácia nereaguje na porte 3000"
    print_status "Logy aplikácie:"
    tail -n 10 app.log 2>/dev/null || echo "Žiadne logy"
    exit 1
fi

# Krok 6: Test HTTP prístupu
print_status "Krok 6: Testujem HTTP prístup..."
if curl -f http://89.185.250.213 > /dev/null 2>&1; then
    print_success "Server reaguje na HTTP (IP)"
else
    print_warning "Server nereaguje na HTTP (IP)"
fi

# Test s doménovým headerom
if curl -f -H "Host: earningstable.com" http://localhost > /dev/null 2>&1; then
    print_success "Doménové smerovanie funguje lokálne"
else
    print_warning "Doménové smerovanie nefunguje lokálne"
fi

# Krok 7: Finálny stav
print_status "Krok 7: Finálny stav..."
echo ""
echo "🔍 Stav procesov:"
ps aux | grep -E "(node|next)" | grep -v grep || echo "Žiadne procesy"

echo ""
echo "🌐 Stav portov:"
netstat -tlnp | grep -E ":(80|443|3000)" || echo "Žiadne relevantné porty"

echo ""
echo "📋 Posledné logy aplikácie:"
tail -n 5 app.log 2>/dev/null || echo "Žiadne logy"

echo ""
print_success "🎉 Reštart dokončený!"
echo ""
print_status "🌐 Testovacie URL:"
echo "   HTTP:  http://89.185.250.213"
echo "   HTTP:  http://earningstable.com"
echo "   HTTPS: https://earningstable.com"
echo ""
print_status "📊 Monitorovacie príkazy:"
echo "   # Logy aplikácie"
echo "   tail -f app.log"
echo ""
echo "   # Nginx logy"
echo "   sudo tail -f /var/log/nginx/error.log"
echo ""
echo "   # Stav procesov"
echo "   ps aux | grep node"
echo ""
print_status "🔧 Ak problémy pretrvávajú:"
echo "   1. Skontrolujte DNS: nslookup earningstable.com"
echo "   2. Skontrolujte SSL: sudo certbot certificates"
echo "   3. Spustite kompletný fix: bash fix-production-502-error.sh"
