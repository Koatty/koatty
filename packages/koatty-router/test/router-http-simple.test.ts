/*
 * @Description: Simple HTTP Router Tests
 * @Usage: Test HTTP router basic functionality
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { HttpRouter } from '../src/router/http';

// Mock dependencies
jest.mock('@koa/router', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    all: jest.fn(),
    routes: jest.fn().mockReturnValue(jest.fn()),
    allowedMethods: jest.fn().mockReturnValue(jest.fn())
  }));
});

jest.mock('koatty_container', () => ({
  IOC: {
    getClass: jest.fn(),
    getInsByClass: jest.fn()
  }
}));

jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    Error: jest.fn(),
    Debug: jest.fn(),
    Warn: jest.fn()
  }
}));

jest.mock('koatty_lib', () => ({
  isEmpty: jest.fn((val) => !val || val === ''),
  isFunction: jest.fn((val) => typeof val === 'function')
}));

jest.mock('../src/payload/payload', () => ({
  payload: jest.fn().mockReturnValue(jest.fn())
}));

jest.mock('../src/utils/inject', () => ({
  injectRouter: jest.fn(),
  injectParamMetaData: jest.fn()
}));

jest.mock('../src/utils/path', () => ({
  parsePath: jest.fn((path) => path)
}));

jest.mock('../src/utils/handler', () => ({
  Handler: jest.fn()
}));

describe('HTTP Router Simple Tests', () => {
  let mockApp: any;
  let router: HttpRouter;

  beforeEach(() => {
    mockApp = {
      use: jest.fn(),
      env: 'test'
    };
    
    router = new HttpRouter(mockApp, { protocol: 'http', prefix: '/api' });
    jest.clearAllMocks();
  });

  describe('Router Creation', () => {
    it('should create HTTP router instance', () => {
      expect(router).toBeDefined();
      expect(router).toBeInstanceOf(HttpRouter);
      expect(router.protocol).toBe('http');
    });

    it('should create router with default options', () => {
      const defaultRouter = new HttpRouter(mockApp);
      expect(defaultRouter).toBeDefined();
      expect(defaultRouter.protocol).toBe('http');
    });

    it('should handle custom protocol', () => {
      const customRouter = new HttpRouter(mockApp, { protocol: 'https', prefix: '/v1' });
      expect(customRouter.protocol).toBe('https');
    });

    it('should initialize with empty routerMap', () => {
      const routerMap = router.ListRouter();
      expect(routerMap).toBeInstanceOf(Map);
      expect(routerMap.size).toBe(0);
    });
  });

  describe('SetRouter Method', () => {
    it('should set GET router', () => {
      const impl = {
        path: '/test',
        method: 'GET',
        implementation: jest.fn()
      };

      router.SetRouter('test-route', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('test-route')).toBe(true);
      expect(routerMap.get('test-route')).toBe(impl);
    });

    it('should set POST router', () => {
      const impl = {
        path: '/users',
        method: 'POST',
        implementation: jest.fn()
      };

      router.SetRouter('create-user', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('create-user')).toBe(true);
    });

    it('should set PUT router', () => {
      const impl = {
        path: '/users/:id',
        method: 'PUT',
        implementation: jest.fn()
      };

      router.SetRouter('update-user', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('update-user')).toBe(true);
    });

    it('should set DELETE router', () => {
      const impl = {
        path: '/users/:id',
        method: 'DELETE',
        implementation: jest.fn()
      };

      router.SetRouter('delete-user', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('delete-user')).toBe(true);
    });

    it('should handle all other methods with router.all', () => {
      const impl = {
        path: '/custom',
        method: 'CUSTOM',
        implementation: jest.fn()
      };

      router.SetRouter('custom-route', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('custom-route')).toBe(true);
    });

    it('should handle empty path by returning early', () => {
      const impl = {
        path: '',
        method: 'GET',
        implementation: jest.fn()
      };

      router.SetRouter('empty-path', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('empty-path')).toBe(false);
    });

    it('should handle undefined path', () => {
      const impl = {
        path: undefined,
        method: 'GET',
        implementation: jest.fn()
      };

      router.SetRouter('undefined-path', impl);
      
      const routerMap = router.ListRouter();
      expect(routerMap.has('undefined-path')).toBe(false);
    });
  });

  describe('ListRouter Method', () => {
    it('should return empty map initially', () => {
      const routerMap = router.ListRouter();
      expect(routerMap).toBeInstanceOf(Map);
      expect(routerMap.size).toBe(0);
    });

    it('should return all registered routes', () => {
      const impl1 = { path: '/test1', method: 'GET', implementation: jest.fn() };
      const impl2 = { path: '/test2', method: 'POST', implementation: jest.fn() };

      router.SetRouter('route1', impl1);
      router.SetRouter('route2', impl2);
      
      const routerMap = router.ListRouter();
      expect(routerMap.size).toBe(2);
      expect(routerMap.has('route1')).toBe(true);
      expect(routerMap.has('route2')).toBe(true);
    });
  });

  describe('LoadRouter Method', () => {
    it('should handle empty controller list', async () => {
      await expect(router.LoadRouter(mockApp, [])).resolves.not.toThrow();
    });

    it('should handle LoadRouter with mocked dependencies', async () => {
      const mockList = ['TestController'];
      
      // Setup mocks
      const { IOC } = require('koatty_container');
      const { injectRouter, injectParamMetaData } = require('../src/utils/inject');
      
      IOC.getClass.mockReturnValue(class TestController {});
      injectRouter.mockReturnValue({
        testMethod: {
          method: 'testMethod',
          path: '/test',
          requestMethod: 'GET',
          middleware: []
        }
      });
      injectParamMetaData.mockReturnValue({
        testMethod: {}
      });

      await expect(router.LoadRouter(mockApp, mockList)).resolves.not.toThrow();
    });

    it('should handle LoadRouter when injectRouter returns null', async () => {
      const mockList = ['TestController'];
      
      const { IOC } = require('koatty_container');
      const { injectRouter } = require('../src/utils/inject');
      
      IOC.getClass.mockReturnValue(class TestController {});
      injectRouter.mockReturnValue(null);

      await expect(router.LoadRouter(mockApp, mockList)).resolves.not.toThrow();
    });

    it('should handle errors in LoadRouter gracefully', async () => {
      const mockList = ['TestController'];
      
      const { IOC } = require('koatty_container');
      IOC.getClass.mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(router.LoadRouter(mockApp, mockList)).resolves.not.toThrow();
    });
  });

  describe('Router Options', () => {
    it('should merge options correctly', () => {
      const options = { protocol: 'https', prefix: '/v1', custom: 'value' };
      const customRouter = new HttpRouter(mockApp, options);
      
      expect(customRouter.options).toEqual(expect.objectContaining(options));
    });

    it('should handle payload options', () => {
      const options = { 
        protocol: 'http', 
        prefix: '/api',
        payload: { 
          limit: '10mb', 
          encoding: 'utf8' as BufferEncoding,
          extTypes: {},
          multiples: false,
          keepExtensions: false
        }
      };
      
      const payloadRouter = new HttpRouter(mockApp, options);
      expect(payloadRouter.options.payload).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive HTTP methods', () => {
      const methods = ['get', 'GET', 'Post', 'PUT', 'delete', 'PATCH'];
      
      methods.forEach((method, index) => {
        const impl = {
          path: `/test-${index}`,
          method,
          implementation: jest.fn()
        };
        
        expect(() => {
          router.SetRouter(`route-${index}`, impl);
        }).not.toThrow();
      });
    });

    it('should handle special route patterns', () => {
      const patterns = [
        '/users/:id',
        '/posts/:postId/comments/:commentId',
        '/files/*',
        '/api/v1/data',
        '/'
      ];
      
      patterns.forEach((path, index) => {
        const impl = {
          path,
          method: 'GET',
          implementation: jest.fn()
        };
        
        expect(() => {
          router.SetRouter(`pattern-${index}`, impl);
        }).not.toThrow();
      });
    });

    it('should handle duplicate route names', () => {
      const impl1 = { path: '/test1', method: 'GET', implementation: jest.fn() };
      const impl2 = { path: '/test2', method: 'POST', implementation: jest.fn() };

      router.SetRouter('duplicate', impl1);
      router.SetRouter('duplicate', impl2);
      
      const routerMap = router.ListRouter();
      expect(routerMap.get('duplicate')).toBe(impl2); // Should be overwritten
    });
  });
}); 