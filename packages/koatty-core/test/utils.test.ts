/*
 * @Description: Utils functions tests
 * @Usage: 
 * @Author: richen
 * @Date: 2024-11-20 16:30:00
 * @LastEditTime: 2024-11-20 16:30:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import assert from 'assert';
import EventEmitter from 'events';
import { IncomingMessage, ServerResponse } from 'http';
import { parseExp, asyncEvent, isPrevent, bindProcessEvent } from "../src/Utils";
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

describe("Utils Functions", () => {
  let app: App;
  
  beforeAll(() => {
    app = new App();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("parseExp", () => {
    test("should handle express middleware with 2 parameters (req, res)", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      
      const expressMw = jest.fn((req: any, res: any) => {
        expect(req).toBe(koaCtx.req);
        expect(res).toBe(koaCtx.res);
      });
      
      const koaMw = parseExp(expressMw);
      const next = jest.fn();
      
      const result = await koaMw(koaCtx, next);
      
      expect(expressMw).toHaveBeenCalledWith(koaCtx.req, koaCtx.res);
      expect(next).toHaveBeenCalled();
    });

    test("should handle express middleware with 3 parameters (req, res, next)", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      
      const expressMw = jest.fn((req: any, res: any, next: any) => {
        expect(req).toBe(koaCtx.req);
        expect(res).toBe(koaCtx.res);
        next(); // Call next without error
      });
      
      const koaMw = parseExp(expressMw);
      const next = jest.fn().mockResolvedValue('next-result');
      
      const result = await koaMw(koaCtx, next);
      
      expect(expressMw).toHaveBeenCalledWith(koaCtx.req, koaCtx.res, expect.any(Function));
      expect(next).toHaveBeenCalled();
      expect(result).toBe('next-result');
    });

    test("should handle express middleware with error in callback", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      
      const testError = new Error('Express middleware error');
      const expressMw = jest.fn((req: any, res: any, next: any) => {
        next(testError); // Call next with error
      });
      
      const koaMw = parseExp(expressMw);
      const next = jest.fn();
      
      await expect(koaMw(koaCtx, next)).rejects.toThrow('Express middleware error');
      expect(next).not.toHaveBeenCalled();
    });

    test("should handle express middleware with 4+ parameters", async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      
      const expressMw = jest.fn((req: any, res: any, next: any, extra: any) => {
        next(); // Call next without error
      });
      
      const koaMw = parseExp(expressMw);
      const next = jest.fn().mockResolvedValue('next-result');
      
      const result = await koaMw(koaCtx, next);
      
      expect(expressMw).toHaveBeenCalledWith(koaCtx.req, koaCtx.res, expect.any(Function));
      expect(result).toBe('next-result');
    });
  });

  describe("asyncEvent", () => {
    test("should execute all listeners asynchronously", async () => {
      const emitter = new EventEmitter();
      const eventName = 'test-event';
      
      const listener1 = jest.fn().mockResolvedValue('result1');
      const listener2 = jest.fn().mockResolvedValue('result2');
      const listener3 = jest.fn().mockResolvedValue('result3');
      
      emitter.on(eventName, listener1);
      emitter.on(eventName, listener2);
      emitter.on(eventName, listener3);
      
      expect(emitter.listenerCount(eventName)).toBe(3);
      
      await asyncEvent(emitter, eventName);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
      expect(emitter.listenerCount(eventName)).toBe(0);
    });

    test("should handle event with no listeners", async () => {
      const emitter = new EventEmitter();
      const eventName = 'non-existent-event';
      
      expect(emitter.listenerCount(eventName)).toBe(0);
      
      await asyncEvent(emitter, eventName);
      
      expect(emitter.listenerCount(eventName)).toBe(0);
    });

    test("should handle non-function listeners", async () => {
      const emitter = new EventEmitter();
      const eventName = 'test-event';
      
      const functionListener = jest.fn().mockResolvedValue('result');
      const nonFunctionListener = 'not-a-function';
      
      emitter.on(eventName, functionListener);
      // Manually add non-function listener (this is unusual but possible)
      (emitter as any)._events[eventName] = [functionListener, nonFunctionListener];
      
      await asyncEvent(emitter, eventName);
      
      expect(functionListener).toHaveBeenCalled();
    });

    test("should handle async function errors gracefully", async () => {
      const emitter = new EventEmitter();
      const eventName = 'test-event';
      
      const errorListener = jest.fn().mockRejectedValue(new Error('Async error'));
      emitter.on(eventName, errorListener);
      
      await expect(asyncEvent(emitter, eventName)).rejects.toThrow('Async error');
      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe("isPrevent", () => {
    test("should return true for prevent error", () => {
      const preventError = new Error('PREVENT_NEXT_PROCESS');
      
      const result = isPrevent(preventError);
      
      expect(result).toBe(true);
    });

    test("should return false for regular error", () => {
      const regularError = new Error('Regular error message');
      
      const result = isPrevent(regularError);
      
      expect(result).toBe(false);
    });

    test("should return false for non-error objects", () => {
      const notAnError = { message: 'PREVENT_NEXT_PROCESS' };
      
      const result = isPrevent(notAnError as Error);
      
      expect(result).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(isPrevent(null as any)).toBe(false);
      expect(isPrevent(undefined as any)).toBe(false);
    });

    test("should return false for error with different message", () => {
      const differentError = new Error('DIFFERENT_MESSAGE');
      
      const result = isPrevent(differentError);
      
      expect(result).toBe(false);
    });
  });

  describe("bindProcessEvent", () => {
    let originalListeners: any[];
    
    beforeEach(() => {
      // Store original process listeners to restore later
      originalListeners = process.listeners('beforeExit').slice();
    });
    
    afterEach(() => {
      // Clean up added listeners
      process.removeAllListeners('beforeExit');
      // Restore original listeners
      originalListeners.forEach(listener => {
        process.addListener('beforeExit', listener);
      });
    });

    test("should bind event listeners to process with default target event", () => {
      const emitter = new EventEmitter();
      const originEventName = 'test-origin-event';
      
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      emitter.on(originEventName, listener1);
      emitter.on(originEventName, listener2);
      
      expect(emitter.listenerCount(originEventName)).toBe(2);
      const initialProcessListeners = process.listenerCount('beforeExit');
      
      bindProcessEvent(emitter, originEventName);
      
      expect(emitter.listenerCount(originEventName)).toBe(0);
      expect(process.listenerCount('beforeExit')).toBe(initialProcessListeners + 2);
    });

    test("should bind event listeners to process with custom target event", () => {
      const emitter = new EventEmitter();
      const originEventName = 'test-origin-event';
      const targetEventName = 'exit';
      
      const listener = jest.fn();
      emitter.on(originEventName, listener);
      
      const initialProcessListeners = process.listenerCount(targetEventName);
      
      bindProcessEvent(emitter, originEventName, targetEventName);
      
      expect(emitter.listenerCount(originEventName)).toBe(0);
      expect(process.listenerCount(targetEventName)).toBe(initialProcessListeners + 1);
      
      // Clean up
      process.removeAllListeners(targetEventName);
    });

    test("should handle event with no listeners", () => {
      const emitter = new EventEmitter();
      const originEventName = 'non-existent-event';
      
      expect(emitter.listenerCount(originEventName)).toBe(0);
      const initialProcessListeners = process.listenerCount('beforeExit');
      
      bindProcessEvent(emitter, originEventName);
      
      expect(emitter.listenerCount(originEventName)).toBe(0);
      expect(process.listenerCount('beforeExit')).toBe(initialProcessListeners);
    });

    test("should handle non-function listeners", () => {
      const emitter = new EventEmitter();
      const originEventName = 'test-event';
      
      const functionListener = jest.fn();
      const nonFunctionListener = 'not-a-function';
      
      emitter.on(originEventName, functionListener);
      // Manually add non-function listener
      (emitter as any)._events[originEventName] = [functionListener, nonFunctionListener];
      
      const initialProcessListeners = process.listenerCount('beforeExit');
      
      bindProcessEvent(emitter, originEventName);
      
      expect(emitter.listenerCount(originEventName)).toBe(0);
      // Only function listeners should be added to process
      expect(process.listenerCount('beforeExit')).toBe(initialProcessListeners + 1);
    });
  });

  describe("Integration tests", () => {
    test("should work together in a typical workflow", async () => {
      // Create an express-style middleware
      const expressMw = jest.fn((req: any, res: any, next: any) => {
        req.customProperty = 'added-by-express';
        next();
      });
      
      // Convert to koa middleware
      const koaMw = parseExp(expressMw);
      
      // Create context
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const koaCtx = app.createContext(mockReq, mockRes);
      
      // Execute middleware
      const next = jest.fn();
      await koaMw(koaCtx, next);
      
      expect((koaCtx.req as any).customProperty).toBe('added-by-express');
      expect(next).toHaveBeenCalled();
      
      // Test prevent error
      const preventError = new Error('PREVENT_NEXT_PROCESS');
      expect(isPrevent(preventError)).toBe(true);
      
      // Test async event execution
      const emitter = new EventEmitter();
      const listener = jest.fn().mockResolvedValue('done');
      emitter.on('cleanup', listener);
      
      await asyncEvent(emitter, 'cleanup');
      expect(listener).toHaveBeenCalled();
      expect(emitter.listenerCount('cleanup')).toBe(0);
    });
  });
}); 