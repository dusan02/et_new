import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(data: any, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'pragma': 'no-cache',
      ...extraHeaders,
    }
  });
}

export async function GET() {
  const [maxUpdated] = await prisma.$queryRawUnsafe<{ ts: string }[]>(
    `SELECT strftime('%Y-%m-%dT%H:%M:%fZ', MAX(updatedAt)) as ts FROM MarketData;`
  );
  const rows = await prisma.$queryRawUnsafe<{ ticker: string; updatedAt: string }[]>(
    `SELECT ticker, updatedAt FROM MarketData ORDER BY updatedAt DESC LIMIT 10;`
  );

  const body = {
    routeId: 'market/last-updated@v1',
    dbMaxUpdatedAt: maxUpdated?.ts ?? null,
    sample: rows,
    now: new Date().toISOString(),
  };

  const hash = crypto.createHash('md5').update(JSON.stringify(rows)).digest('hex');
  return noStoreJson(body, { 'x-route-signature': 'market:last-updated', 'x-db-hash': hash });
}
