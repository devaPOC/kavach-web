export interface CounterMetric { 
  name: string; 
  value: number; 
  labels?: Record<string, string>; 
  type: 'counter';
}

export interface GaugeMetric { 
  name: string; 
  value: number; 
  labels?: Record<string, string>; 
  type: 'gauge';
}

export interface HistogramMetric { 
  name: string; 
  values: number[]; 
  labels?: Record<string, string>; 
  type: 'histogram';
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
}

export interface TimerMetric {
  name: string;
  duration: number;
  labels?: Record<string, string>;
  type: 'timer';
  timestamp: string;
}

export type Metric = CounterMetric | GaugeMetric | HistogramMetric | TimerMetric;

const counters = new Map<string, CounterMetric>();
const gauges = new Map<string, GaugeMetric>();
const histograms = new Map<string, HistogramMetric>();
const timers: TimerMetric[] = [];

function key(name: string, labels?: Record<string, string>) {
  if (!labels) return name;
  const parts = Object.keys(labels).sort().map(k => `${k}=${labels[k]}`);
  return `${name}|${parts.join(',')}`;
}

export function increment(name: string, inc = 1, labels?: Record<string, string>) {
  const k = key(name, labels);
  const existing = counters.get(k) || { name, value: 0, labels, type: 'counter' as const };
  existing.value += inc;
  counters.set(k, existing);
}

export function setGauge(name: string, value: number, labels?: Record<string, string>) {
  const k = key(name, labels);
  gauges.set(k, { name, value, labels, type: 'gauge' });
}

export function recordHistogram(name: string, value: number, labels?: Record<string, string>) {
  const k = key(name, labels);
  const existing = histograms.get(k) || { 
    name, 
    values: [], 
    labels, 
    type: 'histogram' as const,
    count: 0,
    sum: 0,
    min: Infinity,
    max: -Infinity,
    avg: 0
  };
  
  existing.values.push(value);
  existing.count++;
  existing.sum += value;
  existing.min = Math.min(existing.min, value);
  existing.max = Math.max(existing.max, value);
  existing.avg = existing.sum / existing.count;
  
  // Keep only last 1000 values to prevent memory issues
  if (existing.values.length > 1000) {
    existing.values = existing.values.slice(-1000);
  }
  
  histograms.set(k, existing);
}

export function recordTimer(name: string, duration: number, labels?: Record<string, string>) {
  const timer: TimerMetric = {
    name,
    duration,
    labels,
    type: 'timer',
    timestamp: new Date().toISOString()
  };
  
  timers.push(timer);
  
  // Keep only last 1000 timer records
  if (timers.length > 1000) {
    timers.splice(0, timers.length - 1000);
  }
  
  // Also record as histogram for statistical analysis
  recordHistogram(`${name}_duration`, duration, labels);
}

export function getCounter(name: string, labels?: Record<string, string>): number {
  const k = key(name, labels);
  return counters.get(k)?.value || 0;
}

export function getGauge(name: string, labels?: Record<string, string>): number {
  const k = key(name, labels);
  return gauges.get(k)?.value || 0;
}

export function getHistogram(name: string, labels?: Record<string, string>): HistogramMetric | undefined {
  const k = key(name, labels);
  return histograms.get(k);
}

export function snapshotMetrics(): Metric[] { 
  return [
    ...Array.from(counters.values()),
    ...Array.from(gauges.values()),
    ...Array.from(histograms.values()),
    ...timers.slice(-100) // Only include recent timers in snapshot
  ];
}

export function resetMetrics() { 
  counters.clear();
  gauges.clear();
  histograms.clear();
  timers.length = 0;
}

// Performance monitoring functions
export function measurePerformance<T>(
  name: string,
  operation: () => Promise<T>,
  labels?: Record<string, string>
): Promise<T> {
  const startTime = Date.now();
  
  return operation()
    .then(result => {
      const duration = Date.now() - startTime;
      recordTimer(name, duration, { ...labels, status: 'success' });
      increment(`${name}_total`, 1, { ...labels, status: 'success' });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      recordTimer(name, duration, { ...labels, status: 'error' });
      increment(`${name}_total`, 1, { ...labels, status: 'error' });
      throw error;
    });
}

export function measureSync<T>(
  name: string,
  operation: () => T,
  labels?: Record<string, string>
): T {
  const startTime = Date.now();
  
  try {
    const result = operation();
    const duration = Date.now() - startTime;
    recordTimer(name, duration, { ...labels, status: 'success' });
    increment(`${name}_total`, 1, { ...labels, status: 'success' });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTimer(name, duration, { ...labels, status: 'error' });
    increment(`${name}_total`, 1, { ...labels, status: 'error' });
    throw error;
  }
}

// Authentication metrics
export const recordAuthEvent = (event: 'login' | 'signup' | 'refresh' | 'logout' | 'email_verify', success: boolean, duration?: number) => {
  increment(`auth_${event}_${success ? 'success' : 'failed'}_total`);
  if (duration !== undefined) {
    recordTimer(`auth_${event}_duration`, duration, { status: success ? 'success' : 'failed' });
  }
};

// Rate limiting metrics
export const recordRateLimit = (identifier: string, result: { blocked: boolean; success: boolean }) => {
  if (result.blocked) increment(`ratelimit_blocked_total`, 1, { id: identifier });
  else increment(`ratelimit_allowed_total`, 1, { id: identifier });
};

// Database metrics
export const recordDatabaseOperation = (operation: string, duration: number, success: boolean) => {
  recordTimer(`database_${operation}_duration`, duration, { status: success ? 'success' : 'error' });
  increment(`database_${operation}_total`, 1, { status: success ? 'success' : 'error' });
};

// API metrics
export const recordApiRequest = (endpoint: string, method: string, statusCode: number, duration: number) => {
  const status = statusCode >= 200 && statusCode < 300 ? 'success' : 'error';
  recordTimer('api_request_duration', duration, { endpoint, method, status });
  increment('api_request_total', 1, { endpoint, method, status_code: statusCode.toString() });
};

// System metrics
export const recordSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  setGauge('system_memory_heap_used', memUsage.heapUsed);
  setGauge('system_memory_heap_total', memUsage.heapTotal);
  setGauge('system_memory_rss', memUsage.rss);
  setGauge('system_memory_external', memUsage.external);
  setGauge('system_uptime', process.uptime());
  
  // CPU usage (if available)
  const cpuUsage = process.cpuUsage();
  setGauge('system_cpu_user', cpuUsage.user);
  setGauge('system_cpu_system', cpuUsage.system);
};

// Security metrics
export const recordSecurityEvent = (event: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
  increment(`security_${event}_total`, 1, { severity });
};

// Profile metrics
export const recordProfileOperation = (operation: string, profileType: string, success: boolean, duration?: number) => {
  increment(`profile_${operation}_total`, 1, { profile_type: profileType, status: success ? 'success' : 'error' });
  if (duration !== undefined) {
    recordTimer(`profile_${operation}_duration`, duration, { profile_type: profileType, status: success ? 'success' : 'error' });
  }
};
