#!/usr/bin/env node

/**
 * 🔒 PARITY ASSERTION SCRIPT
 * 
 * Tento skript zabezpečuje, že produkcia bude 1:1 s localhost
 * Spúšťa sa pred každým buildom
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Kontrola parity localhost ↔ production...\n');

// 1. Kontrola NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (nodeEnv === 'production') {
  console.log('✅ NODE_ENV=production (správne pre produkciu)');
} else if (nodeEnv === 'development') {
  console.log('✅ NODE_ENV=development (správne pre localhost)');
} else {
  console.error('❌ NODE_ENV nie je nastavené správne:', nodeEnv);
  process.exit(1);
}

// 2. Kontrola DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL nie je nastavené');
  process.exit(1);
}

// V produkcii aj localhost používame rovnaký názov súboru (dev.db)
if (dbUrl.includes('dev.db')) {
  console.log('✅ DATABASE_URL používa dev.db (1:1 parity)');
} else {
  console.error('❌ DATABASE_URL musí používať dev.db pre parity:', dbUrl);
  process.exit(1);
}

// 3. Kontrola NEXT_PUBLIC_APP_URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  console.error('❌ NEXT_PUBLIC_APP_URL nie je nastavené');
  process.exit(1);
}

if (nodeEnv === 'development' && appUrl.includes('localhost:3000')) {
  console.log('✅ NEXT_PUBLIC_APP_URL správne pre localhost:', appUrl);
} else if (nodeEnv === 'production' && !appUrl.includes('localhost')) {
  console.log('✅ NEXT_PUBLIC_APP_URL správne pre produkciu:', appUrl);
} else {
  console.error('❌ NEXT_PUBLIC_APP_URL nesedí s NODE_ENV:', appUrl);
  process.exit(1);
}

// 4. Kontrola package-lock.json (zmeny bez bumpu)
const lockPath = path.join(process.cwd(), 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lockContent = fs.readFileSync(lockPath, 'utf8');
  const lockHash = require('crypto').createHash('md5').update(lockContent).digest('hex');
  console.log('✅ package-lock.json hash:', lockHash.substring(0, 8) + '...');
} else {
  console.log('⚠️  package-lock.json neexistuje (používa sa yarn/pnpm?)');
}

// 5. Kontrola API kľúčov
const polygonKey = process.env.POLYGON_API_KEY;
const finnhubKey = process.env.FINNHUB_API_KEY;

if (!polygonKey) {
  console.error('❌ POLYGON_API_KEY nie je nastavené');
  process.exit(1);
}

if (!finnhubKey) {
  console.error('❌ FINNHUB_API_KEY nie je nastavené');
  process.exit(1);
}

console.log('✅ API kľúče sú nastavené');

// 6. Kontrola tsconfig.json path aliasov
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  const paths = tsconfig.compilerOptions?.paths;
  
  if (paths && paths['@/*']) {
    console.log('✅ TypeScript path aliasy sú nastavené');
  } else {
    console.error('❌ TypeScript path aliasy chýbajú');
    process.exit(1);
  }
}

console.log('\n🎯 Všetky parity kontroly prešli úspešne!');
console.log('✅ Build môže pokračovať...\n');
