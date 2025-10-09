/**
 * Rate Limiter for API Protection
 * Prevents excessive API calls and manages costs
 */

import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  retryAfterMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Default configurations for different API providers
    this.configs.set('polygon', {
      maxRequests: 100, // 100 requests per 5 minutes
      windowMs: 5 * 60 * 1000, // 5 minutes
      retryAfterMs: 60 * 1000 // 1 minute
    });

    this.configs.set('finnhub', {
      maxRequests: 60, // 60 requests per minute
      windowMs: 60 * 1000, // 1 minute
      retryAfterMs: 60 * 1000 // 1 minute
    });

    this.configs.set('iex', {
      maxRequests: 50, // 50 requests per second
      windowMs: 1000, // 1 second
      retryAfterMs: 1000 // 1 second
    });
  }

  /**
   * Check if request is allowed for given provider
   */
  isAllowed(provider: string): boolean {
    const config = this.configs.get(provider);
    if (!config) {
      logger.warn(`No rate limit config for provider: ${provider}`);
      return true; // Allow if no config
    }

    const now = Date.now();
    const key = `${provider}:${Math.floor(now / config.windowMs)}`;
    
    const entry = this.limits.get(key);
    
    if (!entry) {
      // First request in this window
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }

    if (entry.count >= config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${provider}`, {
        provider,
        count: entry.count,
        maxRequests: config.maxRequests,
        resetTime: new Date(entry.resetTime).toISOString()
      });
      return false;
    }

    // Increment counter
    entry.count++;
    return true;
  }

  /**
   * Get time until rate limit resets
   */
  getRetryAfter(provider: string): number {
    const config = this.configs.get(provider);
    if (!config) return 0;

    const now = Date.now();
    const key = `${provider}:${Math.floor(now / config.windowMs)}`;
    const entry = this.limits.get(key);

    if (!entry || entry.count < config.maxRequests) {
      return 0;
    }

    return Math.max(0, entry.resetTime - now);
  }

  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetTime < now) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Get current status for monitoring
   */
  getStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [provider, config] of this.configs.entries()) {
      const now = Date.now();
      const key = `${provider}:${Math.floor(now / config.windowMs)}`;
      const entry = this.limits.get(key);
      
      status[provider] = {
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        currentCount: entry?.count || 0,
        remaining: Math.max(0, config.maxRequests - (entry?.count || 0)),
        resetTime: entry?.resetTime ? new Date(entry.resetTime).toISOString() : null
      };
    }
    
    return status;
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Cleanup old entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

/**
 * Rate limit decorator for API calls
 */
export function withRateLimit(provider: string) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      if (!rateLimiter.isAllowed(provider)) {
        const retryAfter = rateLimiter.getRetryAfter(provider);
        throw new Error(`Rate limit exceeded for ${provider}. Retry after ${retryAfter}ms`);
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Exponential backoff for failed requests
 */
export class ExponentialBackoff {
  private attempts: Map<string, number> = new Map();

  async execute<T>(
    key: string,
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    const attempt = this.attempts.get(key) || 0;
    
    if (attempt >= maxAttempts) {
      this.attempts.delete(key);
      throw new Error(`Max attempts (${maxAttempts}) exceeded for ${key}`);
    }

    try {
      const result = await operation();
      this.attempts.delete(key); // Reset on success
      return result;
    } catch (error: any) {
      this.attempts.set(key, attempt + 1);
      
      // Don't retry on 404 (not found)
      if (error.response?.status === 404) {
        this.attempts.delete(key);
        throw error;
      }
      
      // Retry on 5xx errors
      if (error.response?.status >= 500) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn(`Retrying ${key} after ${delay}ms (attempt ${attempt + 1}/${maxAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.execute(key, operation, maxAttempts, baseDelay);
      }
      
      // Don't retry on other errors
      this.attempts.delete(key);
      throw error;
    }
  }
}

export const exponentialBackoff = new ExponentialBackoff();
