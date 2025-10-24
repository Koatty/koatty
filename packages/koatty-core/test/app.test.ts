/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2024-11-08 09:54:42
 * @LastEditTime: 2024-11-20 16:08:48
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import assert from 'assert';
import request from 'supertest';
import { IncomingMessage, ServerResponse } from 'http';
import { Helper } from 'koatty_lib';
import { App } from "./app";

describe("App", () => {

  let app: App;
  beforeAll(() => {
    app = new App();
    app.use(async (ctx: any) => {
      ctx.body = 'Hello, World!';
    });
  })

  afterAll(async () => {
    // 清理事件监听器
    app.removeAllListeners();
    process.removeAllListeners('warning');
    process.removeAllListeners('unhandledRejection');
    process.removeAllListeners('uncaughtException');
    
    // 清理 Jest mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('metadata operations', () => {
    test("getMetaData - from default app config", async () => {
      assert.equal(app.getMetaData("aa"), "bb")
    })

    test("setMetaData and getMetaData - public metadata", async () => {
      app.setMetaData("publicKey", "publicValue")
      expect(app.getMetaData("publicKey")).toEqual(["publicValue"])
    })

    test("setMetaData and getMetaData - private metadata", () => {
      app.setMetaData("_privateKey", "privateValue");
      expect(app.getMetaData("_privateKey")).toEqual(["privateValue"]);
      expect(Reflect.get(app, "_privateKey")).toBe("privateValue");
    });

    test("getMetaData - non-existent key", () => {
      expect(app.getMetaData("nonExistentKey")).toEqual([]);
    });

    test("getMetaData - private key not found", () => {
      expect(app.getMetaData("_nonExistentPrivate")).toEqual([]);
    });

    test("setMetaData - overwrite existing key", () => {
      app.setMetaData("testKey", "value1");
      expect(app.getMetaData("testKey")).toEqual(["value1"]);
      
      app.setMetaData("testKey", "value2");
      expect(app.getMetaData("testKey")).toEqual(["value2"]);
    });

    test("setMetaData - private key with complex object", () => {
      const complexObj = { nested: { value: 123 }, array: [1, 2, 3] };
      app.setMetaData("_complexPrivate", complexObj);
      expect(app.getMetaData("_complexPrivate")).toEqual([complexObj]);
    });
  });

  describe('middleware operations', () => {
    test("use - add function middleware", () => {
      const initialLength = app.middleware.length;
      app.use(() => {
        return (ctx: any, next: any) => {
          return null;
        }
      });
      expect(app.middleware.length).toBe(initialLength + 1);
    });

    test("use - reject non-function parameter", () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const initialLength = app.middleware.length;
      
      app.use("not a function" as any);
      expect(app.middleware.length).toBe(initialLength);
      
      spy.mockRestore();
    });

    test("useExp - add express-style middleware", () => {
      const initialLength = app.middleware.length;
      const expressMW = (req: any, res: any, next: any) => next();
      
      app.useExp(expressMW);
      expect(app.middleware.length).toBe(initialLength + 1);
    });

    test("useExp - reject non-function parameter", () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const initialLength = app.middleware.length;
      
      app.useExp(123 as any);
      expect(app.middleware.length).toBe(initialLength);
      
      spy.mockRestore();
    });
  });

  describe('configuration operations', () => {
    test("config - simple key", () => {
      const testApp = new App();
      testApp.setMetaData("_configs", { config: { "simpleKey": "simpleValue" } });
      expect(testApp.config("simpleKey")).toBe("simpleValue");
    });

    test("config - nested key", () => {
      const testApp = new App();
      testApp.setMetaData("_configs", { 
        config: { 
          database: { 
            host: "localhost",
            port: 3306
          } 
        } 
      });
      expect(testApp.config("database.host")).toBe("localhost");
      expect(testApp.config("database.port")).toBe(3306);
    });

    test("config - get entire config type", () => {
      const testApp = new App();
      const configData = { key1: "value1", key2: "value2" };
      testApp.setMetaData("_configs", { config: configData });
      expect(testApp.config(undefined as any)).toEqual(configData);
    });

    test("config - different type", () => {
      const testApp = new App();
      testApp.setMetaData("_configs", { 
        middleware: { middlewareKey: "middlewareValue" }
      });
      expect(testApp.config("middlewareKey", "middleware")).toBe("middlewareValue");
    });

    test("config - non-existent key", () => {
      const testApp = new App();
      testApp.setMetaData("_configs", { config: {} });
      expect(testApp.config("nonExistent")).toBeUndefined();
    });

    test("config - non-string key", () => {
      const testApp = new App();
      const configData = { 123: "numberKey" };
      testApp.setMetaData("_configs", { config: configData });
      expect(testApp.config(123 as any)).toBe("numberKey");
    });

    test("config - error handling", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Clear configs to trigger error
      testApp.setMetaData("_configs", null);
      expect(testApp.config("anyKey")).toBeUndefined();
      
      spy.mockRestore();
    });
  });

  describe('context creation', () => {
    test("createContext - HTTP protocol", () => {
      const req = { url: '/test', method: 'GET' } as IncomingMessage;
      const res = { statusCode: 200 } as ServerResponse;
      
      const ctx = app.createContext(req, res, "http");
      expect(ctx.app).toBe(app);
      expect(ctx.protocol).toBe("http");
    });

    test("createContext - WebSocket protocol", () => {
      const req = { url: '/ws' } as any;
      const res = {} as any;
      
      const ctx = app.createContext(req, res, "ws");
      expect(ctx.app).toBe(app);
      expect(ctx.protocol).toBe("ws");
    });

    test("createContext - gRPC protocol", () => {
      const mockMetadata = {
        toJSON: () => ({ 'content-type': 'application/grpc' })
      };
      const req = { 
        url: '/grpc',
        metadata: mockMetadata,
        toJSON: () => ({ url: '/grpc' })
      } as any;
      const res = {} as any;
      
      const ctx = app.createContext(req, res, "grpc");
      expect(ctx.app).toBe(app);
      expect(ctx.protocol).toBe("grpc");
    });

    test("createContext - default protocol", () => {
      const req = { url: '/default' } as IncomingMessage;
      const res = { statusCode: 200 } as ServerResponse;
      
      const ctx = app.createContext(req, res);
      expect(ctx.app).toBe(app);
      expect(ctx.protocol).toBe("http");
    });
  });

  describe('callback and request handling', () => {
    test("callback - basic callback function", () => {
      const callback = app.callback();
      expect(typeof callback).toBe('function');
    });

    test("callback - with custom protocol", () => {
      const callback = app.callback("ws");
      expect(typeof callback).toBe('function');
    });

    test("callback - with request handler", () => {
      const reqHandler = async (ctx: any) => {
        ctx.body = 'Custom handler';
      };
      const callback = app.callback("http", reqHandler);
      expect(typeof callback).toBe('function');
    });

    test("callback - without AsyncLocalStorage", () => {
      const testApp = new App();
      // Disable AsyncLocalStorage
      testApp.ctxStorage = null as any;
      
      const callback = testApp.callback();
      expect(typeof callback).toBe('function');
    });

    test("callback - handles trace configuration", () => {
      const testApp = new App();
      
      // Mock the tracer module to avoid actual tracer setup
      const mockUse = jest.spyOn(testApp, 'use');
      
      testApp.setMetaData("_configs", {
        config: {
          trace: {
            timeout: 5000,
            encoding: 'utf8'
          }
        }
      });
      
      const callback = testApp.callback();
      expect(typeof callback).toBe('function');
      
      // Clean up
      mockUse.mockRestore();
      testApp.removeAllListeners();
    });

    test("listen - mock server start", () => {
      const testApp = new App();
      let listenerCalled = false;
      
      // Mock the server object
      testApp.server = {
        Start: (callback: any) => {
          callback();
          return {} as any;
        }
      } as any;
      
      const result = testApp.listen(() => {
        listenerCalled = true;
      });
      
      expect(listenerCalled).toBe(true);
      expect(result).toBeDefined();
    });

    test("response", async () => {
      const callback = app.callback();
      const agent = request.agent(callback);
      const res = await agent.get('/');
      expect(res.text).toBe('Hello, World!');
      expect(res.status).toBe(200);
      // Force close any open handles
      await new Promise(resolve => setImmediate(resolve));
    }, 15000);

    test("response - with middleware stack", async () => {
      const testApp = new App();
      testApp.use(async (ctx: any, next: any) => {
        ctx.customHeader = 'middleware-added';
        await next();
      });
      testApp.use(async (ctx: any) => {
        ctx.body = `Response with ${ctx.customHeader}`;
      });

      const callback = testApp.callback();
      const agent = request.agent(callback);
      const res = await agent.get('/');
      expect(res.text).toBe('Response with middleware-added');
      expect(res.status).toBe(200);
      
      // 清理测试应用的事件监听器
      testApp.removeAllListeners();
      await new Promise(resolve => setImmediate(resolve));
    }, 15000);

    test("handleRequest - private method via callback", async () => {
      const testApp = new App();
      let errorHandled = false;
      
      testApp.use(async (ctx: any) => {
        // Force an error in middleware
        throw new Error("Middleware error");
      });
      
      const callback = testApp.callback();
      
      // Create mock request/response
      const mockReq = { url: '/test', method: 'GET' } as any;
      const mockRes = { 
        statusCode: 200,
        end: () => {},
        on: () => {},
        once: () => {},
        emit: () => {},
        finished: false
      } as any;
      
      try {
        await callback(mockReq, mockRes);
      } catch (error) {
        errorHandled = true;
      }
      
      // The error should be handled by the onFinished callback
      expect(mockRes.statusCode).toBe(404); // Default status set by handleRequest
    });
  });

  describe('error handling', () => {
    test("captureError - sets up error listeners", () => {
      const testApp = new App();
      
      // Check that error listeners are set up
      expect(testApp.listenerCount('error')).toBeGreaterThan(0);
      expect(process.listenerCount('warning')).toBeGreaterThan(0);
      expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
      expect(process.listenerCount('uncaughtException')).toBeGreaterThan(0);
    });

    test("use - error handling for invalid middleware", () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = app.use(null as any);
      expect(result).toBeUndefined();
      
      spy.mockRestore();
    });

    test("config - handles errors gracefully", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by setting invalid configs
      testApp.setMetaData("_configs", undefined);
      const result = testApp.config("test");
      expect(result).toBeUndefined();
      
      spy.mockRestore();
    });

    test("config - catch and log errors", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error in config method by making getMetaData throw
      const originalGetMetaData = testApp.getMetaData;
      testApp.getMetaData = () => {
        throw new Error("Test error");
      };
      
      const result = testApp.config("anyKey");
      expect(result).toBeNull();
      
      // Restore original method
      testApp.getMetaData = originalGetMetaData;
      spy.mockRestore();
    });

    test("captureError - handles prevented errors", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create an error with prevent property
      const preventedError = new Error("Prevented error");
      (preventedError as any).prevent = true;
      
      // Emit error - should not be logged due to isPrevent check
      testApp.emit('error', preventedError);
      
      spy.mockRestore();
      testApp.removeAllListeners();
    });

    test("captureError - handles unhandled rejection", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a prevented rejection
      const preventedRejection = new Error("Prevented rejection");
      (preventedRejection as any).prevent = true;
      
      // Simulate unhandled rejection
      process.emit('unhandledRejection', preventedRejection as any, Promise.resolve());
      
      spy.mockRestore();
      testApp.removeAllListeners();
    });

    test("captureError - handles uncaught exception", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a prevented exception
      const preventedException = new Error("Prevented exception");
      (preventedException as any).prevent = true;
      
      // Simulate uncaught exception
      process.emit('uncaughtException', preventedException);
      
      spy.mockRestore();
      testApp.removeAllListeners();
    });

    test("captureError - handles EADDRINUSE error", () => {
      const testApp = new App();
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      // Create EADDRINUSE error
      const addrInUseError = new Error("EADDRINUSE: address already in use");
      
      expect(() => {
        process.emit('uncaughtException', addrInUseError);
      }).toThrow('process.exit called');
      
      spy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('initialization', () => {
    test("constructor - sets up application properties", () => {
      const testApp = new App();
      // Since our test App class doesn't accept constructor options,
      // we test the default values from the base Koatty class
      expect(testApp.name).toBe("KoattyApplication project");
      expect(testApp.version).toBe("0.0.1");
      expect(typeof testApp.appDebug).toBe("boolean");
      expect(typeof testApp.appPath).toBe("string");
      expect(typeof testApp.rootPath).toBe("string");
      expect(typeof testApp.koattyPath).toBe("string");
    });

    test("constructor - default values", () => {
      const testApp = new App();
      expect(testApp.name).toBe('KoattyApplication project');
      expect(testApp.version).toBe("0.0.1");
      expect(testApp.appDebug).toBeFalsy();
    });

    test("constructor - environment detection", () => {
      // Test debug environment
      const originalExecArgv = process.execArgv;
      process.execArgv = ['--debug'];
      
      const debugApp = new App();
      expect(debugApp.env).toBe("development");
      
      process.execArgv = originalExecArgv;
    });

    test("init - can be overridden", () => {
      let initCalled = false;
      class TestApp extends App {
        init() {
          initCalled = true;
        }
      }
      
      new TestApp();
      expect(initCalled).toBe(true);
    });
  });

  describe('advanced scenarios', () => {
    test("metadata operations with special characters", () => {
      app.setMetaData("key-with-dashes", "value1");
      app.setMetaData("key_with_underscores", "value2");
      app.setMetaData("key.with.dots", "value3");
      
      expect(app.getMetaData("key-with-dashes")).toEqual(["value1"]);
      expect(app.getMetaData("key_with_underscores")).toEqual(["value2"]);
      expect(app.getMetaData("key.with.dots")).toEqual(["value3"]);
    });

    test("config with deep nested objects", () => {
      const testApp = new App();
      testApp.setMetaData("_configs", {
        config: {
          level1: {
            level2: {
              level3: "deepValue"
            }
          }
        }
      });
      
      expect(testApp.config("level1.level2")).toEqual({ level3: "deepValue" });
    });

    test("middleware order preservation", async () => {
      const testApp = new App();
      const order: number[] = [];
      
      testApp.use(async (ctx: any, next: any) => {
        order.push(1);
        await next();
        order.push(4);
      });
      
      testApp.use(async (ctx: any, next: any) => {
        order.push(2);
        await next();
        order.push(3);
      });
      
      testApp.use(async (ctx: any) => {
        ctx.body = 'OK';
      });

      const callback = testApp.callback();
      const agent = request.agent(callback);
      const res = await agent.get('/').expect(200);
      expect(order).toEqual([1, 2, 3, 4]);
      
      // 清理测试应用的事件监听器  
      testApp.removeAllListeners();
      await new Promise(resolve => setImmediate(resolve));
    }, 15000);
  });
})