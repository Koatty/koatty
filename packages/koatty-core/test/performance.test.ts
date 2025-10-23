/*
 * @Description: Performance tests for Koatty Core
 * @Usage: npm test -- test/performance.test.ts
 * @Author: richen
 * @Date: 2024-11-20 16:08:48
 * @LastEditTime: 2024-11-20 16:08:48
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { IncomingMessage, ServerResponse } from 'http';
import { createKoattyContext, ContextPool, type ProtocolType } from "../src/Context";
import { KoattyMetadata } from "../src/Metadata";
import { App } from "./app";

// Mock helper functions
function createMockRequest(options: { url?: string; method?: string } = {}): IncomingMessage {
  const req = new IncomingMessage({} as any);
  req.url = options.url || '/test';
  req.method = options.method || 'GET';
  req.headers = {};
  return req;
}

function createMockResponse(): ServerResponse {
  const res = new ServerResponse(new IncomingMessage({} as any));
  return res;
}

describe("Performance Tests", () => {
  let app: App;
  
  beforeAll(() => {
    app = new App();
    // Initialize context pool
    ContextPool.initialize();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Context Creation Performance", () => {
    test("should create HTTP contexts efficiently", () => {
      const iterations = 10000;
      const mockReq = createMockRequest({ url: '/test', method: 'GET' });
      const mockRes = createMockResponse();
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const koaCtx = app.createContext(mockReq, mockRes);
        const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
        
        // Simulate some work
        context.setMetaData('test', 'value');
        context.getMetaData('test');
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      console.log(`Created ${iterations} HTTP contexts in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / iterations).toFixed(4)}ms per context`);
      
      // Should be faster than 0.1ms per context
      expect(duration / iterations).toBeLessThan(0.1);
    });

    test("should create GraphQL contexts efficiently", () => {
      const iterations = 5000;
      const mockReq = createMockRequest({ url: '/graphql', method: 'POST' });
      const mockRes = createMockResponse();
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const koaCtx = app.createContext(mockReq, mockRes);
        const context = createKoattyContext(koaCtx, 'graphql', {
          body: {
            query: 'query { test }',
            variables: { id: i }
          }
        }, mockRes);
        
        // Simulate some work
        context.setMetaData('operation', 'query');
        context.getMetaData('graphqlQuery');
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      console.log(`Created ${iterations} GraphQL contexts in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / iterations).toFixed(4)}ms per context`);
      
      // Should be faster than 0.2ms per context
      expect(duration / iterations).toBeLessThan(0.2);
    });
  });

  describe("Metadata Performance", () => {
    test("should handle metadata operations efficiently", () => {
      const iterations = 100000;
      const metadata = new KoattyMetadata();
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        metadata.set(`key${i % 100}`, `value${i}`);
        metadata.get(`key${i % 100}`);
        if (i % 10 === 0) {
          metadata.getMap(); // Test cached map
        }
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      console.log(`Performed ${iterations} metadata operations in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / iterations * 1000).toFixed(4)}μs per operation`);
      
      // Should be faster than 0.01ms per operation
      expect(duration / iterations).toBeLessThan(0.01);
    });

    test("should cache getMap() results efficiently", () => {
      const metadata = new KoattyMetadata();
      
      // Set up some data
      for (let i = 0; i < 100; i++) {
        metadata.set(`key${i}`, `value${i}`);
      }
      
      const iterations = 10000;
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        metadata.getMap(); // Should use cached result
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      console.log(`Performed ${iterations} getMap() calls in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / iterations * 1000).toFixed(4)}μs per call`);
      
      // Cached calls should be very fast
      expect(duration / iterations).toBeLessThan(0.001);
    });
  });

  describe("Context Pool Performance", () => {
    test("should pool and reuse contexts efficiently", () => {
      const iterations = 1000;
      const contexts: any[] = [];
      
      // Create contexts
      const createStartTime = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const koaCtx = app.createContext(mockReq, mockRes);
        const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
        contexts.push(context);
      }
      const createEndTime = process.hrtime.bigint();
      
      // Release contexts to pool
      const releaseStartTime = process.hrtime.bigint();
      contexts.forEach((context: any) => {
        ContextPool.release('http', context);
      });
      const releaseEndTime = process.hrtime.bigint();
      
      // Get contexts from pool
      const getStartTime = process.hrtime.bigint();
      const pooledContexts: any[] = [];
      for (let i = 0; i < iterations; i++) {
        const context = ContextPool.get('http');
        if (context) {
          pooledContexts.push(context);
        }
      }
      const getEndTime = process.hrtime.bigint();
      
      const createDuration = Number(createEndTime - createStartTime) / 1000000;
      const releaseDuration = Number(releaseEndTime - releaseStartTime) / 1000000;
      const getDuration = Number(getEndTime - getStartTime) / 1000000;
      
      console.log(`Context creation: ${createDuration.toFixed(2)}ms`);
      console.log(`Context release: ${releaseDuration.toFixed(2)}ms`);
      console.log(`Context retrieval: ${getDuration.toFixed(2)}ms`);
      console.log(`Pool stats:`, ContextPool.getStats());
      
      // Pool operations should be very fast
      expect(releaseDuration / iterations).toBeLessThan(0.01);
      expect(getDuration / iterations).toBeLessThan(0.01);
      expect(pooledContexts.length).toBeGreaterThan(0);
    });
  });

  describe("Memory Usage", () => {
    test("should not leak memory during context creation", () => {
      const initialMemory = process.memoryUsage();
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const koaCtx = app.createContext(mockReq, mockRes);
        const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
        
        // Simulate some work
        context.setMetaData('test', 'value');
        context.getMetaData('test');
        
        // Release to pool if possible
        ContextPool.release('http', context as any);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
      
      // Heap growth should be reasonable (less than 100MB for 10k contexts)
      expect(heapGrowth).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe("Concurrent Performance", () => {
    test("should handle concurrent context creation efficiently", async () => {
      const concurrency = 100;
      const iterationsPerWorker = 100;
      
      const workers = Array.from({ length: concurrency }, async () => {
        const startTime = process.hrtime.bigint();
        
        for (let i = 0; i < iterationsPerWorker; i++) {
          const mockReq = createMockRequest();
          const mockRes = createMockResponse();
          const koaCtx = app.createContext(mockReq, mockRes);
          const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
          
          context.setMetaData('worker', 'test');
          context.getMetaData('worker');
        }
        
        const endTime = process.hrtime.bigint();
        return Number(endTime - startTime) / 1000000;
      });
      
      const startTime = process.hrtime.bigint();
      const durations = await Promise.all(workers);
      const endTime = process.hrtime.bigint();
      
      const totalDuration = Number(endTime - startTime) / 1000000;
      const avgWorkerDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const totalOperations = concurrency * iterationsPerWorker;
      
      console.log(`Concurrent test: ${totalOperations} operations in ${totalDuration.toFixed(2)}ms`);
      console.log(`Average worker duration: ${avgWorkerDuration.toFixed(2)}ms`);
      console.log(`Throughput: ${(totalOperations / totalDuration * 1000).toFixed(0)} ops/sec`);
      
      // Should handle at least 10k ops/sec
      expect(totalOperations / totalDuration * 1000).toBeGreaterThan(10000);
    });
  });
}); 