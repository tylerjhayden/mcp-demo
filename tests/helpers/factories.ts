/**
 * Factory functions for creating test objects
 * Provides convenient builders for complex test data structures
 */

import { expect } from '@jest/globals';
import type {
  ExecutionContext,
  WeatherParams,
  CalculateParams,
  FileResourceParams,
  ValidationResult,
  SuccessResult,
  ErrorResult,
  MCPError,
} from '../../shared/types/index.js';
import {
  createMockExecutionContext,
  createMockConfiguration,
  createMockLogger,
  createMockMetricsRecorder,
  createMockHttpClient,
} from './mocks.js';
import { generateTestTraceId } from './fixtures.js';

/**
 * Creates an ExecutionContext with custom overrides
 * Provides a fluent builder pattern for easy customization
 */
export class ExecutionContextBuilder {
  private context: ExecutionContext;

  constructor() {
    this.context = createMockExecutionContext();
  }

  withTraceId(traceId: string): this {
    this.context.traceId = traceId;
    return this;
  }

  withLogger(logger: ExecutionContext['logger']): this {
    this.context.logger = logger;
    return this;
  }

  withMetrics(metrics: ExecutionContext['metrics']): this {
    this.context.metrics = metrics;
    return this;
  }

  withConfig(config: Partial<ExecutionContext['config']>): this {
    this.context.config = createMockConfiguration(config);
    return this;
  }

  withHttpClient(httpClient: ExecutionContext['httpClient']): this {
    this.context.httpClient = httpClient;
    return this;
  }

  withWeatherApiKey(apiKey: string): this {
    this.context.config.weather.apiKey = apiKey;
    return this;
  }

  withCacheTtl(ttlSeconds: number): this {
    this.context.config.weather.cacheTtl = ttlSeconds;
    return this;
  }

  withAllowedPaths(paths: string[]): this {
    this.context.config.security.allowedFilePaths = paths;
    return this;
  }

  withRateLimit(requestsPerMinute: number): this {
    this.context.config.security.rateLimitRequestsPerMinute = requestsPerMinute;
    return this;
  }

  build(): ExecutionContext {
    return this.context;
  }
}

/**
 * Creates a WeatherParams object
 */
export function createWeatherParams(location: string = 'San Francisco'): WeatherParams {
  return { location };
}

/**
 * Creates a CalculateParams object
 */
export function createCalculateParams(expression: string = '2 + 2'): CalculateParams {
  return { expression };
}

/**
 * Creates a FileResourceParams object
 */
export function createFileResourceParams(uri: string = 'file:///tmp/test.txt'): FileResourceParams {
  return { uri };
}

/**
 * Creates a ValidationResult for success case
 */
export function createValidationSuccess<T>(data: T): ValidationResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a ValidationResult for error case
 */
export function createValidationError(message: string, issues: Array<{ path: string[]; message: string }>): ValidationResult<never> {
  return {
    success: false,
    error: {
      message,
      issues,
    },
  };
}

/**
 * Creates a SuccessResult
 */
export function createSuccessResult<T>(data: T): SuccessResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates an ErrorResult
 */
export function createErrorResult(error: MCPError): ErrorResult {
  return {
    success: false,
    error,
  };
}

/**
 * Creates an MCPError with custom properties
 */
export function createMCPError(
  code: number,
  message: string,
  data?: Record<string, unknown>
): MCPError {
  return {
    code,
    message,
    ...(data && { data }),
  };
}

/**
 * Creates a JSON-RPC request object
 */
export function createJsonRpcRequest(
  method: string,
  params: unknown,
  id: number | string = 1
): {
  jsonrpc: string;
  method: string;
  params: unknown;
  id: number | string;
} {
  return {
    jsonrpc: '2.0',
    method,
    params,
    id,
  };
}

/**
 * Creates a JSON-RPC success response
 */
export function createJsonRpcSuccess<T>(
  result: T,
  id: number | string = 1
): {
  jsonrpc: string;
  result: T;
  id: number | string;
} {
  return {
    jsonrpc: '2.0',
    result,
    id,
  };
}

/**
 * Creates a JSON-RPC error response
 */
export function createJsonRpcError(
  error: MCPError,
  id: number | string = 1
): {
  jsonrpc: string;
  error: MCPError;
  id: number | string;
} {
  return {
    jsonrpc: '2.0',
    error,
    id,
  };
}

/**
 * Builder for creating mock HTTP client with predefined responses
 */
export class MockHttpClientBuilder {
  private getResponses: Map<string, unknown> = new Map();
  private postResponses: Map<string, unknown> = new Map();
  private getErrors: Map<string, Error> = new Map();
  private postErrors: Map<string, Error> = new Map();

  addGetResponse<T>(url: string, response: T): this {
    this.getResponses.set(url, response);
    return this;
  }

  addPostResponse<T>(url: string, response: T): this {
    this.postResponses.set(url, response);
    return this;
  }

  addGetError(url: string, error: Error): this {
    this.getErrors.set(url, error);
    return this;
  }

  addPostError(url: string, error: Error): this {
    this.postErrors.set(url, error);
    return this;
  }

  build(): ExecutionContext['httpClient'] {
    return createMockHttpClient({
      get: async <T = unknown>(url: string): Promise<T> => {
        if (this.getErrors.has(url)) {
          throw this.getErrors.get(url);
        }
        if (this.getResponses.has(url)) {
          return this.getResponses.get(url) as T;
        }
        throw new Error(`No mock response configured for GET ${url}`);
      },
      post: async <T = unknown>(url: string): Promise<T> => {
        if (this.postErrors.has(url)) {
          throw this.postErrors.get(url);
        }
        if (this.postResponses.has(url)) {
          return this.postResponses.get(url) as T;
        }
        throw new Error(`No mock response configured for POST ${url}`);
      },
    });
  }
}

/**
 * Convenience functions for common test scenarios
 */
export const TestFactories = {
  /**
   * Creates a standard execution context for testing handlers
   */
  standardContext(): ExecutionContext {
    return new ExecutionContextBuilder()
      .withTraceId(generateTestTraceId())
      .build();
  },

  /**
   * Creates an execution context with weather API configured
   */
  weatherContext(apiKey: string = 'test-api-key'): ExecutionContext {
    return new ExecutionContextBuilder()
      .withWeatherApiKey(apiKey)
      .withCacheTtl(600)
      .build();
  },

  /**
   * Creates an execution context with file access configured
   */
  fileContext(allowedPaths: string[] = ['/tmp', '/test']): ExecutionContext {
    return new ExecutionContextBuilder()
      .withAllowedPaths(allowedPaths)
      .build();
  },

  /**
   * Creates an execution context with HTTP client that returns specific weather data
   */
  weatherContextWithResponse(weatherApiResponse: unknown): ExecutionContext {
    const httpClient = new MockHttpClientBuilder()
      .addGetResponse(
        expect.stringContaining('api.openweathermap.org'),
        weatherApiResponse
      )
      .build();

    return new ExecutionContextBuilder()
      .withHttpClient(httpClient)
      .withWeatherApiKey('test-key')
      .build();
  },
};
