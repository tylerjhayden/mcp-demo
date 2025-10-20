import { Logger } from 'pino';
import type { z } from 'zod';

/**
 * Validation result from schema validation
 */
export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    issues: Array<{
      path: string[];
      message: string;
    }>;
  };
}

/**
 * MCP error codes as defined in the protocol spec
 */
export enum MCPErrorCode {
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ParseError = -32700,
  ResourceNotFound = -32001,
  RequestTimeout = -32002,
}

/**
 * MCP error response
 */
export interface MCPError {
  code: MCPErrorCode;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Successful result from handler execution
 */
export interface SuccessResult<T = unknown> {
  success: true;
  data: T;
}

/**
 * Error result from handler execution
 */
export interface ErrorResult {
  success: false;
  error: MCPError;
}

/**
 * Result type for handler execution
 */
export type Result<T = unknown> = SuccessResult<T> | ErrorResult;

/**
 * HTTP client interface for making external API calls
 */
export interface HttpClient {
  get<T = unknown>(url: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(url: string, data: unknown, options?: RequestOptions): Promise<T>;
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Metrics recorder for tracking usage statistics
 */
export interface MetricsRecorder {
  incrementCounter(metric: string, labels?: Record<string, string>): void;
  recordDuration(metric: string, durationMs: number, labels?: Record<string, string>): void;
  recordGauge(metric: string, value: number, labels?: Record<string, string>): void;
  getMetrics(): MetricsSnapshot;
}

/**
 * Snapshot of current metrics
 */
export interface MetricsSnapshot {
  counters: Map<string, number>;
  durations: Map<string, number[]>;
  gauges: Map<string, number>;
  timestamp: number;
}

/**
 * Runtime configuration interface
 */
export interface Configuration {
  transport: {
    mode: 'stdio' | 'http';
    httpPort: number;
  };
  weather: {
    apiKey: string;
    timeout: number;
    cacheTtl: number;
  };
  security: {
    allowedFilePaths: string[];
    apiKeys: string[];
    rateLimitRequestsPerMinute: number;
  };
  observability: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logFormat: 'json' | 'pretty';
  };
  nodeEnv: 'development' | 'production' | 'test';
}

/**
 * Execution context provided to all handlers
 * Contains shared services and request metadata
 */
export interface ExecutionContext {
  logger: Logger;
  metrics: MetricsRecorder;
  config: Configuration;
  httpClient: HttpClient;
  traceId: string;
}

/**
 * Base capability handler interface
 * All tools and resources implement this interface
 */
export interface CapabilityHandler<TParams = unknown, TResult = unknown> {
  /**
   * Validates input parameters using schema validation
   * @param input - Raw input to validate
   * @returns Validation result with parsed data or error details
   */
  validate(input: unknown): ValidationResult<TParams>;

  /**
   * Executes the handler's core logic
   * @param params - Validated parameters
   * @param context - Execution context with shared services
   * @returns Result containing data or error
   */
  execute(params: TParams, context: ExecutionContext): Promise<Result<TResult>>;

  /**
   * Transforms exceptions into MCP error format
   * @param error - Error to transform
   * @returns MCP error response
   */
  handleError(error: Error): MCPError;
}

/**
 * Tool-specific parameters and results
 */

// Calculate tool
export interface CalculateParams {
  expression: string;
}

export interface CalculateResult {
  expression: string;
  result: number;
}

// Weather tool
export interface WeatherParams {
  location: string;
}

export interface WeatherResult {
  location: string;
  temperature: number;
  conditions: string;
  timestamp: string;
}

// File resource
export interface FileResourceParams {
  uri: string;
}

export interface FileResourceResult {
  uri: string;
  mimeType: string;
  content: string;
  size: number;
}

export interface FileResourceListItem {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

/**
 * Type helper to extract validated params from a Zod schema
 */
export type InferParams<T> = T extends z.ZodType<infer U> ? U : never;
