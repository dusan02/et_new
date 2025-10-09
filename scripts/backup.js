#!/usr/bin/env node

/**
 * Backup Script
 * Creates database and Redis backups for production
 */

import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Load environment variables
config();

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || "7");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📁 Created backup directory: ${BACKUP_DIR}`);
  }
}

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
}

function backupDatabase() {
  console.log("🗄️  Backing up database...");

  const timestamp = getTimestamp();
  const dbBackupFile = path.join(BACKUP_DIR, `database-${timestamp}.sql`);

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error("DATABASE_URL not set");
    }

    // Extract connection details from DATABASE_URL
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || 5432;
    const database = url.pathname.slice(1);
    const username = url.username;
    const password = url.password;

    // Create pg_dump command
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} > "${dbBackupFile}"`;

    execSync(command, { stdio: "inherit" });

    const stats = fs.statSync(dbBackupFile);
    console.log(
      `✅ Database backup created: ${dbBackupFile} (${Math.round(
        stats.size / 1024
      )} KB)`
    );

    return dbBackupFile;
  } catch (error) {
    console.error("❌ Database backup failed:", error.message);
    return null;
  }
}

function backupRedis() {
  console.log("🔴 Backing up Redis...");

  const timestamp = getTimestamp();
  const redisBackupFile = path.join(BACKUP_DIR, `redis-${timestamp}.rdb`);

  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    // Get Redis data directory
    const redisDataDir = process.env.REDIS_DATA_DIR || "/var/lib/redis";

    // Copy RDB file if it exists
    const rdbSource = path.join(redisDataDir, "dump.rdb");
    if (fs.existsSync(rdbSource)) {
      fs.copyFileSync(rdbSource, redisBackupFile);

      const stats = fs.statSync(redisBackupFile);
      console.log(
        `✅ Redis backup created: ${redisBackupFile} (${Math.round(
          stats.size / 1024
        )} KB)`
      );

      return redisBackupFile;
    } else {
      console.log("⚠️  Redis RDB file not found, skipping Redis backup");
      return null;
    }
  } catch (error) {
    console.error("❌ Redis backup failed:", error.message);
    return null;
  }
}

function cleanupOldBackups() {
  console.log("🧹 Cleaning up old backups...");

  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`🗑️  Deleted old backup: ${file}`);
      }
    }

    console.log(`✅ Cleaned up ${deletedCount} old backup files`);
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
  }
}

function testBackup(backupFile) {
  if (!backupFile || !fs.existsSync(backupFile)) {
    return false;
  }

  console.log("🧪 Testing backup integrity...");

  try {
    // For database backups, check if file contains SQL
    if (backupFile.endsWith(".sql")) {
      const content = fs.readFileSync(backupFile, "utf8");
      if (
        content.includes("PostgreSQL database dump") ||
        content.includes("CREATE TABLE")
      ) {
        console.log("✅ Database backup integrity verified");
        return true;
      }
    }

    // For Redis backups, check if file exists and has content
    if (backupFile.endsWith(".rdb")) {
      const stats = fs.statSync(backupFile);
      if (stats.size > 0) {
        console.log("✅ Redis backup integrity verified");
        return true;
      }
    }

    console.log("❌ Backup integrity check failed");
    return false;
  } catch (error) {
    console.error("❌ Backup test failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("💾 Starting backup process...\n");

  ensureBackupDir();

  const dbBackup = backupDatabase();
  const redisBackup = backupRedis();

  // Test backups
  if (dbBackup) {
    testBackup(dbBackup);
  }
  if (redisBackup) {
    testBackup(redisBackup);
  }

  cleanupOldBackups();

  console.log("\n✅ Backup process completed");
  console.log(`📁 Backup directory: ${BACKUP_DIR}`);
  console.log(`📅 Retention: ${RETENTION_DAYS} days`);

  // List current backups
  const files = fs.readdirSync(BACKUP_DIR);
  console.log(`📊 Total backup files: ${files.length}`);
}

main().catch((error) => {
  console.error("❌ Backup process failed:", error);
  process.exit(1);
});
