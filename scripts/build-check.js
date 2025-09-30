#!/usr/bin/env node

// Pre-build validation script
const fs = require("fs");
const path = require("path");

console.log("🔍 Running pre-build validation...");

const errors = [];
const warnings = [];

// Check environment variables
function checkEnvFile() {
  const envFiles = [".env", ".env.local", ".env.production"];

  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, "utf8");

      // Check for required variables
      const requiredVars = ["FINNHUB_API_KEY", "POLYGON_API_KEY"];

      for (const varName of requiredVars) {
        if (!content.includes(varName) || content.includes(`${varName}="your_`)) {
          warnings.push(
            `Environment variable ${varName} might not be set in ${envFile}`
          );
        }
      }
    }
  }
}

// Check for common issues
function checkCommonIssues() {
  // Check if Prisma schema exists
  if (!fs.existsSync("prisma/schema.prisma")) {
    errors.push("Prisma schema not found");
  }

  // Check if package.json exists
  if (!fs.existsSync("package.json")) {
    errors.push("package.json not found");
  }

  // Check for TypeScript errors (basic check)
  const tsConfigExists = fs.existsSync("tsconfig.json");
  if (!tsConfigExists) {
    warnings.push(
      "tsconfig.json not found - TypeScript compilation might fail"
    );
  }
}

// Check database connection
async function checkDatabase() {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();

    await prisma.$connect();
    console.log("✅ Database connection OK");
    await prisma.$disconnect();
  } catch (error) {
    warnings.push(`Database connection failed: ${error.message}`);
  }
}

// Main validation
async function main() {
  checkEnvFile();
  checkCommonIssues();
  await checkDatabase();

  // Report results
  if (errors.length > 0) {
    console.log("\n❌ Build validation failed:");
    errors.forEach((error) => console.log(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  console.log("\n✅ Pre-build validation passed!");
}

main().catch(console.error);
