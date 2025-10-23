import { IncomingMessage, ServerResponse } from 'http';
import { 
  isHttpProtocol, 
  isGrpcProtocol, 
  isWebSocketProtocol,
  isGraphQLProtocol,
  matchProtocol,
  protocolMiddleware,
  protocolRouter
} from '../src/Utils';
import { App } from './app';

describe('Task 1.3: Protocol Helpers', () => {
  describe('Type Guards', () => {
    test('isHttpProtocol should correctly identify HTTP/HTTPS', () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      const httpCtx = app.createContext(req, res, 'http');
      const httpsCtx = app.createContext(req, res, 'https');
      const gqlCtx = app.createContext(req, res, 'graphql');
      
      expect(isHttpProtocol(httpCtx)).toBe(true);
      expect(isHttpProtocol(httpsCtx)).toBe(true);
      expect(isHttpProtocol(gqlCtx)).toBe(false);
    });
    
    test('isGrpcProtocol should check both protocol and rpc property', () => {
      const app = new App();
      const mockCall = {
        metadata: { toJSON: () => ({}), clone: () => ({ add: jest.fn() }) },
        sendMetadata: jest.fn(),
        request: {}
      };
      
      const grpcCtx = app.createContext(mockCall, jest.fn(), 'grpc');
      const httpCtx = app.createContext(new IncomingMessage({} as any), 
                                       new ServerResponse({} as any), 'http');
      
      expect(isGrpcProtocol(grpcCtx)).toBe(true);
      expect(isGrpcProtocol(httpCtx)).toBe(false);
    });

    test('isWebSocketProtocol should check protocol and websocket property', () => {
      const app = new App();
      const mockSocket = { send: jest.fn(), close: jest.fn() };
      const mockReq = Object.assign(new IncomingMessage({} as any), {
        data: Buffer.from('test')
      });
      
      const wsCtx = app.createContext(mockReq, mockSocket, 'ws');
      const httpCtx = app.createContext(new IncomingMessage({} as any),
                                       new ServerResponse({} as any), 'http');
      
      expect(isWebSocketProtocol(wsCtx)).toBe(true);
      expect(isWebSocketProtocol(httpCtx)).toBe(false);
    });

    test('isGraphQLProtocol should identify GraphQL protocol', () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      const gqlCtx = app.createContext(req, res, 'graphql');
      const httpCtx = app.createContext(req, res, 'http');
      
      expect(isGraphQLProtocol(gqlCtx)).toBe(true);
      expect(isGraphQLProtocol(httpCtx)).toBe(false);
    });

    test('matchProtocol should check if protocol is in array', () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      const httpCtx = app.createContext(req, res, 'http');
      
      expect(matchProtocol(httpCtx, ['http', 'https'])).toBe(true);
      expect(matchProtocol(httpCtx, ['grpc', 'ws'])).toBe(false);
    });
  });
  
  describe('protocolMiddleware wrapper', () => {
    test('should return function that checks protocol', () => {
      const innerMW = jest.fn(async (ctx, next) => await next());
      const wrappedMW = protocolMiddleware('http', innerMW);
      
      expect(typeof wrappedMW).toBe('function');
    });
    
    test('should execute on matching protocol', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'http');
      
      let executed = false;
      const innerMW = async (ctx: any, next: any) => {
        executed = true;
        await next();
      };
      
      const wrappedMW = protocolMiddleware('http', innerMW);
      await wrappedMW(ctx, async () => {});
      
      expect(executed).toBe(true);
    });
    
    test('should skip on non-matching protocol', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      const ctx = app.createContext(req, res, 'graphql');
      
      let executed = false;
      const innerMW = async (ctx: any, next: any) => {
        executed = true;
        await next();
      };
      
      const wrappedMW = protocolMiddleware('http', innerMW);
      await wrappedMW(ctx, async () => {});
      
      expect(executed).toBe(false);
    });
    
    test('should support multiple protocols', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      let executed = false;
      const innerMW = async (ctx: any, next: any) => {
        executed = true;
        await next();
      };
      
      const wrappedMW = protocolMiddleware(['http', 'https'], innerMW);
      
      // Test HTTP
      const httpCtx = app.createContext(req, res, 'http');
      await wrappedMW(httpCtx, async () => {});
      expect(executed).toBe(true);
      
      // Test HTTPS
      executed = false;
      const httpsCtx = app.createContext(req, res, 'https');
      await wrappedMW(httpsCtx, async () => {});
      expect(executed).toBe(true);
      
      // Test GraphQL (should not execute)
      executed = false;
      const gqlCtx = app.createContext(req, res, 'graphql');
      await wrappedMW(gqlCtx, async () => {});
      expect(executed).toBe(false);
    });
  });
  
  describe('protocolRouter', () => {
    test('should route to correct handler based on protocol', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      let httpExecuted = false;
      let gqlExecuted = false;
      
      const router = protocolRouter({
        'http': async (ctx, next) => {
          httpExecuted = true;
          await next();
        },
        'graphql': async (ctx, next) => {
          gqlExecuted = true;
          await next();
        },
      });
      
      // Test HTTP
      const httpCtx = app.createContext(req, res, 'http');
      await router(httpCtx, async () => {});
      expect(httpExecuted).toBe(true);
      expect(gqlExecuted).toBe(false);
      
      // Test GraphQL
      httpExecuted = false;
      gqlExecuted = false;
      const gqlCtx = app.createContext(req, res, 'graphql');
      await router(gqlCtx, async () => {});
      expect(httpExecuted).toBe(false);
      expect(gqlExecuted).toBe(true);
    });
    
    test('should call default handler for unmatched protocols', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      let httpExecuted = false;
      let defaultExecuted = false;
      
      const router = protocolRouter(
        {
          'http': async (ctx, next) => {
            httpExecuted = true;
            await next();
          },
        },
        async (ctx, next) => {
          defaultExecuted = true;
          await next();
        }
      );
      
      // Test GraphQL protocol (no handler for it)
      const gqlCtx = app.createContext(req, res, 'graphql');
      await router(gqlCtx, async () => {});
      
      expect(httpExecuted).toBe(false);
      expect(defaultExecuted).toBe(true);
    });

    test('should skip if no handler matches and no default', async () => {
      const app = new App();
      const req = new IncomingMessage({} as any);
      const res = new ServerResponse({} as any);
      
      let nextCalled = false;
      
      const router = protocolRouter({
        'http': async (ctx, next) => {
          await next();
        },
      });
      
      // Test GraphQL protocol (no handler for it)
      const gqlCtx = app.createContext(req, res, 'graphql');
      await router(gqlCtx, async () => {
        nextCalled = true;
      });
      
      expect(nextCalled).toBe(true);
    });
  });
});

