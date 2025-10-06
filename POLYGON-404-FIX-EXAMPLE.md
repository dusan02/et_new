# Polygon 404 Fix - Ultra-short Example

## Problém

Log spam: `Failed to fetch shares outstanding for ACCD: AxiosError: Request failed with status code 404`

## Riešenie (krátky patch)

### Nájdi Polygon API klienta

```bash
grep -r "api.polygon.io" src/ --include="*.ts" -l
```

### Pridaj 404 guard

**Pred:**

```typescript
const response = await axios.get(
  `https://api.polygon.io/v3/reference/tickers/${ticker}`,
  {
    params: { apikey: POLYGON_API_KEY },
  }
);
return response.data;
```

**Po:**

```typescript
try {
  const response = await axios.get(
    `https://api.polygon.io/v3/reference/tickers/${ticker}`,
    {
      params: { apikey: POLYGON_API_KEY },
    }
  );
  return response.data;
} catch (err) {
  if (err?.response?.status === 404) {
    console.warn(`[polygon] 404 ${ticker} - ticker not found, using fallback`);
    return null; // or fallback value
  }
  throw err; // re-throw other errors
}
```

### Alternatíva: Fallback query endpoint

```typescript
async function getPolygonTickerSafe(ticker: string, apiKey: string) {
  const base = "https://api.polygon.io";

  // 1) Try exact ticker endpoint
  try {
    const r = await axios.get(`${base}/v3/reference/tickers/${ticker}`, {
      params: { apikey: apiKey },
    });
    return r.data;
  } catch (err) {
    if (err?.response?.status !== 404) throw err;
  }

  // 2) Fallback: search endpoint
  try {
    const r = await axios.get(`${base}/v3/reference/tickers`, {
      params: {
        ticker: ticker,
        active: true,
        market: "stocks",
        apikey: apiKey,
      },
    });
    return r.data?.results?.[0] || null;
  } catch {
    console.warn(`[polygon] ${ticker} not found in search either`);
    return null;
  }
}
```

## Integrácia do fetch-today.ts

Nájdi volanie Polygon API a wrap-ni ho:

```typescript
// Namiesto priameho volania:
const polygonData = await getTickerInfo(ticker);

// Použi safe wrapper:
const polygonData = await getPolygonTickerSafe(ticker, POLYGON_API_KEY);
if (!polygonData) {
  // Use Finnhub or default values
  console.log(`Using Finnhub fallback for ${ticker}`);
}
```

---

**Benefit:** Logy ostanú čisté, fetch pokračuje aj pri 404.
