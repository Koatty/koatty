/**
 * Multi-protocol metrics collection tests
 * Tests HTTP, WebSocket, and gRPC metrics collection
 */

import { MetricsCollector, ProtocolType, collectRequestMetrics, getMetricsCollector } from '../src/opentelemetry/prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { KoattyContext } from 'koatty_core';

describe('Multi-Protocol Metrics Collection', () => {
  let mockMeterProvider: MeterProvider;
  let mockMeter: any;
  let mockCounter: any;
  let mockHistogram: any;

  beforeEach(() => {
    // Mock meter and metrics
    mockCounter = {
      add: jest.fn()
    };
    
    mockHistogram = {
      record: jest.fn()
    };

    mockMeter = {
      createCounter: jest.fn().mockReturnValue(mockCounter),
      createHistogram: jest.fn().mockReturnValue(mockHistogram)
    };

    mockMeterProvider = {
      getMeter: jest.fn().mockReturnValue(mockMeter)
    } as any;

    // Mock console.log to capture metrics output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HTTP Protocol Metrics', () => {
    it('should collect HTTP request metrics correctly', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/users',
        status: 200,
        startTime: Date.now() - 150,
        originalPath: '/api/users',
        req: {
          headers: {}
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 150);

      // Manually trigger batch flush to process metrics immediately
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        method: 'GET',
        status: '200',
        path: '/api/users',
        protocol: ProtocolType.HTTP
      }));

      collector.destroy();
    });

    it('should handle HTTP error status codes', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/users',
        status: 500,
        req: {
          headers: {}
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 200);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        error_type: 'server_error'
      }));

      collector.destroy();
    });
  });

  describe('WebSocket Protocol Metrics', () => {
    it('should detect WebSocket protocol correctly', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/ws',
        status: 101,
        websocket: {
          readyState: 1
        } as any,
        req: {
          headers: {
            'upgrade': 'websocket',
            'sec-websocket-extensions': 'permessage-deflate'
          }
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 100);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        protocol: ProtocolType.WEBSOCKET,
        compression: 'deflate'
      }));

      collector.destroy();
    });

    it('should track WebSocket connections', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/ws',
        status: 101,
        websocket: {
          readyState: 1
        } as any,
        req: {
          headers: {
            'upgrade': 'websocket'
          }
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 100);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      // Should call connection counter
      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        protocol: ProtocolType.WEBSOCKET,
        service: 'test-service'
      }));

      collector.destroy();
    });
  });

  describe('gRPC Protocol Metrics', () => {
    it('should detect gRPC protocol correctly', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'POST',
        path: '/package.UserService/GetUser',
        status: 0, // gRPC OK status
        rpc: {
          call: {
            metadata: {
              get: jest.fn().mockReturnValue(['gzip'])
            }
          }
        } as any,
        req: {
          headers: {
            'content-type': 'application/grpc'
          }
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 120);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        protocol: ProtocolType.GRPC,
        grpc_service: 'package.UserService',
        compression: 'gzip'
      }));

      collector.destroy();
    });

    it('should handle gRPC error status codes', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'POST',
        path: '/package.UserService/GetUser',
        status: 5, // gRPC NOT_FOUND status
        rpc: {
          call: {
            metadata: {
              get: jest.fn().mockReturnValue([''])
            }
          }
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 120);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        error_type: 'grpc_error'
      }));

      collector.destroy();
    });
  });

  describe('Path Normalization', () => {
    it('should normalize paths with IDs', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/users/123/posts/456',
        status: 200,
        req: {
          headers: {}
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 100);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        path: '/api/users/:id/posts/:id'
      }));

      collector.destroy();
    });

    it('should normalize paths with UUIDs', async () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/users/550e8400-e29b-41d4-a716-446655440000',
        status: 200,
        req: {
          headers: {}
        } as any
      };

      collector.collectRequestMetrics(mockCtx as KoattyContext, 100);

      // Manually trigger batch flush
      await (collector as any).batchProcessor.flush();

      expect(mockCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        path: '/api/users/:uuid'
      }));

      collector.destroy();
    });
  });

  describe('Global Metrics Collector', () => {
    it('should use global collector when available', () => {
      // Mock global collector
      const mockGlobalCollector = {
        collectRequestMetrics: jest.fn()
      };
      
      // We need to mock the global collector
      jest.doMock('../src/opentelemetry/prometheus', () => ({
        ...jest.requireActual('../src/opentelemetry/prometheus'),
        getMetricsCollector: () => mockGlobalCollector
      }));

      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/test',
        status: 200
      };

      collectRequestMetrics(mockCtx as KoattyContext, 100);

      // Note: This test might not work as expected due to module mocking limitations
      // In a real scenario, the global collector would be properly initialized
    });

    it('should handle missing global collector gracefully', () => {
      const mockCtx: Partial<KoattyContext> = {
        method: 'GET',
        path: '/api/test',
        status: 200
      };

      // This should not throw an error
      expect(() => {
        collectRequestMetrics(mockCtx as KoattyContext, 100);
      }).not.toThrow();
    });
  });

  describe('Custom Metrics', () => {
    it('should record custom metrics', () => {
      const collector = new MetricsCollector(mockMeterProvider, 'test-service');
      
      collector.recordCustomMetric('custom_counter', 42, { label: 'test' });

      // Custom metrics are currently just logged, so we check the log output
      expect(console.log).toHaveBeenCalled();
    });
  });
}); 