import { describe, it, expect, beforeEach } from 'vitest';
import {
  increment,
  setGauge,
  recordHistogram,
  recordTimer,
  getCounter,
  getGauge,
  getHistogram,
  snapshotMetrics,
  resetMetrics,
  measurePerformance,
  measureSync,
  recordAuthEvent,
  recordDatabaseOperation,
  recordApiRequest,
  recordSystemMetrics,
  recordSecurityEvent,
  recordProfileOperation
} from '../metrics';

describe('Enhanced Metrics System', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('Counter metrics', () => {
    it('should increment counters', () => {
      increment('test_counter');
      expect(getCounter('test_counter')).toBe(1);

      increment('test_counter', 5);
      expect(getCounter('test_counter')).toBe(6);
    });

    it('should handle counters with labels', () => {
      increment('http_requests', 1, { method: 'GET', status: '200' });
      increment('http_requests', 1, { method: 'POST', status: '200' });
      increment('http_requests', 1, { method: 'GET', status: '404' });

      expect(getCounter('http_requests', { method: 'GET', status: '200' })).toBe(1);
      expect(getCounter('http_requests', { method: 'POST', status: '200' })).toBe(1);
      expect(getCounter('http_requests', { method: 'GET', status: '404' })).toBe(1);
    });
  });

  describe('Gauge metrics', () => {
    it('should set and get gauge values', () => {
      setGauge('memory_usage', 1024);
      expect(getGauge('memory_usage')).toBe(1024);

      setGauge('memory_usage', 2048);
      expect(getGauge('memory_usage')).toBe(2048);
    });

    it('should handle gauges with labels', () => {
      setGauge('cpu_usage', 50, { core: '0' });
      setGauge('cpu_usage', 75, { core: '1' });

      expect(getGauge('cpu_usage', { core: '0' })).toBe(50);
      expect(getGauge('cpu_usage', { core: '1' })).toBe(75);
    });
  });

  describe('Histogram metrics', () => {
    it('should record histogram values and calculate statistics', () => {
      recordHistogram('response_time', 100);
      recordHistogram('response_time', 200);
      recordHistogram('response_time', 150);

      const histogram = getHistogram('response_time');
      expect(histogram).toBeDefined();
      expect(histogram!.count).toBe(3);
      expect(histogram!.sum).toBe(450);
      expect(histogram!.min).toBe(100);
      expect(histogram!.max).toBe(200);
      expect(histogram!.avg).toBe(150);
    });

    it('should limit histogram values to prevent memory issues', () => {
      // Record more than 1000 values
      for (let i = 0; i < 1200; i++) {
        recordHistogram('large_histogram', i);
      }

      const histogram = getHistogram('large_histogram');
      expect(histogram!.values.length).toBe(1000);
      expect(histogram!.count).toBe(1200);
    });
  });

  describe('Timer metrics', () => {
    it('should record timer values', () => {
      recordTimer('operation_duration', 250);
      recordTimer('operation_duration', 300);

      const snapshot = snapshotMetrics();
      const timers = snapshot.filter(m => m.type === 'timer');
      expect(timers.length).toBe(2);

      // Should also create histogram
      const histogram = getHistogram('operation_duration_duration');
      expect(histogram).toBeDefined();
      expect(histogram!.count).toBe(2);
    });

    it('should limit timer records to prevent memory issues', () => {
      // Record more than 1000 timers
      for (let i = 0; i < 1200; i++) {
        recordTimer('many_timers', i);
      }

      const snapshot = snapshotMetrics();
      const timers = snapshot.filter(m => m.type === 'timer');
      expect(timers.length).toBe(100); // Only recent 100 in snapshot
    });
  });

  describe('Performance measurement', () => {
    it('should measure async operation performance', async () => {
      const result = await measurePerformance('async_operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
      expect(getCounter('async_operation_total', { status: 'success' })).toBe(1);
      
      const histogram = getHistogram('async_operation_duration');
      expect(histogram).toBeDefined();
      expect(histogram!.count).toBe(1);
    });

    it('should measure failed async operations', async () => {
      await expect(
        measurePerformance('failing_operation', async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');

      expect(getCounter('failing_operation_total', { status: 'error' })).toBe(1);
    });

    it('should measure sync operation performance', () => {
      const result = measureSync('sync_operation', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });

      expect(result).toBe(499500);
      expect(getCounter('sync_operation_total', { status: 'success' })).toBe(1);
    });

    it('should measure failed sync operations', () => {
      expect(() => {
        measureSync('failing_sync_operation', () => {
          throw new Error('Sync operation failed');
        });
      }).toThrow('Sync operation failed');

      expect(getCounter('failing_sync_operation_total', { status: 'error' })).toBe(1);
    });
  });

  describe('Domain-specific metrics', () => {
    it('should record authentication events', () => {
      recordAuthEvent('login', true, 150);
      recordAuthEvent('login', false, 200);
      recordAuthEvent('signup', true);

      expect(getCounter('auth_login_success_total')).toBe(1);
      expect(getCounter('auth_login_failed_total')).toBe(1);
      expect(getCounter('auth_signup_success_total')).toBe(1);

      const loginHistogram = getHistogram('auth_login_duration_duration');
      expect(loginHistogram?.count).toBe(2);
    });

    it('should record database operations', () => {
      recordDatabaseOperation('user_query', 50, true);
      recordDatabaseOperation('user_query', 100, false);

      expect(getCounter('database_user_query_total', { status: 'success' })).toBe(1);
      expect(getCounter('database_user_query_total', { status: 'error' })).toBe(1);

      const histogram = getHistogram('database_user_query_duration_duration');
      expect(histogram?.count).toBe(2);
    });

    it('should record API requests', () => {
      recordApiRequest('/api/users', 'GET', 200, 120);
      recordApiRequest('/api/users', 'POST', 400, 80);

      expect(getCounter('api_request_total', { 
        endpoint: '/api/users', 
        method: 'GET', 
        status_code: '200' 
      })).toBe(1);

      expect(getCounter('api_request_total', { 
        endpoint: '/api/users', 
        method: 'POST', 
        status_code: '400' 
      })).toBe(1);

      const histogram = getHistogram('api_request_duration_duration');
      expect(histogram?.count).toBe(2);
    });

    it('should record system metrics', () => {
      recordSystemMetrics();

      expect(getGauge('system_memory_heap_used')).toBeGreaterThan(0);
      expect(getGauge('system_memory_heap_total')).toBeGreaterThan(0);
      expect(getGauge('system_uptime')).toBeGreaterThan(0);
    });

    it('should record security events', () => {
      recordSecurityEvent('failed_login', 'high');
      recordSecurityEvent('rate_limit', 'medium');

      expect(getCounter('security_failed_login_total', { severity: 'high' })).toBe(1);
      expect(getCounter('security_rate_limit_total', { severity: 'medium' })).toBe(1);
    });

    it('should record profile operations', () => {
      recordProfileOperation('create', 'expert', true, 300);
      recordProfileOperation('update', 'customer', false, 150);

      expect(getCounter('profile_create_total', { 
        profile_type: 'expert', 
        status: 'success' 
      })).toBe(1);

      expect(getCounter('profile_update_total', { 
        profile_type: 'customer', 
        status: 'error' 
      })).toBe(1);

      const createHistogram = getHistogram('profile_create_duration_duration');
      expect(createHistogram?.count).toBe(1);
    });
  });

  describe('Metrics snapshot', () => {
    it('should return all metrics in snapshot', () => {
      increment('counter1');
      setGauge('gauge1', 100);
      recordHistogram('histogram1', 50);
      recordTimer('timer1', 200);

      const snapshot = snapshotMetrics();
      
      const counters = snapshot.filter(m => m.type === 'counter');
      const gauges = snapshot.filter(m => m.type === 'gauge');
      const histograms = snapshot.filter(m => m.type === 'histogram');
      const timers = snapshot.filter(m => m.type === 'timer');

      expect(counters.length).toBeGreaterThan(0);
      expect(gauges.length).toBeGreaterThan(0);
      expect(histograms.length).toBeGreaterThan(0);
      expect(timers.length).toBeGreaterThan(0);
    });

    it('should reset all metrics', () => {
      increment('test_counter');
      setGauge('test_gauge', 100);
      recordHistogram('test_histogram', 50);

      let snapshot = snapshotMetrics();
      expect(snapshot.length).toBeGreaterThan(0);

      resetMetrics();

      snapshot = snapshotMetrics();
      expect(snapshot.length).toBe(0);
    });
  });
});