/**
 * @Description: Test cases for Prometheus metrics exporter
 * @Author: richen
 * @Date: 2025-04-13 15:00:00
 * @License: BSD (3-Clause)
 */
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { initPrometheusExporter } from '../src/opentelemetry/prometheus';
import { Koatty } from 'koatty_core';

const mockMeterProvider = {
  getMeter: jest.fn().mockReturnValue({
    createCounter: jest.fn(),
    createHistogram: jest.fn()
  }),
  addMetricReader: jest.fn()
};

jest.mock('@opentelemetry/sdk-metrics', () => ({
  MeterProvider: jest.fn().mockImplementation(() => mockMeterProvider)
}));

jest.mock('@opentelemetry/exporter-prometheus', () => ({
  PrometheusExporter: jest.fn().mockImplementation(() => ({
    startServer: jest.fn()
  }))
}));

describe('prometheus.ts', () => {
  const mockApp = {
    name: 'testApp',
    version: '1.0.0',
    env: 'test'
  } as unknown as Koatty;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('should return null when not in production and no metrics endpoint', () => {
    const options = {
      metricsConf: {}
    };
    
    const result = initPrometheusExporter(mockApp, options);
    expect(result).toBeNull();
  });

  it('should initialize when in production environment', () => {
    process.env.NODE_ENV = 'production';
    const options = {
      metricsConf: {
        metricsEndpoint: '/metrics'
      }
    };
    
    const result = initPrometheusExporter(mockApp, options);
    expect(result).toEqual(mockMeterProvider);
  });

  it('should initialize with custom metrics endpoint', () => {
    const options = {
      metricsConf: {
        metricsEndpoint: '/custom-metrics',
        metricsPort: 9090
      }
    };
    
    const result = initPrometheusExporter(mockApp, options);
    expect(result).toEqual(mockMeterProvider);
  });

  it('should register default metrics', () => {
    process.env.NODE_ENV = 'production';
    const options = {
      metricsConf: {
        metricsEndpoint: '/metrics'
      }
    };
    
    const result = initPrometheusExporter(mockApp, options);
    expect(result).toEqual(mockMeterProvider);
    
    // Verify default metrics are registered
    const mockMeter = (MeterProvider as jest.Mock).mock.results[0].value.getMeter();
    
    expect(mockMeter.createCounter).toHaveBeenCalledWith('requests_total', {
      description: 'Total requests across all protocols',
      unit: '1'
    });
    
    expect(mockMeter.createCounter).toHaveBeenCalledWith('errors_total', {
      description: 'Total errors across all protocols',
      unit: '1'
    });
    
    expect(mockMeter.createHistogram).toHaveBeenCalledWith('response_time_seconds', {
      description: 'Response time in seconds across all protocols',
      unit: 's',
      advice: { explicitBucketBoundaries: [0.1, 0.5, 1, 2.5, 5, 10] }
    });
    
    expect(mockMeter.createCounter).toHaveBeenCalledWith('websocket_connections_total', {
      description: 'Total WebSocket connections',
      unit: '1'
    });
  });

  it('should handle invalid metrics port', () => {
    const options = {
      metricsConf: {
        metricsEndpoint: '/metrics',
        metricsPort: 'invalid' as any
      }
    };
    
    const result = initPrometheusExporter(mockApp, options);
    expect(result).toEqual(mockMeterProvider);
  });
});
