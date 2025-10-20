/**
 * Mock implementations for testing
 * Provides type-safe mocks for all common dependencies
 */

import { jest } from '@jest/globals';
import type { Logger } from 'pino';
import type {
  MetricsRecorder,
  MetricsSnapshot,
  HttpClient,
  Configuration,
  ExecutionContext,
} from '../../shared/types/index.js';

/**
 * Creates a mock Logger (Pino-compatible)
 * All methods are jest.fn() for verification
 */
export function createMockLogger(): Logger {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    silent: jest.fn(),
    child: jest.fn().mockReturnThis(),
    level: 'info',
    bindings: jest.fn().mockReturnValue({}),
    flush: jest.fn(),
  } as unknown as Logger;

  return mockLogger;
}

/**
 * Creates a mock MetricsRecorder
 * All methods are jest.fn() for verification
 */
export function createMockMetricsRecorder(): MetricsRecorder {
  const counters = new Map<string, number>();
  const durations = new Map<string, number[]>();
  const gauges = new Map<string, number>();

  return {
    incrementCounter: jest.fn((metric: string, labels?: Record<string, string>): void => {
      const key = buildMetricKey(metric, labels);
      counters.set(key, (counters.get(key) || 0) + 1);
    }),
    recordDuration: jest.fn((metric: string, durationMs: number, labels?: Record<string, string>): void => {
      const key = buildMetricKey(metric, labels);
      const existing = durations.get(key) || [];
      durations.set(key, [...existing, durationMs]);
    }),
    recordGauge: jest.fn((metric: string, value: number, labels?: Record<string, string>): void => {
      const key = buildMetricKey(metric, labels);
      gauges.set(key, value);
    }),
    getMetrics: jest.fn((): MetricsSnapshot => ({
      counters: new Map(counters),
      durations: new Map(durations),
      gauges: new Map(gauges),
      timestamp: Date.now(),
    })),
  };
}

/**
 * Helper to build metric keys with labels (same logic as InMemoryMetricsRecorder)
 */
function buildMetricKey(metric: string, labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) {
    return metric;
  }

  const labelPairs = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');

  return `${metric}{${labelPairs}}`;
}

/**
 * Creates a mock HttpClient
 * Responses can be configured per test
 */
export function createMockHttpClient(
  mockResponses?: {
    get?: <T = unknown>(url: string) => Promise<T>;
    post?: <T = unknown>(url: string, data: unknown) => Promise<T>;
  }
): HttpClient {
  return {
    get: jest.fn(async <T = unknown>(url: string): Promise<T> => {
      if (mockResponses?.get) {
        return mockResponses.get<T>(url);
      }
      throw new Error(`No mock response configured for GET ${url}`);
    }),
    post: jest.fn(async <T = unknown>(url: string, data: unknown): Promise<T> => {
      if (mockResponses?.post) {
        return mockResponses.post<T>(url, data);
      }
      throw new Error(`No mock response configured for POST ${url}`);
    }),
  };
}

/**
 * Creates a default test configuration
 * Can be overridden per test
 */
export function createMockConfiguration(overrides?: Partial<Configuration>): Configuration {
  const defaultConfig: Configuration = {
    transport: {
      mode: 'stdio',
      httpPort: 3000,
    },
    weather: {
      apiKey: 'test-api-key-12345',
      timeout: 5000,
      cacheTtl: 600,
    },
    security: {
      allowedFilePaths: ['/tmp', '/test'],
      apiKeys: ['test-key-1', 'test-key-2'],
      rateLimitRequestsPerMinute: 60,
    },
    observability: {
      logLevel: 'info',
      logFormat: 'json',
    },
    nodeEnv: 'test',
  };

  if (!overrides) {
    return defaultConfig;
  }

  return {
    ...defaultConfig,
    ...overrides,
    transport: { ...defaultConfig.transport, ...overrides.transport },
    weather: { ...defaultConfig.weather, ...overrides.weather },
    security: { ...defaultConfig.security, ...overrides.security },
    observability: { ...defaultConfig.observability, ...overrides.observability },
  };
}

/**
 * Creates a complete mock ExecutionContext
 * Combines all mocks with sensible defaults
 */
export function createMockExecutionContext(
  overrides?: Partial<ExecutionContext>
): ExecutionContext {
  const defaultContext: ExecutionContext = {
    logger: createMockLogger(),
    metrics: createMockMetricsRecorder(),
    config: createMockConfiguration(),
    httpClient: createMockHttpClient(),
    traceId: 'test-trace-id-' + Math.random().toString(36).substr(2, 9),
  };

  return {
    ...defaultContext,
    ...overrides,
  };
}

/**
 * Type guard helpers for testing Result types
 */
export function isSuccessResult<T>(result: unknown): result is { success: true; data: T } {
  return typeof result === 'object' && result !== null && 'success' in result && result.success === true;
}

export function isErrorResult(result: unknown): result is { success: false; error: unknown } {
  return typeof result === 'object' && result !== null && 'success' in result && result.success === false;
}

/**
 * Spy utilities for verifying mock calls
 */
export function getLoggerCalls(logger: Logger): {
  debug: unknown[][];
  info: unknown[][];
  warn: unknown[][];
  error: unknown[][];
} {
  const mockLogger = logger as unknown as {
    debug: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  return {
    debug: mockLogger.debug.mock.calls,
    info: mockLogger.info.mock.calls,
    warn: mockLogger.warn.mock.calls,
    error: mockLogger.error.mock.calls,
  };
}

export function getMetricsCalls(metrics: MetricsRecorder): {
  counters: unknown[][];
  durations: unknown[][];
  gauges: unknown[][];
} {
  const mockMetrics = metrics as unknown as {
    incrementCounter: jest.Mock;
    recordDuration: jest.Mock;
    recordGauge: jest.Mock;
  };

  return {
    counters: mockMetrics.incrementCounter.mock.calls,
    durations: mockMetrics.recordDuration.mock.calls,
    gauges: mockMetrics.recordGauge.mock.calls,
  };
}

export function getHttpClientCalls(httpClient: HttpClient): {
  get: unknown[][];
  post: unknown[][];
} {
  const mockClient = httpClient as unknown as {
    get: jest.Mock;
    post: jest.Mock;
  };

  return {
    get: mockClient.get.mock.calls,
    post: mockClient.post.mock.calls,
  };
}
