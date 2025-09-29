# 🚀 PRODUCTION DEPLOYMENT INSTRUCTIONS

## Deploy na http://89.185.250.213:3000/

### Krok 1: SSH pripojenie

```bash
ssh root@89.185.250.213
# Heslo: EJXTfBOG2t
```

### Krok 2: Deployment príkazy

Po prihlásení vykonajte postupne:

```bash
# Prejdite do projektového adresára
cd /var/www/earnings-table

# Skontrolujte aktuálny stav
git status

# Resetujte lokálne zmeny
git reset --hard HEAD
git clean -fd

# Stiahnite najnovšie zmeny z GitHub
git fetch origin
git reset --hard origin/main

# Skontrolujte že máte najnovšiu verziu (commit: 1097aa9)
git log --oneline -5

# Zastavte aplikáciu
docker-compose -f deployment/docker-compose.yml down

# Rebuildte aplikáciu s novým kódom
docker-compose -f deployment/docker-compose.yml build --no-cache app

# Spustite aplikáciu
docker-compose -f deployment/docker-compose.yml up -d

# Počkajte a skontrolujte status
sleep 30
docker-compose -f deployment/docker-compose.yml ps

# Testujte API
curl http://localhost:3000/api/earnings

# Skontrolujte logy (ak je problém)
docker-compose -f deployment/docker-compose.yml logs app
```

## Deploy na https://earningstable.com/

Rovnaký proces, ale pripojte sa na:

```bash
ssh root@earningstable.com
# Použite rovnaké heslo: EJXTfBOG2t
```

Potom vykonajte rovnaké príkazy ako vyššie.

## ✅ Očakávané výsledky:

- **Git log** by mal obsahovať commit: `1097aa9 Fix Polygon API endpoints for Starter plan`
- **Docker PS** by mal ukázať všetky containers "Up"
- **API test** by mal vrátiť status 200 s earnings dátami
- **Change hodnoty** by už nemali byť 0% - mali by zobrazovať skutočné percentá

## 🌐 Testovanie po deploymente:

1. Otvorte http://89.185.250.213:3000
2. Otvorte https://earningstable.com
3. Skontrolujte že Change column obsahuje skutočné percentá (nie 0%)
4. Skontrolujte že všetky earnings dáta sa zobrazujú správne

## 🆘 V prípade problémov:

```bash
# Skontrolujte logy
docker-compose -f deployment/docker-compose.yml logs app

# Reštartujte len app
docker-compose -f deployment/docker-compose.yml restart app

# Kompletný restart
docker-compose -f deployment/docker-compose.yml down
docker-compose -f deployment/docker-compose.yml up -d
```
