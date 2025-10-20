// ABOUTME: Utilities for automatic metrics recording
// ABOUTME: Provides wrapper functions to eliminate timing boilerplate in handlers

import type { ExecutionContext } from '../types/index.js';

/**
 * Wraps an async operation with automatic metrics recording
 * Records duration and success/error counters
 */
export async function withMetrics<T>(
  metricName: string,
  context: ExecutionContext,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    context.metrics.recordDuration(`${metricName}_duration_ms`, duration);
    context.metrics.incrementCounter(`${metricName}_success_total`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    context.metrics.recordDuration(`${metricName}_duration_ms`, duration);
    context.metrics.incrementCounter(`${metricName}_error_total`, {
      error_type: error instanceof Error ? error.name : 'unknown',
    });

    throw error;
  }
}
