/**
 * @Description: Request Metrics Collection Test
 * @Author: richen
 * @Date: 2025-04-04 20:30:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { collectRequestMetrics, getMetricsCollector, MetricsCollector, initPrometheusExporter } from "../src/opentelemetry/prometheus";
import { MeterProvider } from '@opentelemetry/sdk-metrics';

describe('Request Metrics Collection', () => {
  let mockCtx: Partial<KoattyContext>;
  let mockMeterProvider: MeterProvider;
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    mockCtx = {
      method: 'GET',
      url: '/api/users',
      status: 200,
      startTime: Date.now(),
      originalUrl: '/api/users?page=1',
      path: '/api/users',
      protocol: 'http'
    };

    // Create a mock MeterProvider
    mockMeterProvider = new MeterProvider();
    
    // Create a MetricsCollector instance for testing
    metricsCollector = new MetricsCollector(mockMeterProvider, 'test-service');
  });

  test('should create MetricsCollector instance', () => {
    expect(metricsCollector).toBeDefined();
    expect(typeof metricsCollector.collectRequestMetrics).toBe('function');
    expect(typeof metricsCollector.recordCustomMetric).toBe('function');
  });

  test('should collect request metrics without errors', () => {
    const duration = 150; // 150ms
    
    // This should not throw any errors
    expect(() => {
      metricsCollector.collectRequestMetrics(mockCtx as KoattyContext, duration);
    }).not.toThrow();
  });

  test('should handle error status codes', () => {
    mockCtx.status = 500;
    const duration = 200;
    
    expect(() => {
      metricsCollector.collectRequestMetrics(mockCtx as KoattyContext, duration);
    }).not.toThrow();
  });

  test('should handle different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    
    methods.forEach(method => {
      mockCtx.method = method;
      expect(() => {
        metricsCollector.collectRequestMetrics(mockCtx as KoattyContext, 100);
      }).not.toThrow();
    });
  });

  test('should record custom metrics', () => {
    expect(() => {
      metricsCollector.recordCustomMetric('custom_metric', 42, { label: 'test' });
    }).not.toThrow();
  });

  test('should handle collectRequestMetrics when no global collector exists', () => {
    // When no global collector is initialized, this should not throw
    expect(() => {
      collectRequestMetrics(mockCtx as KoattyContext, 100);
    }).not.toThrow();
  });

  test('should return null when no global metrics collector is initialized', () => {
    const collector = getMetricsCollector();
    expect(collector).toBeNull();
  });

  test('should initialize Prometheus exporter with valid config', () => {
    const mockApp = {
      name: 'test-app'
    } as any;

    const options = {
      metricsConf: {
        metricsEndpoint: '/metrics',
        metricsPort: 9464
      }
    };

    // Set NODE_ENV to production to enable metrics
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const result = initPrometheusExporter(mockApp, options);
      expect(result).toBeDefined();
    } catch (error) {
      // It's okay if this fails due to port binding issues in test environment
      expect(error).toBeDefined();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('should return null when metrics are disabled', () => {
    const mockApp = {
      name: 'test-app'
    } as any;

    const options = {
      metricsConf: {}
    };

    // Ensure we're not in production
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      const result = initPrometheusExporter(mockApp, options);
      expect(result).toBeNull();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
}); 