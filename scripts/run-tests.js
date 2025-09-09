#!/usr/bin/env node

/**
 * 🧪 TEST RUNNER SCRIPT
 * Spúšťa všetky testy systematicky
 */

const { spawn } = require("child_process");
const path = require("path");

console.log("🧪 Starting Comprehensive Test Suite...");
console.log("=====================================");

const testSuites = [
  {
    name: "🕐 Cron Job Tests",
    file: "src/__tests__/cron.test.js",
    description: "Testing cron job startup and execution",
  },
  {
    name: "🌐 API Calls Tests",
    file: "src/__tests__/api-calls.test.js",
    description: "Testing Finnhub and Polygon API calls",
  },
  {
    name: "🗄️ Database Tests",
    file: "src/__tests__/database.test.js",
    description: "Testing database operations and data integrity",
  },
  {
    name: "🌐 API Endpoints Tests",
    file: "src/__tests__/api-endpoints.test.js",
    description: "Testing API endpoints and response formats",
  },
  {
    name: "🎨 Frontend Tests",
    file: "src/__tests__/frontend.test.js",
    description: "Testing frontend components and rendering",
  },
  {
    name: "🔄 Integration Tests",
    file: "src/__tests__/integration.test.js",
    description: "Testing complete data flow from cron to frontend",
  },
];

async function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    console.log(`\n📋 Running ${suite.name}...`);
    console.log(`   ${suite.description}`);
    console.log("   " + "─".repeat(50));

    const testProcess = spawn("npx", ["jest", suite.file, "--verbose"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
      },
    });

    testProcess.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ ${suite.name} - PASSED`);
        resolve(true);
      } else {
        console.log(`❌ ${suite.name} - FAILED (exit code: ${code})`);
        resolve(false);
      }
    });

    testProcess.on("error", (error) => {
      console.log(`❌ ${suite.name} - ERROR: ${error.message}`);
      resolve(false);
    });
  });
}

async function runAllTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const suite of testSuites) {
    const success = await runTestSuite(suite);
    results.push({ ...suite, success });

    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  // Summary
  console.log("\n📊 TEST SUMMARY");
  console.log("================");
  console.log(`Total Test Suites: ${testSuites.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(
    `Success Rate: ${((passed / testSuites.length) * 100).toFixed(1)}%`
  );

  if (failed > 0) {
    console.log("\n❌ FAILED TEST SUITES:");
    results
      .filter((r) => !r.success)
      .forEach((suite) => {
        console.log(`   - ${suite.name}`);
      });
  }

  console.log("\n🎯 RECOMMENDATIONS:");
  if (passed === testSuites.length) {
    console.log("   🎉 All tests passed! Your data flow is working perfectly.");
    console.log("   🚀 Ready for production deployment.");
  } else {
    console.log("   🔧 Fix failing tests before deployment.");
    console.log("   📝 Check test logs for detailed error information.");
    console.log("   🧪 Consider running individual test suites for debugging.");
  }

  return failed === 0;
}

// Run tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Test runner error:", error);
    process.exit(1);
  });
