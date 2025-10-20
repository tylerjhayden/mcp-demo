import dotenv from 'dotenv';
import type { Configuration } from '../types/index.js';

// Load environment variables from .env file
dotenv.config();

/**
 * Parses and validates configuration from environment variables
 * @returns Typed configuration object with validated values
 * @throws Error if required configuration is missing or invalid
 */
export function loadConfiguration(): Configuration {
  const config: Configuration = {
    transport: {
      mode: parseTransportMode(process.env.TRANSPORT_MODE),
      httpPort: parseInt(process.env.HTTP_PORT || '3000', 10),
    },
    weather: {
      apiKey: process.env.WEATHER_API_KEY || '',
      timeout: parseInt(process.env.WEATHER_API_TIMEOUT || '5000', 10),
      cacheTtl: parseInt(process.env.WEATHER_CACHE_TTL || '600', 10),
    },
    security: {
      allowedFilePaths: parsePathList(process.env.ALLOWED_FILE_PATHS),
      apiKeys: parseApiKeys(process.env.API_KEYS),
      rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS || '60', 10),
    },
    observability: {
      logLevel: parseLogLevel(process.env.LOG_LEVEL),
      logFormat: parseLogFormat(process.env.LOG_FORMAT),
    },
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  };

  validateConfiguration(config);

  return config;
}

/**
 * Parses transport mode from string
 */
function parseTransportMode(value: string | undefined): 'stdio' | 'http' {
  if (value === 'http' || value === 'stdio') {
    return value;
  }
  return 'stdio'; // Default to stdio
}

/**
 * Parses colon-separated path list
 */
function parsePathList(value: string | undefined): string[] {
  if (!value) {
    return ['/tmp']; // Default safe directory
  }

  return value
    .split(':')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Parses comma-separated API keys
 */
function parseApiKeys(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Parses log level from string
 */
function parseLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  return 'info'; // Default to info
}

/**
 * Parses log format from string
 */
function parseLogFormat(value: string | undefined): 'json' | 'pretty' {
  if (value === 'json' || value === 'pretty') {
    return value;
  }
  return 'pretty'; // Default to pretty for development
}

/**
 * Parses Node environment
 */
function parseNodeEnv(value: string | undefined): 'development' | 'production' | 'test' {
  if (value === 'production' || value === 'test') {
    return value;
  }
  return 'development'; // Default to development
}

/**
 * Validates configuration for consistency and required values
 * @throws Error if configuration is invalid
 */
function validateConfiguration(config: Configuration): void {
  // Validate HTTP port
  if (config.transport.mode === 'http') {
    if (config.transport.httpPort < 1 || config.transport.httpPort > 65535) {
      throw new Error(`Invalid HTTP port: ${config.transport.httpPort} (must be 1-65535)`);
    }

    // HTTP mode requires API keys for authentication
    if (config.security.apiKeys.length === 0) {
      throw new Error('HTTP transport requires at least one API key (set API_KEYS environment variable)');
    }
  }

  // Validate weather API configuration
  if (!config.weather.apiKey && config.nodeEnv !== 'test') {
    console.warn('Warning: WEATHER_API_KEY not set. Weather tool will not function properly.');
  }

  if (config.weather.timeout < 100 || config.weather.timeout > 30000) {
    throw new Error(`Invalid weather API timeout: ${config.weather.timeout}ms (must be 100-30000)`);
  }

  // Validate file paths
  if (config.security.allowedFilePaths.length === 0) {
    throw new Error('At least one allowed file path must be configured (set ALLOWED_FILE_PATHS)');
  }

  // Validate rate limiting
  if (config.security.rateLimitRequestsPerMinute < 1 || config.security.rateLimitRequestsPerMinute > 10000) {
    throw new Error(`Invalid rate limit: ${config.security.rateLimitRequestsPerMinute} (must be 1-10000)`);
  }

  // Validate cache TTL
  if (config.weather.cacheTtl < 0) {
    throw new Error(`Invalid cache TTL: ${config.weather.cacheTtl} (must be >= 0)`);
  }
}

/**
 * Gets configuration with overrides (useful for testing)
 * @param overrides - Configuration overrides
 * @returns Configuration with overrides applied
 */
export function getConfiguration(overrides?: Partial<Configuration>): Configuration {
  const baseConfig = loadConfiguration();

  if (!overrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...overrides,
    transport: { ...baseConfig.transport, ...overrides.transport },
    weather: { ...baseConfig.weather, ...overrides.weather },
    security: { ...baseConfig.security, ...overrides.security },
    observability: { ...baseConfig.observability, ...overrides.observability },
  };
}
