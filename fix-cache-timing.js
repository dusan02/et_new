#!/usr/bin/env node

/**
 * 🛠️ CACHE TIMING FIX
 * 
 * Problém: Cache sa maže PRED fetch, ale NEMAŽE sa PO fetch
 * Riešenie: Pridať cache clearing PO úspešnom fetch
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing cache timing issues...');

// 1. Fix worker-new.js - Add cache clearing after fetch
const workerPath = path.join(__dirname, 'src/queue/worker-new.js');
let workerContent = fs.readFileSync(workerPath, 'utf8');

// Add cache clearing after successful fetch
const cacheFix = `
// Helper function to clear cache after successful fetch
function clearCacheAfterFetch(description) {
  console.log(\`🧹 Running \${description}...\`);

  const child = spawn(
    "curl",
    ["-X", "POST", "http://localhost:3000/api/earnings/clear-cache"],
    {
      shell: true,
    }
  );

  child.stdout.on("data", (data) => {
    console.log(\`🧹 \${description} output: \${data}\`);
  });

  child.stderr.on("data", (data) => {
    console.error(\`❌ \${description} error: \${data}\`);
  });

  child.on("close", (code) => {
    console.log(\`✅ \${description} completed with code \${code}\`);
  });
}`;

// Insert the new function after clearApplicationCache function
const insertPoint = workerContent.indexOf('// Helper function to run fetch script with daily reset check');
workerContent = workerContent.slice(0, insertPoint) + cacheFix + '\n\n' + workerContent.slice(insertPoint);

// Update runOptimizedFetchWorkflow to clear cache after successful fetch
const optimizedFetchFix = `
function runOptimizedFetchWorkflow(description) {
  console.log(\`🔄 Running \${description}...\`);

  // Step 1: Fetch earnings data first
  const earningsScript = path.join(__dirname, "../jobs", "fetch-earnings-only.ts");
  const earningsChild = spawn("npx", ["tsx", earningsScript], {
    cwd: path.join(__dirname, "../.."),
    env: {
      ...process.env,
      FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      SKIP_RESET_CHECK: 'true' // Skip reset check for optimized workflow
    },
    shell: true,
  });

  earningsChild.stdout.on("data", (data) => {
    console.log(\`📊 \${description} (earnings) output: \${data}\`);
  });

  earningsChild.stderr.on("data", (data) => {
    console.error(\`❌ \${description} (earnings) error: \${data}\`);
  });

  earningsChild.on("close", (earningsCode) => {
    console.log(\`✅ \${description} (earnings) completed with code \${earningsCode}\`);
    
    if (earningsCode === 0) {
      // Step 2: If earnings fetch succeeded, fetch market data
      const marketScript = path.join(__dirname, "../jobs", "fill-missing-market-data.ts");
      const marketChild = spawn("npx", ["tsx", marketScript], {
        cwd: path.join(__dirname, "../.."),
        env: {
          ...process.env,
          POLYGON_API_KEY: process.env.POLYGON_API_KEY,
          DATABASE_URL: process.env.DATABASE_URL,
          SKIP_RESET_CHECK: 'true'
        },
        shell: true,
      });

      marketChild.stdout.on("data", (data) => {
        console.log(\`📈 \${description} (market) output: \${data}\`);
      });

      marketChild.stderr.on("data", (data) => {
        console.error(\`❌ \${description} (market) error: \${data}\`);
      });

      marketChild.on("close", (marketCode) => {
        console.log(\`✅ \${description} (market) completed with code \${marketCode}\`);
        
        // Step 3: Clear cache after successful fetch
        if (marketCode === 0) {
          clearCacheAfterFetch("Clear cache after successful fetch");
        } else {
          console.error(\`❌ \${description} (market) failed, skipping cache clear\`);
        }
      });
    } else {
      console.error(\`❌ \${description} (earnings) failed, skipping market data fetch\`);
    }
  });
}`;

// Replace the existing runOptimizedFetchWorkflow function
const startMarker = 'function runOptimizedFetchWorkflow(description) {';
const endMarker = '}';
const startIndex = workerContent.indexOf(startMarker);
const endIndex = workerContent.indexOf(endMarker, startIndex + startMarker.length);

if (startIndex !== -1 && endIndex !== -1) {
  workerContent = workerContent.slice(0, startIndex) + optimizedFetchFix + workerContent.slice(endIndex + 1);
}

fs.writeFileSync(workerPath, workerContent);
console.log('✅ Fixed worker-new.js cache timing');

// 2. Fix UnifiedDataFetcher - Add cache clearing after save
const fetcherPath = path.join(__dirname, 'src/modules/data-integration/services/unified-fetcher.service.ts');
let fetcherContent = fs.readFileSync(fetcherPath, 'utf8');

// Add cache clearing import
const cacheImport = `import { clearCacheByPattern } from '@/lib/cache-wrapper'`;
const importIndex = fetcherContent.indexOf('import { toReportDateUTC } from');
fetcherContent = fetcherContent.slice(0, importIndex) + cacheImport + '\n' + fetcherContent.slice(importIndex);

// Add cache clearing after successful save
const cacheClearAfterSave = `
        // 5. Clear cache after successful data save
        try {
          const clearedCount = await clearCacheByPattern('earnings-*');
          const marketClearedCount = await clearCacheByPattern('market-*');
          console.log(\`🧹 Cleared \${clearedCount + marketClearedCount} cache entries after data save\`);
        } catch (cacheError) {
          console.warn('⚠️ Cache clear after save failed:', cacheError);
        }`;

// Insert after market data save
const saveInsertPoint = fetcherContent.indexOf('console.log(`✅ Saved ${marketCount} market records (${marketResult.failed} failed)`)');
if (saveInsertPoint !== -1) {
  const insertAfter = fetcherContent.indexOf('\n', saveInsertPoint);
  fetcherContent = fetcherContent.slice(0, insertAfter) + cacheClearAfterSave + fetcherContent.slice(insertAfter);
}

fs.writeFileSync(fetcherPath, fetcherContent);
console.log('✅ Fixed UnifiedDataFetcher cache timing');

console.log('🎉 Cache timing fixes completed!');
console.log('');
console.log('📋 Changes made:');
console.log('1. ✅ Added clearCacheAfterFetch function to worker-new.js');
console.log('2. ✅ Updated runOptimizedFetchWorkflow to clear cache after successful fetch');
console.log('3. ✅ Added cache clearing to UnifiedDataFetcher after data save');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Deploy these changes to production');
console.log('2. Monitor cache clearing logs');
console.log('3. Verify cache is cleared after each successful fetch');
