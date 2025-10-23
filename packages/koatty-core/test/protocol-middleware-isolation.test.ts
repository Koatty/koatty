import { IncomingMessage, ServerResponse } from 'http';
import { KoattyContext, KoattyNext } from '../src/IContext';
import { App } from './app';

describe('Task 1.1: Protocol Middleware Isolation', () => {
  test('should create separate middleware stacks for each protocol', () => {
    const app = new App();
    
    // Register HTTP callback with handler
    const httpHandler = jest.fn(async (ctx: any) => {
      ctx.body = 'HTTP';
    });
    app.callback('http', httpHandler);
    
    // Register gRPC callback with handler
    const grpcHandler = jest.fn(async (ctx: any) => {
      if (ctx.rpc) ctx.rpc.callback(null, {});
    });
    app.callback('grpc', grpcHandler);
    
    // Verify separate stacks exist
    const httpStack = app.getProtocolMiddleware('http');
    const grpcStack = app.getProtocolMiddleware('grpc');
    
    expect(httpStack).toBeDefined();
    expect(grpcStack).toBeDefined();
    expect(httpStack).not.toBe(grpcStack);
    
    // Verify handlers are in correct stacks
    expect(httpStack).toContain(httpHandler);
    expect(grpcStack).toContain(grpcHandler);
    expect(httpStack).not.toContain(grpcHandler);
    expect(grpcStack).not.toContain(httpHandler);
  });
  
  test('should only execute protocol-specific handlers', async () => {
    const app = new App();
    const executionLog: string[] = [];
    
    const httpHandler = async (ctx: any) => {
      executionLog.push('http-handler');
      ctx.body = 'HTTP';
    };
    
    const grpcHandler = async (ctx: any) => {
      executionLog.push('grpc-handler');
    };
    
    const httpCallback = app.callback('http', httpHandler);
    app.callback('grpc', grpcHandler);
    
    // Execute HTTP request
    const req = new IncomingMessage({} as any);
    const res = new ServerResponse({} as any);
    await httpCallback(req, res);
    
    // Verify only HTTP handler executed
    expect(executionLog).toContain('http-handler');
    expect(executionLog).not.toContain('grpc-handler');
  });
  
  test('should return correct middleware statistics', () => {
    const app = new App();
    app.use(async (ctx: any, next: any) => await next());
    
    app.callback('http', async (ctx: any) => {});
    app.callback('grpc', async (ctx: any) => {});
    
    const stats = app.getMiddlewareStats();
    
    expect(stats.global).toBeGreaterThan(0);
    expect(stats.protocols.http).toBeGreaterThan(stats.global);
    expect(stats.protocols.grpc).toBeGreaterThan(stats.global);
  });

  test('should copy global middleware to protocol stacks', () => {
    const app = new App();
    
    // Add global middleware before creating protocol callbacks
    const globalMW = async (ctx: any, next: any) => await next();
    app.use(globalMW);
    
    const initialMWCount = app.middleware.length;
    
    // Create protocol callbacks WITHOUT handlers
    app.callback('http');
    app.callback('grpc');
    
    // Verify both protocols have the global middleware
    const httpStack = app.getProtocolMiddleware('http');
    const grpcStack = app.getProtocolMiddleware('grpc');
    
    expect(httpStack).toBeDefined();
    expect(grpcStack).toBeDefined();
    // Each protocol stack should have at least the global middleware
    expect(httpStack!.length).toBeGreaterThanOrEqual(initialMWCount);
    expect(grpcStack!.length).toBeGreaterThanOrEqual(initialMWCount);
  });

  test('should isolate protocol-specific handlers', () => {
    const app = new App();
    
    const httpHandler = jest.fn();
    const grpcHandler = jest.fn();
    
    app.callback('http', httpHandler);
    app.callback('grpc', grpcHandler);
    
    const httpStack = app.getProtocolMiddleware('http');
    const grpcStack = app.getProtocolMiddleware('grpc');
    
    // HTTP stack contains httpHandler but not grpcHandler
    expect(httpStack).toContain(httpHandler);
    expect(httpStack).not.toContain(grpcHandler);
    
    // gRPC stack contains grpcHandler but not httpHandler
    expect(grpcStack).toContain(grpcHandler);
    expect(grpcStack).not.toContain(httpHandler);
  });
});

