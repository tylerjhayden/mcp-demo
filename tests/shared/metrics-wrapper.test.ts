// ABOUTME: Tests for metrics wrapper utility
// ABOUTME: Validates automatic metrics recording for success and error cases

import { describe, it, expect, beforeEach } from '@jest/globals';
import { withMetrics } from '../../shared/utils/metrics-wrapper.js';
import { TestFactories } from '../helpers/factories.js';

describe('withMetrics', () => {
  let context: ReturnType<typeof TestFactories.standardContext>;

  beforeEach(() => {
    context = TestFactories.standardContext();
  });

  it('should record duration and success metrics for successful execution', async () => {
    const operation = async () => {
      return 'test result';
    };

    const result = await withMetrics('test_operation', context, operation);

    expect(result).toBe('test result');

    // Verify metrics were recorded
    const metrics = context.metrics.getMetrics();
    expect(metrics.counters.get('test_operation_success_total')).toBeGreaterThan(0);
    expect(metrics.durations.get('test_operation_duration_ms')).toBeDefined();
    expect(metrics.durations.get('test_operation_duration_ms')!.length).toBeGreaterThan(0);
  });

  it('should record duration and error metrics for failed execution', async () => {
    const testError = new Error('Test error');
    const operation = async () => {
      throw testError;
    };

    await expect(withMetrics('test_operation', context, operation)).rejects.toThrow('Test error');

    // Verify error metrics were recorded
    const metrics = context.metrics.getMetrics();
    // Error counter has labels, so key is like: test_operation_error_total{error_type="Error"}
    const errorCounterKey = Array.from(metrics.counters.keys()).find(key =>
      key.startsWith('test_operation_error_total')
    );
    expect(errorCounterKey).toBeDefined();
    expect(metrics.counters.get(errorCounterKey!)).toBeGreaterThan(0);
    expect(metrics.durations.get('test_operation_duration_ms')).toBeDefined();
  });

  it('should include error type in error metrics', async () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const operation = async () => {
      throw new CustomError('Custom error');
    };

    await expect(withMetrics('test_operation', context, operation)).rejects.toThrow('Custom error');

    // Metrics recorder should have recorded error with type label
    const metrics = context.metrics.getMetrics();
    const errorCounterKey = Array.from(metrics.counters.keys()).find(key =>
      key.includes('test_operation_error_total') && key.includes('CustomError')
    );
    expect(errorCounterKey).toBeDefined();
    expect(metrics.counters.get(errorCounterKey!)).toBeGreaterThan(0);
  });

  it('should support synchronous operations', async () => {
    const operation = async () => 42;

    const result = await withMetrics('sync_operation', context, operation);

    expect(result).toBe(42);
    const metrics = context.metrics.getMetrics();
    expect(metrics.counters.get('sync_operation_success_total')).toBeGreaterThan(0);
  });
});
