/**
 * Enhanced logging infrastructure
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  requestId?: string;
  userId?: string;
  service?: string;
}

/**
 * Abstract logger interface
 */
export abstract class Logger {
  abstract log(level: LogLevel, message: string, context?: LogContext): void;

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
}

/**
 * Console logger implementation
 */
export class ConsoleLogger extends Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    super();
    this.minLevel = minLevel;
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }
}

/**
 * Structured logger with request correlation
 */
export class StructuredLogger extends Logger {
  private requestId?: string;
  private userId?: string;
  private service?: string;
  private baseLogger: Logger;

  constructor(
    baseLogger: Logger,
    options?: {
      requestId?: string;
      userId?: string;
      service?: string;
    }
  ) {
    super();
    this.baseLogger = baseLogger;
    this.requestId = options?.requestId;
    this.userId = options?.userId;
    this.service = options?.service;
  }

  log(level: LogLevel, message: string, context?: LogContext): void {
    const enrichedContext = {
      ...context,
      ...(this.requestId && { requestId: this.requestId }),
      ...(this.userId && { userId: this.userId }),
      ...(this.service && { service: this.service })
    };

    this.baseLogger.log(level, message, enrichedContext);
  }

  withContext(options: { requestId?: string; userId?: string; service?: string }): StructuredLogger {
    return new StructuredLogger(this.baseLogger, {
      requestId: options.requestId || this.requestId,
      userId: options.userId || this.userId,
      service: options.service || this.service
    });
  }
}

/**
 * Logger factory
 */
export class LoggerFactory {
  private static instance: Logger;

  static createLogger(): Logger {
    if (!LoggerFactory.instance) {
      const logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
      LoggerFactory.instance = new ConsoleLogger(logLevel);
    }
    return LoggerFactory.instance;
  }

  static createStructuredLogger(options?: {
    requestId?: string;
    userId?: string;
    service?: string;
  }): StructuredLogger {
    const baseLogger = LoggerFactory.createLogger();
    return new StructuredLogger(baseLogger, options);
  }
}

// Export default logger instance
export const logger = LoggerFactory.createLogger();
