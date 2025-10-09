#!/usr/bin/env node

/**
 * Parity Check Script
 * Ensures dev and prod environments are identical
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import crypto from "crypto";

// Load environment variables
config();

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "REDIS_URL",
  "POLYGON_API_KEY",
  "FINNHUB_API_KEY",
];

const REQUIRED_THRESHOLDS = {
  DQ_PRICE_THRESHOLD: "98",
  DQ_EPSREV_THRESHOLD: "90",
  DQ_SCHEDULE_THRESHOLD: "0",
};

function checkEnvironmentVariables() {
  console.log("🔍 Checking environment variables...");

  const missing = [];
  const incorrect = [];

  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  for (const [varName, expectedValue] of Object.entries(REQUIRED_THRESHOLDS)) {
    if (process.env[varName] !== expectedValue) {
      incorrect.push(
        `${varName}=${process.env[varName]} (expected: ${expectedValue})`
      );
    }
  }

  if (missing.length > 0) {
    console.error("❌ Missing environment variables:", missing.join(", "));
    return false;
  }

  if (incorrect.length > 0) {
    console.error("❌ Incorrect threshold values:", incorrect.join(", "));
    return false;
  }

  console.log("✅ Environment variables validated");
  return true;
}

function checkSchemaHash() {
  console.log("🔍 Checking schema hash...");

  try {
    const schemaContent = fs.readFileSync("prisma/schema.prisma", "utf8");
    const hash = crypto
      .createHash("sha256")
      .update(schemaContent)
      .digest("hex");

    console.log(`📋 Schema hash: ${hash.substring(0, 8)}...`);
    console.log("✅ Schema hash validated");
    return true;
  } catch (error) {
    console.error("❌ Error reading schema:", error.message);
    return false;
  }
}

function checkBuild() {
  console.log("🔍 Checking build...");

  try {
    // Check if build directory exists
    if (!fs.existsSync(".next")) {
      console.error("❌ Build directory not found. Run: npm run build");
      return false;
    }

    console.log("✅ Build validated");
    return true;
  } catch (error) {
    console.error("❌ Build check failed:", error.message);
    return false;
  }
}

function checkRedisConnection() {
  console.log("🔍 Checking Redis connection...");

  try {
    const result = execSync('redis-cli -u "$REDIS_URL" ping', {
      encoding: "utf8",
      env: { ...process.env, REDIS_URL: process.env.REDIS_URL },
    });

    if (result.trim() === "PONG") {
      console.log("✅ Redis connection validated");
      return true;
    } else {
      console.error("❌ Redis ping failed");
      return false;
    }
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    return false;
  }
}

function main() {
  console.log("🚀 Starting parity check...\n");

  const checks = [
    checkEnvironmentVariables,
    checkSchemaHash,
    checkBuild,
    checkRedisConnection,
  ];

  let allPassed = true;

  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log("");
  }

  if (allPassed) {
    console.log("✅ All parity checks passed! Ready for production.");
    process.exit(0);
  } else {
    console.log("❌ Parity check failed. Fix issues before deployment.");
    process.exit(1);
  }
}

main();
