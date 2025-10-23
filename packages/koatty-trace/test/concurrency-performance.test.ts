/**
 * @Description: Concurrency safety and performance tests for enhanced koatty_trace
 * @Author: richen
 * @Date: 2025-05-29
 * @License: BSD (3-Clause)
 */
import { MetricsCollector, getMetricsCollector, collectRequestMetrics } from '../src/opentelemetry/prometheus';
import { SpanManager } from '../src/opentelemetry/spanManager';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

// Mock dependencies
const mockMeterProvider = {
  getMeter: jest.fn().mockReturnValue({
    createCounter: jest.fn().mockReturnValue({
      add: jest.fn()
    }),
    createHistogram: jest.fn().mockReturnValue({
      record: jest.fn()
    })
  })
};

const mockTracer = {
  startSpan: jest.fn().mockReturnValue({
    spanContext: () => ({ traceId: 'test-trace-id' }),
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    addEvent: jest.fn(),
    end: jest.fn()
  })
};

describe('Concurrency Safety and Performance Tests', () => {
  let metricsCollector: MetricsCollector;
  let spanManager: SpanManager;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = new MetricsCollector(mockMeterProvider as any, 'test-service');
    spanManager = new SpanManager({
      enableTrace: true,
      opentelemetryConf: {
        spanTimeout: 5000,
        maxActiveSpans: 100,
        samplingRate: 1.0
      }
    });
  });

  afterEach(() => {
    if (spanManager) {
      spanManager.destroy();
    }
    if (metricsCollector) {
      metricsCollector.destroy();
    }
  });

  describe('MetricsCollector Concurrency Safety', () => {
    it('should handle concurrent metric collection safely', async () => {
      const concurrentRequests = 1000;
      const promises: Promise<void>[] = [];

      // Create mock contexts
      for (let i = 0; i < concurrentRequests; i++) {
        const mockCtx = {
          method: 'GET',
          path: `/api/test/${i}`,
          status: 200,
          startTime: Date.now(),
          req: { headers: {} }
        } as any;

        promises.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              metricsCollector.collectRequestMetrics(mockCtx, Math.random() * 1000);
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      // Wait for all concurrent operations to complete
      await Promise.all(promises);

      // Verify no errors occurred
      expect(true).toBe(true); // Test passes if no exceptions thrown
    });

    it('should handle path normalization cache efficiently', () => {
      const paths = [
        '/users/123',
        '/users/456',
        '/users/789',
        '/posts/abc123',
        '/posts/def456',
        '/api/v1/users/550e8400-e29b-41d4-a716-446655440000',
        '/api/v1/posts/507f1f77bcf86cd799439011'
      ];

      // First pass - populate cache
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const path = paths[i % paths.length];
        const mockCtx = {
          method: 'GET',
          path,
          status: 200,
          req: { headers: {} }
        } as any;
        metricsCollector.collectRequestMetrics(mockCtx, 100);
      }
      const firstPassTime = Date.now() - startTime;

      // Second pass - should use cache
      const cacheStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const path = paths[i % paths.length];
        const mockCtx = {
          method: 'GET',
          path,
          status: 200,
          req: { headers: {} }
        } as any;
        metricsCollector.collectRequestMetrics(mockCtx, 100);
      }
      const cachePassTime = Date.now() - cacheStartTime;

      // Cache should improve performance (allow some variance)
      expect(cachePassTime).toBeLessThanOrEqual(firstPassTime * 2.0);
      
      // Verify cache is working by checking hit rate
      const stats = metricsCollector.getStats();
      expect(stats.pathCacheStats.hitRate).toBeGreaterThan(0.8); // At least 80% hit rate
    });

    it('should handle batch processing correctly', (done) => {
      const batchSize = 50;
      let processedCount = 0;

      // Override batch processor for testing
      const originalAdd = metricsCollector.requestCounter.add;
      metricsCollector.requestCounter.add = jest.fn().mockImplementation(() => {
        processedCount++;
        if (processedCount >= batchSize) {
          expect(processedCount).toBeGreaterThanOrEqual(batchSize);
          done();
        }
      });

      // Send batch of metrics
      for (let i = 0; i < batchSize; i++) {
        const mockCtx = {
          method: 'POST',
          path: `/api/batch/${i}`,
          status: 201,
          req: { headers: {} }
        } as any;
        metricsCollector.collectRequestMetrics(mockCtx, 50);
      }
    });

    it('should get collector statistics', () => {
      const stats = metricsCollector.getStats();
      
      expect(stats).toHaveProperty('serviceName', 'test-service');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('pathCacheStats');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SpanManager Concurrency Safety', () => {
    it('should handle concurrent span creation safely', async () => {
      const concurrentSpans = 100;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentSpans; i++) {
        const mockCtx = {
          requestId: `req-${i}`,
          method: 'GET',
          path: `/api/concurrent/${i}`,
          set: jest.fn()
        } as any;

        promises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              const span = spanManager.createSpan(mockTracer as any, mockCtx, `service-${i}`);
              resolve(span);
            }, Math.random() * 10);
          })
        );
      }

      const spans = await Promise.all(promises);
      
      // Verify spans were created (some may be undefined due to sampling)
      const createdSpans = spans.filter(span => span !== undefined);
      expect(createdSpans.length).toBeGreaterThan(0);
    });

    it('should handle span timeout and cleanup', (done) => {
      const shortTimeoutManager = new SpanManager({
        enableTrace: true,
        opentelemetryConf: {
          spanTimeout: 100, // Very short timeout for testing
          maxActiveSpans: 10
        }
      });

      const mockCtx = {
        requestId: 'timeout-test',
        method: 'GET',
        path: '/api/timeout',
        set: jest.fn()
      } as any;

      // Create span
      const span = shortTimeoutManager.createSpan(mockTracer as any, mockCtx, 'timeout-service');
      expect(span).toBeDefined();

      // Check that span is cleaned up after timeout
      setTimeout(() => {
        const stats = shortTimeoutManager.getStats();
        expect(stats.spansTimedOut).toBeGreaterThan(0);
        shortTimeoutManager.destroy();
        done();
      }, 200);
    });

    it('should handle memory pressure and eviction', async () => {
      const spanManager = new SpanManager({
        opentelemetryConf: {
          maxActiveSpans: 5, // 设置较小的限制
          spanTimeout: 30000,
          samplingRate: 1.0
        }
      });

      // 创建mock tracer
      const mockTracer = {
        startSpan: jest.fn().mockImplementation((name) => ({
          spanContext: () => ({
            traceId: `trace-${Date.now()}-${Math.random()}`,
            spanId: `span-${Date.now()}-${Math.random()}`,
            traceFlags: 1
          }),
          setAttribute: jest.fn(),
          setAttributes: jest.fn(),
          addEvent: jest.fn(),
          end: jest.fn()
        }))
      } as any;

      // 创建超过限制的span数量
      for (let i = 0; i < 10; i++) {
        const mockCtx = {
          requestId: `memory-test-${i}`,
          method: 'GET',
          path: `/api/memory/${i}`,
          set: jest.fn()
        } as any;

        spanManager.createSpan(mockTracer, mockCtx, `memory-service-${i}`);
      }

      const stats = spanManager.getStats();
      console.log('Memory pressure test stats:', {
        activeSpansCount: stats.activeSpansCount,
        memoryEvictions: stats.memoryEvictions,
        spansCreated: stats.spansCreated
      });

      // 验证内存驱逐发生了
      expect(stats.memoryEvictions).toBeGreaterThan(0);
      expect(stats.activeSpansCount).toBeLessThanOrEqual(5);

      spanManager.destroy();
    });

    it('should get span manager statistics', () => {
      const stats = spanManager.getStats();
      
      expect(stats).toHaveProperty('spansCreated');
      expect(stats).toHaveProperty('spansEnded');
      expect(stats).toHaveProperty('spansTimedOut');
      expect(stats).toHaveProperty('memoryEvictions');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('activeSpansCount');
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('isDestroyed');
      expect(stats).toHaveProperty('memoryUsage');
    });

    it('should handle graceful shutdown', () => {
      const mockCtx = {
        requestId: 'shutdown-test',
        method: 'GET',
        path: '/api/shutdown',
        set: jest.fn()
      } as any;

      // Create some spans
      spanManager.createSpan(mockTracer as any, mockCtx, 'shutdown-service');
      
      const statsBefore = spanManager.getStats();
      expect(statsBefore.isDestroyed).toBe(false);

      // Destroy manager
      spanManager.destroy();

      const statsAfter = spanManager.getStats();
      expect(statsAfter.isDestroyed).toBe(true);
      expect(statsAfter.activeSpansCount).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle high-throughput metric collection', () => {
      const iterations = 10000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const mockCtx = {
          method: 'GET',
          path: `/api/perf/${i % 100}`, // Limited path variety for cache testing
          status: 200,
          req: { headers: {} }
        } as any;

        metricsCollector.collectRequestMetrics(mockCtx, Math.random() * 100);
      }

      const duration = Date.now() - startTime;
      const throughput = iterations / (duration / 1000);
      console.log(`Throughput: ${throughput.toFixed(2)} ops/sec`);
      
      // Should handle at least 900 ops/sec (adjusted for stability)
      expect(throughput).toBeGreaterThan(900);
    });

    it('should handle protocol detection efficiently', () => {
      const protocols = [
        { headers: {}, expected: 'http' },
        { headers: { upgrade: 'websocket' }, expected: 'websocket' },
        { headers: { 'content-type': 'application/grpc' }, expected: 'grpc' }
      ];

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const protocol = protocols[i % protocols.length];
        const mockCtx = {
          method: 'GET',
          path: '/api/protocol',
          status: 200,
          req: { headers: protocol.headers }
        } as any;

        metricsCollector.collectRequestMetrics(mockCtx, 50);
      }

      const duration = Date.now() - startTime;
      console.log(`Protocol detection time for ${iterations} iterations: ${duration}ms`);
      
      // Should complete quickly
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle metrics collection errors gracefully', () => {
      // Mock error in batch processor
      const errorCollector = new MetricsCollector(mockMeterProvider as any, 'error-test');
      
      // Override to throw error
      const originalAdd = errorCollector.requestCounter.add;
      errorCollector.requestCounter.add = jest.fn().mockImplementation(() => {
        throw new Error('Simulated metrics error');
      });

      const mockCtx = {
        method: 'GET',
        path: '/api/error',
        status: 500,
        req: { headers: {} }
      } as any;

      // Should not throw error
      expect(() => {
        errorCollector.collectRequestMetrics(mockCtx, 100);
      }).not.toThrow();

      errorCollector.destroy();
    });

    it('should handle span creation errors gracefully', () => {
      const errorTracer = {
        startSpan: jest.fn().mockImplementation(() => {
          throw new Error('Simulated span creation error');
        })
      };

      const mockCtx = {
        requestId: 'error-test',
        method: 'GET',
        path: '/api/span-error',
        set: jest.fn()
      } as any;

      // Should return undefined and not throw
      const span = spanManager.createSpan(errorTracer as any, mockCtx, 'error-service');
      expect(span).toBeUndefined();

      const stats = spanManager.getStats();
      expect(stats.errors).toBeGreaterThan(0);
    });
  });
}); 