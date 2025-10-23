import { Controller, KoattyContext } from "koatty_core";
import { injectRouter } from '../src/utils/inject';
import { RouterMiddlewareManager } from '../src/middleware/manager';
import { IOC } from 'koatty_container';

// Mock dependencies
jest.mock('koatty_container', () => ({
  IOC: {
    getIdentifier: jest.fn(),
    getPropertyData: jest.fn(),
    getType: jest.fn()
  },
  recursiveGetMetadata: jest.fn()
}));

jest.mock('../src/middleware/manager');

// Mock应用实例
const mockApp = {
  config: jest.fn().mockReturnValue({}),
  appDebug: false
};

// Mock中间件类
class TestAuthMiddleware {
  async run(config: any, app: any) {
    return async (ctx: KoattyContext, next: any) => {
      ctx.authExecuted = true;
      await next();
    };
  }
}

class TestRateLimitMiddleware {
  async run(config: any, app: any) {
    return async (ctx: KoattyContext, next: any) => {
      ctx.rateLimitExecuted = true;
      await next();
    };
  }
}

describe('injectRouter - 新特性测试', () => {
  let mockMiddlewareManager: jest.Mocked<RouterMiddlewareManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock RouterMiddlewareManager
    mockMiddlewareManager = {
      register: jest.fn(),
      getMiddlewareByRoute: jest.fn(),
      compose: jest.fn(),
      getInstance: jest.fn(),
      resetInstance: jest.fn()
    } as any;

    (RouterMiddlewareManager.getInstance as jest.Mock).mockReturnValue(mockMiddlewareManager);
  });

  describe('中间件实例ID收集', () => {
    test('应该收集中间件实例ID而不是名称', async () => {
      // Mock IOC返回值
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [TestAuthMiddleware]
      });

      // Mock recursiveGetMetadata
      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: [{
            middleware: TestRateLimitMiddleware,
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {}
          }]
        }]
      });

      // Mock middleware manager methods
      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('TestAuthMiddleware@/api/users#GET')
        .mockResolvedValueOnce('TestRateLimitMiddleware@/api/users#GET');
      
      mockMiddlewareManager.compose.mockReturnValue(jest.fn());

      const result = await injectRouter(mockApp as any, TestController, 'http');

      expect(result).toBeDefined();
      
      // 查找正确的路由键
      const routeKeys = Object.keys(result || {});
      expect(routeKeys.length).toBeGreaterThan(0);
      
      const routeKey = routeKeys.find(key => key.includes('/api/users') && key.includes('GET'));
      expect(routeKey).toBeDefined();
      
      if (routeKey && result) {
        // 现在中间件配置存储在 middlewareConfigs 中
        expect(result[routeKey].middlewareConfigs).toBeDefined();
        expect(result[routeKey].middlewareConfigs).toHaveLength(2);
        expect(result[routeKey].middlewareConfigs![0].middleware).toBe(TestAuthMiddleware);
        expect(result[routeKey].middlewareConfigs![1].middleware).toBe(TestRateLimitMiddleware);
      }
    });

    test('应该为控制器和方法级别中间件分别注册', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [TestAuthMiddleware] // 控制器级别
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: [{ // 方法级别
            middleware: TestRateLimitMiddleware,
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {}
          }]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('TestAuthMiddleware@/api/users#GET')
        .mockResolvedValueOnce('TestRateLimitMiddleware@/api/users#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证注册了两个中间件
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(2);
      
      // 验证第一个注册调用（控制器级别中间件）
      expect(mockMiddlewareManager.register).toHaveBeenNthCalledWith(1, {
        name: 'TestAuthMiddleware',
        middleware: TestAuthMiddleware,
        priority: 50,
        enabled: true,
        conditions: [],
        metadata: {
          type: 'route',
          description: 'Auto-registered middleware from decorator: TestAuthMiddleware',
          source: 'controller'
        },
        middlewareConfig: {
          middlewareName: 'TestAuthMiddleware',
          protocol: 'http',
          route: '/api/users',
          method: 'GET',
          decoratorConfig: { source: 'controller' }
        }
      });

      // 验证第二个注册调用（方法级别中间件）
      expect(mockMiddlewareManager.register).toHaveBeenNthCalledWith(2, {
        name: 'TestRateLimitMiddleware',
        middleware: TestRateLimitMiddleware,
        priority: 50,
        enabled: true,
        conditions: [],
        metadata: {
          type: 'route',
          description: 'Auto-registered middleware from decorator: TestRateLimitMiddleware',
          source: 'decorator'
        },
        middlewareConfig: {
          middlewareName: 'TestRateLimitMiddleware',
          protocol: 'http',
          route: '/api/users',
          method: 'GET',
          decoratorConfig: {}
        }
      });
    });
  });

  describe('中间件重复检查', () => {
    test('应该检查现有中间件实例避免重复注册', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [TestAuthMiddleware]
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: []
        }]
      });

      // Mock existing middleware
      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue({
        instanceId: 'TestAuthMiddleware@/api/users#GET',
        name: 'TestAuthMiddleware',
        middleware: jest.fn()
      });

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证没有重复注册
      expect(mockMiddlewareManager.register).not.toHaveBeenCalled();
      
      // 验证使用了现有实例ID
      expect(mockMiddlewareManager.getMiddlewareByRoute).toHaveBeenCalledWith(
        'TestAuthMiddleware',
        '/api/users',
        'GET'
      );
    });
  });

  describe('预组合中间件', () => {
    test('应该在注册时预组合中间件', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: []
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: [{
            middleware: TestAuthMiddleware,
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {}
          }]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register.mockResolvedValue('TestAuthMiddleware@/api/users#GET');
      
      const mockComposedMiddleware = jest.fn();
      mockMiddlewareManager.compose.mockReturnValue(mockComposedMiddleware);

      const result = await injectRouter(mockApp as any, TestController, 'http');

      // 验证调用了compose方法
      expect(mockMiddlewareManager.compose).toHaveBeenCalledWith(
        ['TestAuthMiddleware@/api/users#GET'],
        {
          route: '/api/users',
          method: 'GET',
          protocol: 'http'
        }
      );

      // 验证结果包含预组合的中间件
      const routeKeys = Object.keys(result || {});
      const routeKey = routeKeys.find(key => key.includes('/api/users') && key.includes('GET'));
      expect(routeKey).toBeDefined();
      
      if (routeKey && result) {
        expect(result[routeKey].composedMiddleware).toBe(mockComposedMiddleware);
      }
    });

    test('应该在没有中间件时不进行组合', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: []
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: []
        }]
      });

      const result = await injectRouter(mockApp as any, TestController, 'http');

      // 验证没有调用compose方法
      expect(mockMiddlewareManager.compose).not.toHaveBeenCalled();
      
      // 验证没有composedMiddleware
      const routeKeys = Object.keys(result || {});
      const routeKey = routeKeys.find(key => key.includes('/api/users') && key.includes('GET'));
      expect(routeKey).toBeDefined();
      
      if (routeKey && result) {
        expect(result[routeKey].composedMiddleware).toBeUndefined();
      }
    });
  });

  describe('路由路径处理', () => {
    test('应该正确处理路由路径拼接', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api/v1',
        protocol: 'http',
        middleware: []
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users/:id',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: [{
            middleware: TestAuthMiddleware,
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {}
          }]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register.mockResolvedValue('TestAuthMiddleware@/api/v1/users/:id#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证路由路径正确拼接
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({
          middlewareConfig: expect.objectContaining({
            route: '/api/v1/users/:id'
          })
        })
      );
    });

    test('应该处理双斜杠问题', async () => {
      (IOC.getIdentifier as jest.Mock).mockReturnValue('TestController');
      (IOC.getPropertyData as jest.Mock).mockReturnValue({
        path: '/api/',
        protocol: 'http',
        middleware: []
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testMethod: [{
          path: '/users',
          requestMethod: 'GET',
          method: 'testMethod',
          middlewareConfigs: [{
            middleware: TestAuthMiddleware,
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {}
          }]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register.mockResolvedValue('TestAuthMiddleware@/api/users#GET');

      const result = await injectRouter(mockApp as any, TestController, 'http');

      // 验证路径正确处理，没有双斜杠
      const routeKeys = Object.keys(result || {});
      const routeKey = routeKeys.find(key => key.includes('/api/users') && key.includes('GET'));
      expect(routeKey).toBeDefined();
      
      if (routeKey && result) {
        expect(result[routeKey].path).toBe('/api/users');
      }
    });
  });
});

// Mock controller class
class TestController {
  testMethod() {
    return 'test';
  }
} 