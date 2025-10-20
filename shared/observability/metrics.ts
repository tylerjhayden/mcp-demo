import type { MetricsRecorder, MetricsSnapshot } from '../types/index.js';

/**
 * In-memory metrics recorder implementation
 * Tracks counters, durations, and gauges for observability
 */
export class InMemoryMetricsRecorder implements MetricsRecorder {
  private counters: Map<string, number> = new Map();
  private durations: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Increments a counter metric
   * @param metric - Metric name (e.g., "requests_total", "errors_total")
   * @param labels - Optional labels for metric dimensionality
   */
  incrementCounter(metric: string, labels?: Record<string, string>): void {
    const key = this.buildMetricKey(metric, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  /**
   * Records a duration measurement
   * @param metric - Metric name (e.g., "request_duration_ms")
   * @param durationMs - Duration in milliseconds
   * @param labels - Optional labels for metric dimensionality
   */
  recordDuration(metric: string, durationMs: number, labels?: Record<string, string>): void {
    const key = this.buildMetricKey(metric, labels);
    const durations = this.durations.get(key) || [];
    durations.push(durationMs);
    this.durations.set(key, durations);
  }

  /**
   * Records a gauge value (point-in-time measurement)
   * @param metric - Metric name (e.g., "active_connections")
   * @param value - Current gauge value
   * @param labels - Optional labels for metric dimensionality
   */
  recordGauge(metric: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildMetricKey(metric, labels);
    this.gauges.set(key, value);
  }

  /**
   * Gets a snapshot of all current metrics
   * @returns Metrics snapshot with all collected data
   */
  getMetrics(): MetricsSnapshot {
    return {
      counters: new Map(this.counters),
      durations: new Map(this.durations),
      gauges: new Map(this.gauges),
      timestamp: Date.now(),
    };
  }

  /**
   * Gets uptime in milliseconds
   */
  getUptimeMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Resets all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.durations.clear();
    this.gauges.clear();
  }

  /**
   * Builds a metric key from name and labels
   * @param metric - Metric name
   * @param labels - Optional labels
   * @returns Metric key string
   */
  private buildMetricKey(metric: string, labels?: Record<string, string>): string {
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
   * Calculates percentile from duration array
   * @param durations - Array of duration measurements
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   */
  static calculatePercentile(durations: number[], percentile: number): number {
    if (durations.length === 0) return 0;

    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  /**
   * Formats metrics snapshot as Prometheus-style text
   * @param snapshot - Metrics snapshot
   * @returns Prometheus-formatted metrics
   */
  static formatPrometheus(snapshot: MetricsSnapshot): string {
    const lines: string[] = [];

    // Counters
    for (const [key, value] of snapshot.counters) {
      lines.push(`${key} ${value}`);
    }

    // Duration metrics (calculate p50, p95, p99)
    for (const [key, durations] of snapshot.durations) {
      if (durations.length > 0) {
        const p50 = this.calculatePercentile(durations, 50);
        const p95 = this.calculatePercentile(durations, 95);
        const p99 = this.calculatePercentile(durations, 99);

        lines.push(`${key}_p50 ${p50.toFixed(2)}`);
        lines.push(`${key}_p95 ${p95.toFixed(2)}`);
        lines.push(`${key}_p99 ${p99.toFixed(2)}`);
        lines.push(`${key}_count ${durations.length}`);
      }
    }

    // Gauges
    for (const [key, value] of snapshot.gauges) {
      lines.push(`${key} ${value}`);
    }

    return lines.join('\n');
  }
}
