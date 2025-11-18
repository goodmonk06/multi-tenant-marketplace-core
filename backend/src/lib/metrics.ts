export interface MetricLabels {
  [key: string]: string | number;
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
}

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: MetricLabels;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private enabled: boolean = process.env.NODE_ENV !== 'test';

  private getMetricKey(name: string, labels?: MetricLabels): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  recordCounter(name: string, value: number = 1, labels?: MetricLabels) {
    if (!this.enabled) return;

    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.type === MetricType.COUNTER) {
      existing.value += value;
      existing.timestamp = Date.now();
    } else {
      this.metrics.set(key, {
        name,
        type: MetricType.COUNTER,
        value,
        labels,
        timestamp: Date.now(),
      });
    }
  }

  recordGauge(name: string, value: number, labels?: MetricLabels) {
    if (!this.enabled) return;

    const key = this.getMetricKey(name, labels);
    this.metrics.set(key, {
      name,
      type: MetricType.GAUGE,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels) {
    if (!this.enabled) return;

    // Simple histogram implementation - just store the value
    // In production, you'd use a proper histogram with buckets
    const key = this.getMetricKey(name, labels);
    this.metrics.set(key, {
      name,
      type: MetricType.HISTOGRAM,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getMetric(name: string, labels?: MetricLabels): Metric | undefined {
    const key = this.getMetricKey(name, labels);
    return this.metrics.get(key);
  }

  clear() {
    this.metrics.clear();
  }

  // Helper methods for common marketplace metrics
  incrementOrderCount(tenantId: string, status: string) {
    this.recordCounter('orders_total', 1, { tenantId, status });
  }

  recordOrderValue(tenantId: string, value: number) {
    this.recordHistogram('order_value', value, { tenantId });
  }

  incrementListingViews(tenantId: string, listingId: string) {
    this.recordCounter('listing_views_total', 1, { tenantId, listingId });
  }

  recordApiLatency(endpoint: string, method: string, duration: number) {
    this.recordHistogram('api_latency_ms', duration, { endpoint, method });
  }

  incrementApiCalls(endpoint: string, method: string, status: number) {
    this.recordCounter('api_calls_total', 1, { endpoint, method, status: status.toString() });
  }

  setActiveUsers(tenantId: string, count: number) {
    this.recordGauge('active_users', count, { tenantId });
  }

  setActiveSessions(count: number) {
    this.recordGauge('active_sessions', count);
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

// Export class for testing
export { MetricsCollector };
