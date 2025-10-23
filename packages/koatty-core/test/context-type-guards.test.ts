import { IncomingMessage, ServerResponse } from 'http';
import {
  assertHttpContext,
  assertGrpcContext,
  assertWebSocketContext,
  assertGraphQLContext,
  httpMiddleware,
  grpcMiddleware,
  wsMiddleware,
  graphqlMiddleware,
  HttpContext,
  GrpcContext,
  WebSocketContext,
  GraphQLContext,
  IRpcServerCall,
  IRpcServerCallback
} from '../src/IContext';
import { App } from './app';

describe('Task 2.2: Context Type Guards', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  // Helper to create mock gRPC call
  const createMockGrpcCall = (): IRpcServerCall<any, any> => {
    return {
      metadata: {
        toJSON: jest.fn().mockReturnValue({ key: 'value' }),
        clone: jest.fn().mockReturnThis(),
        add: jest.fn(),
      },
      request: { foo: 'bar' },
      sendMetadata: jest.fn(),
      handler: { path: 'testPath' },
    } as unknown as IRpcServerCall<any, any>;
  };

  const createMockGrpcCallback = (): IRpcServerCallback<any> => {
    return jest.fn();
  };

  describe('assertHttpContext', () => {
    test('should pass for HTTP context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      expect(() => assertHttpContext(ctx)).not.toThrow();
    });

    test('should pass for HTTPS context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'https');

      expect(() => assertHttpContext(ctx)).not.toThrow();
    });

    test('should throw for non-HTTP context', () => {
      const call = createMockGrpcCall();
      const callback = createMockGrpcCallback();
      const ctx = app.createContext(call, callback, 'grpc');

      expect(() => assertHttpContext(ctx)).toThrow('Expected HTTP/HTTPS context, got grpc');
    });
  });

  describe('assertGrpcContext', () => {
    test('should pass for gRPC context with rpc property', () => {
      const call = createMockGrpcCall();
      const callback = createMockGrpcCallback();
      const ctx = app.createContext(call, callback, 'grpc');

      expect(() => assertGrpcContext(ctx)).not.toThrow();
    });

    test('should throw for HTTP context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      expect(() => assertGrpcContext(ctx)).toThrow('Expected gRPC context with rpc property, got http');
    });
  });

  describe('assertWebSocketContext', () => {
    test('should pass for WebSocket context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'ws');

      expect(() => assertWebSocketContext(ctx)).not.toThrow();
    });

    test('should throw for HTTP context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      expect(() => assertWebSocketContext(ctx)).toThrow('Expected WebSocket context with websocket property, got http');
    });
  });

  describe('assertGraphQLContext', () => {
    test('should pass for GraphQL context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'graphql');

      expect(() => assertGraphQLContext(ctx)).not.toThrow();
    });

    test('should throw for HTTP context', () => {
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      expect(() => assertGraphQLContext(ctx)).toThrow('Expected GraphQL context with graphql property, got http');
    });
  });

  describe('Type-safe middleware helpers', () => {
    test('httpMiddleware should enforce HttpContext type', async () => {
      const executionLog: string[] = [];
      
      const handler = httpMiddleware(async (ctx: HttpContext, next) => {
        // TypeScript should infer ctx as HttpContext
        executionLog.push(`protocol: ${ctx.protocol}`);
        expect(['http', 'https']).toContain(ctx.protocol);
        await next();
      });

      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      await handler(ctx, async () => {});
      expect(executionLog).toContain('protocol: http');
    });

    test('httpMiddleware should throw for non-HTTP context', async () => {
      const handler = httpMiddleware(async (ctx: HttpContext, next) => {
        await next();
      });

      const call = createMockGrpcCall();
      const callback = createMockGrpcCallback();
      const ctx = app.createContext(call, callback, 'grpc');

      await expect(handler(ctx, async () => {})).rejects.toThrow('Expected HTTP/HTTPS context, got grpc');
    });

    test('grpcMiddleware should enforce GrpcContext type', async () => {
      const executionLog: string[] = [];
      
      const handler = grpcMiddleware(async (ctx: GrpcContext, next) => {
        // TypeScript should infer ctx as GrpcContext
        executionLog.push(`protocol: ${ctx.protocol}`);
        expect(ctx.protocol).toBe('grpc');
        expect(ctx.rpc).toBeDefined();
        await next();
      });

      const call = createMockGrpcCall();
      const callback = createMockGrpcCallback();
      const ctx = app.createContext(call, callback, 'grpc');

      await handler(ctx, async () => {});
      expect(executionLog).toContain('protocol: grpc');
    });

    test('wsMiddleware should enforce WebSocketContext type', async () => {
      const executionLog: string[] = [];
      
      const handler = wsMiddleware(async (ctx: WebSocketContext, next) => {
        executionLog.push(`protocol: ${ctx.protocol}`);
        expect(['ws', 'wss']).toContain(ctx.protocol);
        expect(ctx.websocket).toBeDefined();
        await next();
      });

      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'ws');

      await handler(ctx, async () => {});
      expect(executionLog).toContain('protocol: ws');
    });

    test('graphqlMiddleware should enforce GraphQLContext type', async () => {
      const executionLog: string[] = [];
      
      const handler = graphqlMiddleware(async (ctx: GraphQLContext, next) => {
        executionLog.push(`protocol: ${ctx.protocol}`);
        expect(ctx.protocol).toBe('graphql');
        expect(ctx.graphql).toBeDefined();
        await next();
      });

      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'graphql');

      await handler(ctx, async () => {});
      expect(executionLog).toContain('protocol: graphql');
    });
  });

  describe('Type inference in middleware', () => {
    test('should provide correct type inference for HTTP context', async () => {
      const handler = httpMiddleware(async (ctx, next) => {
        // TypeScript should know ctx.protocol is 'http' | 'https'
        const protocol: 'http' | 'https' = ctx.protocol;
        expect(protocol).toBe('http');
        
        // TypeScript should know requestParam exists
        if (ctx.requestParam) {
          const params = ctx.requestParam();
        }
        
        await next();
      });

      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');

      await handler(ctx, async () => {});
    });

    test('should provide correct type inference for gRPC context', async () => {
      const handler = grpcMiddleware(async (ctx, next) => {
        // TypeScript should know ctx.protocol is 'grpc'
        const protocol: 'grpc' = ctx.protocol;
        expect(protocol).toBe('grpc');
        
        // TypeScript should know rpc is non-nullable
        const call = ctx.rpc.call;
        expect(call).toBeDefined();
        
        await next();
      });

      const call = createMockGrpcCall();
      const callback = createMockGrpcCallback();
      const ctx = app.createContext(call, callback, 'grpc');

      await handler(ctx, async () => {});
    });

    test('should provide correct type inference for WebSocket context', async () => {
      const handler = wsMiddleware(async (ctx, next) => {
        // TypeScript should know ctx.protocol is 'ws' | 'wss'
        const protocol: 'ws' | 'wss' = ctx.protocol;
        expect(protocol).toBe('ws');
        
        // TypeScript should know websocket is non-nullable
        const ws = ctx.websocket;
        expect(ws).toBeDefined();
        
        await next();
      });

      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'ws');

      await handler(ctx, async () => {});
    });
  });
});

