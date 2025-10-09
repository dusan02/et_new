#!/usr/bin/env node

/**
 * PM2 Runbook Script
 * Common PM2 operations for production management
 */

import { execSync } from "child_process";

const COMMANDS = {
  status: "pm2 status",
  logs: "pm2 logs --lines 200",
  restartWorkers: "pm2 restart earnings-watchdog earnings-scheduler",
  reloadWeb: "pm2 reload earnings-table-web",
  restartAll: "pm2 restart all",
  stopAll: "pm2 stop all",
  startAll: "pm2 start ecosystem.production.config.js",
  save: "pm2 save",
  delete: "pm2 delete all",
};

function runCommand(command, description) {
  try {
    console.log(`🔧 ${description}...`);
    const output = execSync(command, { encoding: "utf8" });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function showUsage() {
  console.log(`
🚀 PM2 Runbook - Production Management

Usage: node scripts/pm2-runbook.js <command>

Commands:
  status          - Show PM2 process status
  logs            - Show recent logs (200 lines)
  restart-workers - Restart only watchdog and scheduler
  reload-web      - Reload web app without downtime
  restart-all     - Restart all processes
  stop-all        - Stop all processes
  start-all       - Start all processes from config
  save            - Save current PM2 configuration
  delete          - Delete all processes (cleanup)

Examples:
  node scripts/pm2-runbook.js status
  node scripts/pm2-runbook.js logs
  node scripts/pm2-runbook.js restart-workers
`);
}

function main() {
  const command = process.argv[2];

  if (!command || !COMMANDS[command]) {
    showUsage();
    process.exit(1);
  }

  console.log("🔧 PM2 Runbook - Production Management\n");

  const success = runCommand(COMMANDS[command], `Running ${command}`);

  if (success) {
    console.log(`✅ ${command} completed successfully`);
  } else {
    console.log(`❌ ${command} failed`);
    process.exit(1);
  }
}

main();
