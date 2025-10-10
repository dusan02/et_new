#!/usr/bin/env node

/**
 * 🔍 PRODUCTION SANITY CHECK
 * Automatické overenie po deployi - 1:1 parita s localhost
 */

const http = require('http');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'blue') {
  console.log(`${colors[color]}[${new Date().toISOString()}]${colors.reset} ${message}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Make HTTP request
 */
function makeRequest(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Check PM2 status
 */
function checkPM2Status() {
  try {
    const output = execSync('pm2 status --no-color', { encoding: 'utf8' });
    const lines = output.split('\n');
    
    const processes = [];
    for (const line of lines) {
      if (line.includes('web') || line.includes('scheduler') || line.includes('watchdog')) {
        processes.push(line.trim());
      }
    }
    
    if (processes.length >= 3) {
      success(`PM2 processes running: ${processes.length}/3`);
      return true;
    } else {
      error(`PM2 processes: ${processes.length}/3 expected`);
      return false;
    }
  } catch (e) {
    error(`PM2 status check failed: ${e.message}`);
    return false;
  }
}

/**
 * Check Redis connection
 */
function checkRedis() {
  try {
    const output = execSync('docker compose exec -T redis redis-cli ping', { encoding: 'utf8' });
    if (output.trim() === 'PONG') {
      success('Redis is responding');
      return true;
    } else {
      error('Redis ping failed');
      return false;
    }
  } catch (e) {
    error(`Redis check failed: ${e.message}`);
    return false;
  }
}

/**
 * Check API endpoints
 */
async function checkAPIEndpoints() {
  const endpoints = [
    { url: 'http://localhost:3000/api/health', expectedStatus: 200, name: 'Health' },
    { url: 'http://localhost:3000/api/earnings/today', expectedStatus: 200, name: 'Earnings Today' },
    { url: 'http://localhost:3000/api/earnings/stats', expectedStatus: 200, name: 'Earnings Stats' }
  ];
  
  let allPassed = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.url);
      
      if (response.status === endpoint.expectedStatus) {
        success(`${endpoint.name} endpoint: ${response.status} OK`);
        
        // Additional checks for specific endpoints
        if (endpoint.name === 'Health' && response.data.status === 'healthy') {
          success('Health endpoint reports healthy status');
        } else if (endpoint.name === 'Health') {
          warning('Health endpoint status not "healthy"');
        }
        
        if (endpoint.name === 'Earnings Today' && response.data.data && response.data.data.length > 0) {
          success(`Earnings Today: ${response.data.data.length} items`);
        } else if (endpoint.name === 'Earnings Today') {
          warning('Earnings Today: No data (may be normal)');
        }
        
      } else {
        error(`${endpoint.name} endpoint: ${response.status} (expected ${endpoint.expectedStatus})`);
        allPassed = false;
      }
    } catch (e) {
      error(`${endpoint.name} endpoint failed: ${e.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Check database connection
 */
function checkDatabase() {
  try {
    const output = execSync('npx prisma db pull --print', { encoding: 'utf8' });
    if (output.includes('datasource db')) {
      success('Database connection OK');
      return true;
    } else {
      error('Database connection failed');
      return false;
    }
  } catch (e) {
    error(`Database check failed: ${e.message}`);
    return false;
  }
}

/**
 * Check environment variables
 */
function checkEnvironment() {
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'REDIS_URL',
    'POLYGON_API_KEY',
    'FINNHUB_API_KEY'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      success(`Environment variable ${varName}: SET`);
    } else {
      error(`Environment variable ${varName}: MISSING`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

/**
 * Main sanity check function
 */
async function runSanityCheck() {
  log('🔍 Starting Production Sanity Check...');
  
  const checks = [
    { name: 'Environment Variables', fn: checkEnvironment },
    { name: 'PM2 Status', fn: checkPM2Status },
    { name: 'Redis Connection', fn: checkRedis },
    { name: 'Database Connection', fn: checkDatabase },
    { name: 'API Endpoints', fn: checkAPIEndpoints }
  ];
  
  let passedChecks = 0;
  let totalChecks = checks.length;
  
  for (const check of checks) {
    log(`\n📋 Checking: ${check.name}`);
    try {
      const result = await check.fn();
      if (result) {
        passedChecks++;
      }
    } catch (e) {
      error(`Check ${check.name} failed with error: ${e.message}`);
    }
  }
  
  log(`\n📊 Sanity Check Summary:`);
  log(`Passed: ${passedChecks}/${totalChecks}`, passedChecks === totalChecks ? 'green' : 'yellow');
  
  if (passedChecks === totalChecks) {
    success('🎉 All sanity checks passed! Production is ready.');
    process.exit(0);
  } else {
    error(`❌ ${totalChecks - passedChecks} checks failed. Please review the issues above.`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSanityCheck().catch((e) => {
    error(`Sanity check failed: ${e.message}`);
    process.exit(1);
  });
}

module.exports = { runSanityCheck };
