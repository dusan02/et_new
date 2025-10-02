#!/usr/bin/env node

/**
 * 🔍 API SHAPE COMPARISON SCRIPT
 * 
 * Porovnáva štruktúru API response s lokálnym snapshotom
 * Zabezpečuje, že produkcia vracia rovnaký formát dát
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Konfigurácia
const SNAPSHOTS_DIR = path.join(__dirname, '..', 'snapshots');
const API_ENDPOINTS = [
  { name: 'earnings', url: '/api/earnings' },
  { name: 'earnings-stats', url: '/api/earnings/stats' }
];

/**
 * Získa hash zo zoradených kľúčov objektu
 */
function getKeysHash(obj) {
  const keys = Object.keys(obj).sort();
  return require('crypto').createHash('md5').update(keys.join(',')).digest('hex');
}

/**
 * Rekurzívne získa všetky kľúče z objektu
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      keys = keys.concat(getAllKeys(item, `${prefix}[${index}]`));
    });
  } else if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    });
  }
  
  return keys;
}

/**
 * Porovná dva objekty na základe ich štruktúry
 */
function compareShapes(obj1, obj2, path = '') {
  const errors = [];
  
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length > 0 && obj2.length > 0) {
      const shape1 = getAllKeys(obj1[0]).sort();
      const shape2 = getAllKeys(obj2[0]).sort();
      
      if (JSON.stringify(shape1) !== JSON.stringify(shape2)) {
        errors.push(`Array shapes differ at ${path}: ${shape1.join(', ')} vs ${shape2.join(', ')}`);
      }
    }
  } else if (obj1 && typeof obj1 === 'object' && obj2 && typeof obj2 === 'object') {
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    
    if (JSON.stringify(keys1) !== JSON.stringify(keys2)) {
      errors.push(`Object keys differ at ${path}: ${keys1.join(', ')} vs ${keys2.join(', ')}`);
    }
    
    // Rekurzívne porovnaj vnútorné objekty
    keys1.forEach(key => {
      if (keys2.includes(key)) {
        errors.push(...compareShapes(obj1[key], obj2[key], path ? `${path}.${key}` : key));
      }
    });
  }
  
  return errors;
}

/**
 * Vytvor snapshot z lokálneho API
 */
async function createSnapshot(baseUrl, endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}${endpoint.url}`;
    const client = url.startsWith('https') ? https : http;
    
    console.log(`📸 Vytváram snapshot pre ${endpoint.name} z ${url}`);
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${error.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Porovnaj snapshot s produkčným API
 */
async function compareWithProduction(snapshot, endpoint, prodUrl) {
  try {
    const prodData = await createSnapshot(prodUrl, endpoint);
    const errors = compareShapes(snapshot, prodData);
    
    if (errors.length === 0) {
      console.log(`✅ ${endpoint.name}: Shape match`);
      return true;
    } else {
      console.log(`❌ ${endpoint.name}: Shape mismatch:`);
      errors.forEach(error => console.log(`   ${error}`));
      return false;
    }
  } catch (error) {
    console.log(`❌ ${endpoint.name}: Error comparing - ${error.message}`);
    return false;
  }
}

/**
 * Hlavná funkcia
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'create') {
    // Vytvor snapshots z localhost
    const localhostUrl = 'http://localhost:3000';
    
    console.log('📸 Vytváram snapshots z localhost...\n');
    
    // Vytvor adresár pre snapshots
    if (!fs.existsSync(SNAPSHOTS_DIR)) {
      fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    }
    
    for (const endpoint of API_ENDPOINTS) {
      try {
        const data = await createSnapshot(localhostUrl, endpoint);
        const snapshotPath = path.join(SNAPSHOTS_DIR, `${endpoint.name}.json`);
        
        fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2));
        console.log(`✅ Snapshot uložený: ${snapshotPath}`);
      } catch (error) {
        console.log(`❌ Chyba pri vytváraní snapshotu pre ${endpoint.name}: ${error.message}`);
      }
    }
    
  } else if (command === 'compare') {
    // Porovnaj s produkciou
    const prodUrl = args[1] || 'https://your-domain.com';
    
    console.log(`🔍 Porovnávam snapshots s produkciou (${prodUrl})...\n`);
    
    let allMatch = true;
    
    for (const endpoint of API_ENDPOINTS) {
      const snapshotPath = path.join(SNAPSHOTS_DIR, `${endpoint.name}.json`);
      
      if (!fs.existsSync(snapshotPath)) {
        console.log(`❌ Snapshot neexistuje: ${snapshotPath}`);
        allMatch = false;
        continue;
      }
      
      try {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        const match = await compareWithProduction(snapshot, endpoint, prodUrl);
        if (!match) allMatch = false;
      } catch (error) {
        console.log(`❌ Chyba pri načítaní snapshotu pre ${endpoint.name}: ${error.message}`);
        allMatch = false;
      }
    }
    
    if (allMatch) {
      console.log('\n🎯 Všetky API shapes sa zhodujú!');
      process.exit(0);
    } else {
      console.log('\n❌ Nájdené rozdiely v API shapes!');
      process.exit(1);
    }
    
  } else {
    console.log('Použitie:');
    console.log('  node scripts/shape-compare.js create                    # Vytvor snapshots z localhost');
    console.log('  node scripts/shape-compare.js compare [production-url]  # Porovnaj s produkciou');
    process.exit(1);
  }
}

// Spusti hlavnú funkciu
main().catch(error => {
  console.error('❌ Chyba:', error.message);
  process.exit(1);
});
