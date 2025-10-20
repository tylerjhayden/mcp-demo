/**
 * Tests for observability utilities
 * Covers metrics recording and logger creation
 */

import { InMemoryMetricsRecorder } from '../../shared/observability/metrics.js';
import { createLogger } from '../../shared/observability/logger.js';

describe('Observability', () => {
  describe('InMemoryMetricsRecorder', () => {
    let metrics: InMemoryMetricsRecorder;

    beforeEach((): void => {
      metrics = new InMemoryMetricsRecorder();
    });

    describe('counters', () => {
      it('should increment counter', (): void => {
        metrics.incrementCounter('requests_total');
        metrics.incrementCounter('requests_total');

        const snapshot = metrics.getMetrics();
        expect(snapshot.counters.get('requests_total')).toBe(2);
      });

      it('should handle labeled counters', (): void => {
        metrics.incrementCounter('requests_total', { status: '200' });
        metrics.incrementCounter('requests_total', { status: '404' });

        const snapshot = metrics.getMetrics();
        expect(snapshot.counters.get('requests_total{status="200"}')).toBe(1);
        expect(snapshot.counters.get('requests_total{status="404"}')).toBe(1);
      });
    });

    describe('durations', () => {
      it('should record duration', (): void => {
        metrics.recordDuration('request_duration_ms', 100);
        metrics.recordDuration('request_duration_ms', 200);

        const snapshot = metrics.getMetrics();
        const durations = snapshot.durations.get('request_duration_ms');
        expect(durations).toEqual([100, 200]);
      });
    });

    describe('gauges', () => {
      it('should record gauge value', (): void => {
        metrics.recordGauge('active_connections', 5);
        metrics.recordGauge('active_connections', 10);

        const snapshot = metrics.getMetrics();
        expect(snapshot.gauges.get('active_connections')).toBe(10);
      });
    });

    describe('reset', () => {
      it('should clear all metrics', (): void => {
        metrics.incrementCounter('test');
        metrics.recordDuration('test', 100);
        metrics.recordGauge('test', 5);

        metrics.reset();

        const snapshot = metrics.getMetrics();
        expect(snapshot.counters.size).toBe(0);
        expect(snapshot.durations.size).toBe(0);
        expect(snapshot.gauges.size).toBe(0);
      });
    });

    describe('calculatePercentile', () => {
      it('should calculate p50 correctly', (): void => {
        const durations = [1, 2, 3, 4, 5];
        const p50 = InMemoryMetricsRecorder.calculatePercentile(durations, 50);
        expect(p50).toBe(3);
      });

      it('should calculate p95 correctly', (): void => {
        const durations = Array.from({ length: 100 }, (_, i) => i + 1);
        const p95 = InMemoryMetricsRecorder.calculatePercentile(durations, 95);
        expect(p95).toBe(95);
      });

      it('should handle empty array', (): void => {
        const p50 = InMemoryMetricsRecorder.calculatePercentile([], 50);
        expect(p50).toBe(0);
      });
    });
  });

  describe('createLogger', () => {
    it('should create logger with specified level', (): void => {
      const logger = createLogger({
        level: 'info',
        format: 'json',
      });

      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
    });
  });
});
