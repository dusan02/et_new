# 🔑 API Setup Instructions

## Potrebné API kľúče:

### 1. **Polygon.io** (Market Data)

- **Registrácia**: https://polygon.io/dashboard
- **Bezplatný tier**: 5 calls/minute, 1000 calls/day
- **Použitie**: Stock prices, market cap, shares outstanding

### 2. **Finnhub** (Earnings Data)

- **Registrácia**: https://finnhub.io/register
- **Bezplatný tier**: 60 calls/minute, 100 calls/day
- **Použitie**: Earnings calendar, company data

## Nastavenie .env.local súboru:

Vytvorte súbor `.env.local` v root priečinku s týmto obsahom:

```env
# Database
DATABASE_URL="file:./dev.db"

# API Keys
POLYGON_API_KEY="your_polygon_api_key_here"
FINNHUB_API_KEY="your_finnhub_api_key_here"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Rýchle testovanie bez API kľúčov:

Ak chcete najprv otestovať aplikáciu, môžeme použiť mock dáta bez API kľúčov.

## Ďalšie kroky:

1. Zaregistrujte sa na Polygon.io a Finnhub
2. Skopírujte API kľúče do .env.local
3. Reštartujte aplikáciu
4. Otestujte načítanie skutočných dát
