import axios from "axios";

const POLY = process.env.POLYGON_API_KEY!;
const API = "https://api.polygon.io";

export type MarketStatus = {
  market: string;
  earlyHours?: boolean; // premarket
  afterHours?: boolean;
  exchanges?: { nasdaq?: string; nyse?: string; otc?: string };
};

export async function getMarketStatus(): Promise<MarketStatus | null> {
  try {
    const { data } = await axios.get(`${API}/v1/marketstatus/now`, {
      params: { apiKey: POLY },
      timeout: 10000
    });
    return data || null;
  } catch (error) {
    console.warn('Failed to fetch market status:', error);
    return null;
  }
}

export async function getLastTrade(ticker: string): Promise<{ price: number | null; ts: number | null }> {
  try {
    const { data } = await axios.get(`${API}/v2/last/trade/${ticker}`, {
      params: { apiKey: POLY },
      timeout: 10000
    });
    
    const p = data?.results?.p;
    const t = data?.results?.t;
    return (Number.isFinite(p) ? { price: Number(p), ts: Number(t) } : { price: null, ts: null });
  } catch (error) {
    console.warn(`Failed to fetch last trade for ${ticker}:`, error);
    return { price: null, ts: null };
  }
}

export async function getOpenClose(ticker: string, ymd: string): Promise<{
  preMarket: number | null; 
  afterHours: number | null; 
  open: number | null; 
  close: number | null;
}> {
  try {
    const { data } = await axios.get(`${API}/v1/open-close/${ticker}/${ymd}`, {
      params: { apiKey: POLY, adjusted: true },
      timeout: 10000
    });
    
    const getNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : null);
    return {
      preMarket: getNum(data?.preMarket),
      afterHours: getNum(data?.afterHours),
      open: getNum(data?.open),
      close: getNum(data?.close),
    };
  } catch (error) {
    console.warn(`Failed to fetch open-close for ${ticker}:`, error);
    return { preMarket: null, afterHours: null, open: null, close: null };
  }
}
