#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { logger } from '../src/lib/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables
config();

/**
 * Daily automation script that runs the complete data pipeline
 */
async function runDailyAutomation(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting daily automation pipeline');

  try {
    // Step 1: Fetch today's earnings data
    logger.info('Step 1: Fetching earnings data');
    await runCommand('npm run fetch:data');
    
    // Step 2: Fetch market data with enhanced retry logic
    logger.info('Step 2: Fetching market data');
    await runCommand('npm run fetch:market:enhanced fetch');
    
    // Step 3: Publish database earnings data
    logger.info('Step 3: Publishing earnings data');
    await runCommand('npm run publish:database');
    
    // Step 4: Health check
    logger.info('Step 4: Running health check');
    await runCommand('npm run health:check');
    
    const duration = Date.now() - startTime;
    logger.info('Daily automation pipeline completed successfully', {
      duration: `${duration}ms`
    });
    
    console.log('✅ Daily automation pipeline completed successfully!');
    console.log(`⏱️ Total duration: ${(duration / 1000).toFixed(1)}s`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Daily automation pipeline failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    });
    
    console.error('❌ Daily automation pipeline failed:', error);
    process.exit(1);
  }
}

/**
 * Run a command and return the result
 */
async function runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  logger.info('Running command', { command });
  
  try {
    const result = await execAsync(command, { 
      timeout: 300000, // 5 minutes timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    logger.info('Command completed successfully', { 
      command,
      stdoutLength: result.stdout.length,
      stderrLength: result.stderr.length
    });
    
    return result;
  } catch (error) {
    logger.error('Command failed', {
      command,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Run health check and return status
 */
async function runHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  issues: string[];
}> {
  try {
    // Use direct curl command to avoid npm output
    const result = await runCommand('curl -s http://localhost:3000/api/health');
    
    // Extract JSON from curl output (remove any npm output)
    const jsonMatch = result.stdout.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new Error('No JSON found in health check response');
    }
    
    const healthData = JSON.parse(jsonMatch[0]);
    
    return {
      status: healthData.status,
      issues: healthData.services.marketData?.issues || []
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Send notification (placeholder for Slack webhook, email, etc.)
 */
async function sendNotification(
  status: 'success' | 'failure',
  message: string,
  details?: any
): Promise<void> {
  // In production, this would send to Slack, email, etc.
  logger.info('Notification sent', {
    status,
    message,
    details
  });
  
  if (status === 'failure') {
    console.error(`🚨 ALERT: ${message}`);
    if (details) {
      console.error('Details:', JSON.stringify(details, null, 2));
    }
  } else {
    console.log(`✅ SUCCESS: ${message}`);
  }
}

/**
 * Run with error handling and notifications
 */
async function runWithNotifications(): Promise<void> {
  try {
    await runDailyAutomation();
    await sendNotification('success', 'Daily automation pipeline completed successfully');
  } catch (error) {
    const healthStatus = await runHealthCheck();
    
    await sendNotification('failure', 'Daily automation pipeline failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      healthStatus
    });
    
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      runDailyAutomation();
      break;
    case 'health':
      runHealthCheck().then(status => {
        console.log('Health Status:', status);
        process.exit(status.status === 'healthy' ? 0 : 1);
      });
      break;
    case 'notify':
      runWithNotifications();
      break;
    default:
      console.log('Usage: npm run daily:automation [run|health|notify]');
      console.log('  run    - Run complete daily automation pipeline');
      console.log('  health - Check system health status');
      console.log('  notify - Run with notifications and error handling');
      process.exit(1);
  }
}

export { runDailyAutomation, runHealthCheck, runWithNotifications };
