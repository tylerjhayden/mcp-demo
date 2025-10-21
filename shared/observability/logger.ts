import pino from 'pino';
import type { Logger } from 'pino';

/**
 * Creates a configured Pino logger instance
 * @param config - Logger configuration
 * @returns Configured Pino logger
 */
export function createLogger(config: {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
  transport?: 'stdio' | 'http';
}): Logger {
  const baseConfig: pino.LoggerOptions = {
    level: config.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // Use pretty printing in development, JSON in production
  if (config.format === 'pretty') {
    return pino({
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          destination: config.transport === 'stdio' ? 2 : 1, // 2 = stderr, 1 = stdout
        },
      },
    });
  }

  // JSON logging for production
  // For stdio transport, use stderr to avoid mixing with protocol messages
  const destination = config.transport === 'stdio' ? 2 : 1;
  return pino(baseConfig, pino.destination({
    sync: false,
    dest: destination,
  }));
}

/**
 * Creates a child logger with additional context
 * @param logger - Parent logger
 * @param context - Additional context to add to all log entries
 * @returns Child logger with added context
 */
export function createChildLogger(
  logger: Logger,
  context: Record<string, unknown>
): Logger {
  return logger.child(context);
}

/**
 * Creates a request-scoped logger with trace ID
 * @param logger - Parent logger
 * @param traceId - Request trace identifier
 * @param additionalContext - Optional additional context
 * @returns Request-scoped logger
 */
export function createRequestLogger(
  logger: Logger,
  traceId: string,
  additionalContext?: Record<string, unknown>
): Logger {
  return logger.child({
    traceId,
    ...additionalContext,
  });
}
