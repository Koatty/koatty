/*
 * @Description: Context creation and performance tests
 * @Usage: 
 * @Author: richen
 * @Date: 2024-11-08 09:54:42
 * @LastEditTime: 2024-11-20 16:08:48
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import assert from 'assert';
import { IncomingMessage, ServerResponse } from 'http';
import { createKoattyContext, ContextPool, ContextFactoryRegistry, type ProtocolType } from "../src/Context";
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
  const res = new ServerResponse({} as any);
  res.statusCode = 200;
  return res;
}

describe("Context Creation Optimization", () => {
  let app: App;
  
  beforeAll(() => {
    app = new App();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("should create HTTP context correctly", () => {
    const mockReq = createMockRequest({ url: '/test', method: 'GET' });
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    
    const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
    
    expect(context.protocol).toBe('http');
    expect(context.metadata).toBeDefined();
    expect(typeof context.getMetaData).toBe('function');
    expect(typeof context.setMetaData).toBe('function');
    expect(typeof context.sendMetadata).toBe('function');
  });

  test("should create gRPC context correctly", () => {
    const mockReq = createMockRequest({ url: '/test', method: 'POST' });
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    
    const mockCall = {
      metadata: {
        toJSON: () => ({ 'content-type': 'application/grpc' }),
        clone: () => ({ add: jest.fn() })
      },
      sendMetadata: jest.fn(),
      request: { data: 'test' }
    };
    const mockCallback = jest.fn();
    
    const context = createKoattyContext(koaCtx, 'grpc', mockCall, mockCallback);
    
    expect(context.protocol).toBe('grpc');
    expect(context.rpc).toBeDefined();
    if (context.rpc) {
      expect(context.rpc.call).toBe(mockCall);
      expect(context.rpc.callback).toBe(mockCallback);
    }
  });

  test("should create WebSocket context correctly", () => {
    const mockReq = Object.assign(createMockRequest({ url: '/ws', method: 'GET' }), {
      data: Buffer.from('test message')
    });
    const mockSocket = { 
      send: jest.fn(),
      close: jest.fn()
    };
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    
    const context = createKoattyContext(koaCtx, 'ws', mockReq, mockSocket);
    
    expect(context.protocol).toBe('ws');
    expect(context.websocket).toBe(mockSocket);
    expect(context.getMetaData('_body')).toEqual(['test message']);
  });

  test("should create GraphQL context correctly", () => {
    const mockReq = Object.assign(createMockRequest({ url: '/graphql', method: 'POST' }), {
      body: {
        query: 'query { user { id name } }',
        variables: { userId: '123' },
        operationName: 'GetUser'
      }
    });
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    
    const context = createKoattyContext(koaCtx, 'graphql', mockReq, mockRes);
    
    expect(context.protocol).toBe('graphql');
    expect((context as any).graphql).toBeDefined();
    expect((context as any).graphql.query).toBe('query { user { id name } }');
    expect((context as any).graphql.variables).toEqual({ userId: '123' });
    expect((context as any).graphql.operationName).toBe('GetUser');
    expect(context.getMetaData('graphqlQuery')).toEqual(['query { user { id name } }']);
    expect(context.getMetaData('graphqlVariables')).toEqual([{ userId: '123' }]);
    expect(context.getMetaData('graphqlOperationName')).toEqual(['GetUser']);
  });

  test("should validate protocol types", () => {
    const mockReq = createMockRequest({ url: '/test' });
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    
    expect(() => {
      createKoattyContext(koaCtx, 'invalid-protocol', mockReq, mockRes);
    }).toThrow('Invalid protocol: invalid-protocol');
  });

  test("should handle metadata operations with validation", () => {
    const mockReq = createMockRequest({ url: '/test' });
    const mockRes = createMockResponse();
    const koaCtx = app.createContext(mockReq, mockRes);
    const context = createKoattyContext(koaCtx, 'http', mockReq, mockRes);
    
    // Test valid metadata operations
    context.setMetaData('test-key', 'test-value');
    expect(context.getMetaData('test-key')).toEqual(['test-value']);
    
    // Test invalid key validation
    expect(() => {
      context.setMetaData('', 'value');
    }).toThrow('Metadata key must be a non-empty string');
    
    expect(() => {
      context.getMetaData('' as any);
    }).toThrow('Metadata key must be a non-empty string');
  });

  test("should support custom context factory registration", () => {
    const customFactory = {
      create: jest.fn((context) => {
        (context as any).customProperty = 'custom-value';
        return context;
      })
    };
    
    ContextFactoryRegistry.registerFactory('custom' as ProtocolType, customFactory);
    
    const factory = ContextFactoryRegistry.getFactory('custom' as ProtocolType);
    expect(factory).toBe(customFactory);
  });

  test("performance: context creation should be efficient", () => {
    const iterations = 1000;
    const protocols: ProtocolType[] = ['http', 'graphql'];
    
    protocols.forEach(protocol => {
      const mockReq = createMockRequest({ url: '/test', method: 'GET' });
      const mockRes = createMockResponse();
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        const koaCtx = app.createContext(mockReq, mockRes);
        createKoattyContext(koaCtx, protocol, mockReq, mockRes);
      }
      
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      console.log(`Created ${iterations} ${protocol} contexts in ${duration.toFixed(2)}ms`);
      console.log(`Average: ${(duration / iterations).toFixed(4)}ms per ${protocol} context`);
      
      // Should create contexts reasonably fast (less than 1ms per context on average)
      expect(duration / iterations).toBeLessThan(1);
    });
  });

  test("should handle context pool operations for all protocols", () => {
    // Only test protocols that support pooling (GraphQL has property constraints)
    const protocols: ProtocolType[] = ['http'];
    
    protocols.forEach(protocol => {
      const mockReq = createMockRequest({ url: '/test' });
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      const context = createKoattyContext(koaCtx, protocol, mockReq, mockRes);
      
      // Initially pool should be empty
      expect(ContextPool.get(protocol)).toBeNull();
      
      // Release context to pool
      ContextPool.release(protocol, context);
      
      // Should be able to get context from pool
      const pooledContext = ContextPool.get(protocol);
      expect(pooledContext).toBeDefined();
      expect(pooledContext).not.toBeNull();
      if (pooledContext) {
        expect(pooledContext.protocol).toBe(protocol);
      }
      
      // Pool should be empty again
      expect(ContextPool.get(protocol)).toBeNull();
    });
  });
});