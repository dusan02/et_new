interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  private log(level: string, message: string, meta?: any): void {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(formattedMessage);
        break;
      case LOG_LEVELS.WARN:
        console.warn(formattedMessage);
        break;
      case LOG_LEVELS.INFO:
        console.info(formattedMessage);
        break;
      case LOG_LEVELS.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }
  }

  error(message: string, meta?: any): void {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }
}

export const logger = new Logger();
