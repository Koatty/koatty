/**
 * @ Author: Richen
 * @ Modified: 2025-10-24
 * @ Description: Koa 3.0 集成测试
 */

import Koa from 'koa';
import { App } from './app';
import { KoattyContext } from '../src/Context';

describe('Koa 3.0 Integration Tests', () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  afterEach(() => {
    // 清理事件监听器
    app.removeAllListeners();
  });

  describe('Application Initialization', () => {
    test('should create Koatty instance', () => {
      expect(app).toBeInstanceOf(Koa);
      expect(app).toBeInstanceOf(App);
    });

    test('should have required properties', () => {
      expect(app.env).toBeDefined();
      expect(app.context).toBeDefined();
      expect(app.request).toBeDefined();
      expect(app.response).toBeDefined();
    });

    test('should support Koa 3.0 features', () => {
      // Koa 3.0 使用原生Promise
      expect(app.use).toBeInstanceOf(Function);
      expect(app.callback).toBeInstanceOf(Function);
    });
  });

  describe('Middleware Registration', () => {
    test('should register middleware using app.use()', () => {
      const middleware = async (ctx: any, next: any) => {
        await next();
      };
      
      app.use(middleware);
      expect(app.middleware.length).toBeGreaterThan(0);
    });

    test('should execute middleware in correct order', async () => {
      const order: number[] = [];

      app.use(async (ctx: any, next: any) => {
        order.push(1);
        await next();
        order.push(4);
      });

      app.use(async (ctx: any, next: any) => {
        order.push(2);
        await next();
        order.push(3);
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn(), end: jest.fn() };
      
      const callback = app.callback();
      await new Promise<void>((resolve) => {
        callback(mockReq as any, mockRes as any);
        setTimeout(() => {
          expect(order).toEqual([1, 2, 3, 4]);
          resolve();
        }, 100);
      });
    });

    test('should handle async middleware', async () => {
      let executed = false;

      app.use(async (ctx: any, next: any) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        executed = true;
        await next();
      });

      expect(executed).toBe(false);
      
      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn(), end: jest.fn() };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(executed).toBe(true);
    });
  });

  describe('Context Creation', () => {
    test('should create context with createContext()', () => {
      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn() };
      
      const ctx = app.createContext(mockReq as any, mockRes as any);
      
      expect(ctx).toBeDefined();
      expect(ctx.req).toBe(mockReq);
      expect(ctx.res).toBe(mockRes);
      expect(ctx.app).toBe(app);
    });

    test('should have Koa context properties', () => {
      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn() };
      
      const ctx = app.createContext(mockReq as any, mockRes as any);
      
      expect(ctx.request).toBeDefined();
      expect(ctx.response).toBeDefined();
      expect(ctx.state).toBeDefined();
    });

    test('should support Koatty context extensions', () => {
      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn() };
      
      const ctx = app.createContext(mockReq as any, mockRes as any) as KoattyContext;
      
      // Koatty 扩展的属性
      expect(typeof ctx.getMetaData).toBe('function');
      expect(typeof ctx.setMetaData).toBe('function');
    });
  });

  describe('Request Handling', () => {
    test('should return callback function', () => {
      const callback = app.callback();
      expect(callback).toBeInstanceOf(Function);
    });

    test('should handle request with callback', (done) => {
      app.use(async (ctx: any) => {
        ctx.body = 'Hello Koa 3';
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { 
        setHeader: jest.fn(),
        end: jest.fn((data) => {
          expect(data).toContain('Hello Koa 3');
          done();
        })
      };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
    });
  });

  describe('Error Handling', () => {
    test('should emit error event on middleware error', (done) => {
      app.use(async () => {
        throw new Error('Test error');
      });

      app.on('error', (err: Error) => {
        expect(err.message).toBe('Test error');
        done();
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { 
        statusCode: 500,
        setHeader: jest.fn(),
        end: jest.fn()
      };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
    });

    test('should handle errors gracefully', (done) => {
      app.use(async (ctx: any) => {
        ctx.throw(400, 'Bad Request');
      });

      app.on('error', (err: any) => {
        expect(err.status).toBe(400);
        expect(err.message).toBe('Bad Request');
        done();
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { 
        statusCode: 400,
        setHeader: jest.fn(),
        end: jest.fn()
      };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
    });
  });

  describe('Koa 3.0 Specific Features', () => {
    test('should work with Node.js 18+ async features', async () => {
      let result = '';

      app.use(async (ctx: any, next: any) => {
        // 使用 Node.js 18+ 的 async/await
        result = await Promise.resolve('async-result');
        await next();
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn(), end: jest.fn() };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(result).toBe('async-result');
    });

    test('should handle multiple async operations', async () => {
      const operations: string[] = [];

      app.use(async (ctx: any, next: any) => {
        operations.push('start');
        await Promise.all([
          Promise.resolve('op1'),
          Promise.resolve('op2'),
          Promise.resolve('op3')
        ]);
        operations.push('end');
        await next();
      });

      const mockReq = { headers: {}, url: '/', method: 'GET' };
      const mockRes = { setHeader: jest.fn(), end: jest.fn() };
      
      const callback = app.callback();
      callback(mockReq as any, mockRes as any);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(operations).toEqual(['start', 'end']);
    });
  });
});

