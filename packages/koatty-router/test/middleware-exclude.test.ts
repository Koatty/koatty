import { Controller, KoattyContext, KoattyNext } from "koatty_core";
import { GetMapping, PostMapping, withMiddleware } from "../src/index";
import { RouterMiddlewareManager } from "../src/middleware/manager";
import { injectRouter } from "../src/utils/inject";

// Mock dependencies
jest.mock('koatty_container', () => ({
  IOC: {
    getIdentifier: jest.fn(),
    getPropertyData: jest.fn(),
    getType: jest.fn(),
    saveClass: jest.fn(),
    attachPropertyData: jest.fn(),
    savePropertyData: jest.fn()
  },
  recursiveGetMetadata: jest.fn()
}));

jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    Debug: jest.fn(),
    Error: jest.fn()
  }
}));

// 模拟中间件类
class AuthMiddleware {
  async run(ctx: KoattyContext, next: KoattyNext) {
    ctx.authExecuted = true;
    await next();
  }
}

class RateLimitMiddleware {
  async run(ctx: KoattyContext, next: KoattyNext) {
    ctx.rateLimitExecuted = true;
    await next();
  }
}

class LoggingMiddleware {
  async run(ctx: KoattyContext, next: KoattyNext) {
    ctx.loggingExecuted = true;
    await next();
  }
}

class ValidationMiddleware {
  async run(ctx: KoattyContext, next: KoattyNext) {
    ctx.validationExecuted = true;
    await next();
  }
}

describe('Middleware Disable Feature', () => {
  let mockApp: any;
  let mockMiddlewareManager: any;
  let IOC: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock app
    mockApp = {
      appDebug: false
    };

    // Mock middleware manager
    mockMiddlewareManager = {
      register: jest.fn(),
      getMiddlewareByRoute: jest.fn(),
      compose: jest.fn()
    };

    // Mock RouterMiddlewareManager.getInstance
    jest.spyOn(RouterMiddlewareManager, 'getInstance').mockReturnValue(mockMiddlewareManager);

    // Mock IOC
    IOC = require('koatty_container').IOC;
    IOC.getType.mockReturnValue('CONTROLLER');
  });

  describe('控制器级别的中间件禁用', () => {
    test('应该忽略控制器级别enabled为false的中间件', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [
          AuthMiddleware, 
          withMiddleware(RateLimitMiddleware, { enabled: false }), // 控制器级别禁用
          LoggingMiddleware
        ]
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: []
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('AuthMiddleware@/api/test#GET')
        .mockResolvedValueOnce('LoggingMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证只注册了两个中间件（Auth + Logging），RateLimitMiddleware被控制器级别禁用
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(2);
      
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AuthMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'LoggingMiddleware' })
      );
      expect(mockMiddlewareManager.register).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'RateLimitMiddleware' })
      );
    });
  });

  describe('方法级别的中间件禁用', () => {
    test('应该在方法级别禁用控制器声明的中间件', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [AuthMiddleware, RateLimitMiddleware, LoggingMiddleware]
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: [
            // 方法级别禁用控制器声明的AuthMiddleware
            withMiddleware(AuthMiddleware, { enabled: false }),
            // 添加新的中间件
            withMiddleware(ValidationMiddleware, { priority: 60 })
          ]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('RateLimitMiddleware@/api/test#GET')
        .mockResolvedValueOnce('LoggingMiddleware@/api/test#GET')
        .mockResolvedValueOnce('ValidationMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证注册了三个中间件（RateLimit + Logging + Validation），AuthMiddleware被方法级别禁用
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(3);
      
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'RateLimitMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'LoggingMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ValidationMiddleware' })
      );
      expect(mockMiddlewareManager.register).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AuthMiddleware' })
      );
    });

    test('应该忽略方法级别对未声明中间件的禁用配置', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [AuthMiddleware, RateLimitMiddleware] // 控制器只声明了这两个
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: [
            // 尝试禁用控制器未声明的LoggingMiddleware - 这是无效配置
            withMiddleware(LoggingMiddleware, { enabled: false }),
            // 添加新的中间件
            withMiddleware(ValidationMiddleware, { priority: 60 })
          ]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('AuthMiddleware@/api/test#GET')
        .mockResolvedValueOnce('RateLimitMiddleware@/api/test#GET')
        .mockResolvedValueOnce('ValidationMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证注册了三个中间件（Auth + RateLimit + Validation）
      // LoggingMiddleware的禁用配置被忽略，因为控制器未声明
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(3);
      
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AuthMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'RateLimitMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ValidationMiddleware' })
      );
    });
  });

  describe('方法级别的中间件添加', () => {
    test('应该允许方法级别添加控制器未声明的中间件', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [AuthMiddleware, LoggingMiddleware] // 控制器只声明了这两个
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: [
            // 方法级别添加控制器未声明的中间件
            withMiddleware(ValidationMiddleware, { priority: 60 }),
            withMiddleware(RateLimitMiddleware, { priority: 70 })
          ]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('AuthMiddleware@/api/test#GET')
        .mockResolvedValueOnce('LoggingMiddleware@/api/test#GET')
        .mockResolvedValueOnce('RateLimitMiddleware@/api/test#GET')
        .mockResolvedValueOnce('ValidationMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证注册了四个中间件（控制器的2个 + 方法级别添加的2个）
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(4);
      
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AuthMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'LoggingMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ValidationMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'RateLimitMiddleware' })
      );
    });

    test('方法级别的中间件配置应该覆盖控制器级别的同名中间件配置', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [
          withMiddleware(AuthMiddleware, { priority: 30 }), // 控制器级别优先级30
          LoggingMiddleware
        ]
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: [
            // 方法级别重新配置AuthMiddleware，优先级更高
            withMiddleware(AuthMiddleware, { priority: 80 })
          ]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('LoggingMiddleware@/api/test#GET')
        .mockResolvedValueOnce('AuthMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证AuthMiddleware使用了方法级别的配置（优先级80）
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ 
          name: 'AuthMiddleware',
          priority: 80
        })
      );
    });
  });

  describe('混合场景', () => {
    test('应该正确处理控制器禁用和方法禁用的组合', async () => {
      IOC.getIdentifier.mockReturnValue('TestController');
      IOC.getPropertyData.mockReturnValue({
        path: '/api',
        protocol: 'http',
        middleware: [
          AuthMiddleware,
          withMiddleware(RateLimitMiddleware, { enabled: false }), // 控制器级别禁用
          LoggingMiddleware,
          ValidationMiddleware
        ]
      });

      const { recursiveGetMetadata } = require('koatty_container');
      recursiveGetMetadata.mockReturnValue({
        testEndpoint: [{
          path: '/test',
          requestMethod: 'GET',
          method: 'testEndpoint',
          middlewareConfigs: [
            // 方法级别禁用控制器声明的LoggingMiddleware
            withMiddleware(LoggingMiddleware, { enabled: false }),
            // 尝试禁用已经在控制器级别禁用的RateLimitMiddleware - 无效但不报错
            withMiddleware(RateLimitMiddleware, { enabled: false })
          ]
        }]
      });

      mockMiddlewareManager.getMiddlewareByRoute.mockReturnValue(null);
      mockMiddlewareManager.register
        .mockResolvedValueOnce('AuthMiddleware@/api/test#GET')
        .mockResolvedValueOnce('ValidationMiddleware@/api/test#GET');

      await injectRouter(mockApp as any, TestController, 'http');

      // 验证只注册了两个中间件（Auth + Validation）
      // RateLimitMiddleware被控制器级别禁用
      // LoggingMiddleware被方法级别禁用
      expect(mockMiddlewareManager.register).toHaveBeenCalledTimes(2);
      
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'AuthMiddleware' })
      );
      expect(mockMiddlewareManager.register).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'ValidationMiddleware' })
      );
    });
  });
});

// 测试控制器
@Controller('/api')
class TestController {
  publicEndpoint() {
    return 'public endpoint';
  }

  openEndpoint() {
    return 'open endpoint';
  }

  normalEndpoint() {
    return 'normal endpoint';
  }
} 