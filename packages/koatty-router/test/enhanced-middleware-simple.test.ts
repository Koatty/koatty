import { withMiddleware, MiddlewareDecoratorConfig, MiddlewareCondition } from "../src/params/mapping";
import { KoattyContext, KoattyNext } from "koatty_core";

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

class InvalidMiddleware {
  // 没有 run 方法
}

describe('Enhanced Middleware Decorators - withMiddleware', () => {
  describe('withMiddleware helper function', () => {
    it('should create middleware configuration with default values', () => {
      const config = withMiddleware(AuthMiddleware);
      
      expect(config).toEqual({
        middleware: AuthMiddleware,
        priority: 50,
        enabled: true,
        conditions: [],
        metadata: {}
      });
    });

    it('should create middleware configuration with custom options', () => {
      const conditions: MiddlewareCondition[] = [
        { type: 'header', value: 'authorization', operator: 'contains' }
      ];
      
      const config = withMiddleware(AuthMiddleware, {
        priority: 100,
        enabled: true,
        conditions,
        metadata: { role: 'admin' }
      });
      
      expect(config).toEqual({
        middleware: AuthMiddleware,
        priority: 100,
        enabled: true,
        conditions,
        metadata: { role: 'admin' }
      });
    });

    it('should use default values for missing options', () => {
      const config = withMiddleware(RateLimitMiddleware, {
        priority: 90
      });
      
      expect(config).toEqual({
        middleware: RateLimitMiddleware,
        priority: 90,
        enabled: true,
        conditions: [],
        metadata: {}
      });
    });

    it('should throw error for invalid middleware', () => {
      expect(() => {
        withMiddleware(InvalidMiddleware as any);
      }).toThrow('Middleware must be a class implementing IMiddleware');
    });

    it('should throw error for non-function middleware', () => {
      expect(() => {
        withMiddleware('not-a-function' as any);
      }).toThrow('Middleware must be a class implementing IMiddleware');
    });
  });

  describe('Middleware configuration types', () => {
    it('should support all condition types', () => {
      const pathCondition: MiddlewareCondition = {
        type: 'path',
        value: '/api/admin',
        operator: 'equals'
      };

      const methodCondition: MiddlewareCondition = {
        type: 'method',
        value: 'POST',
        operator: 'equals'
      };

      const headerCondition: MiddlewareCondition = {
        type: 'header',
        value: 'x-api-key',
        operator: 'contains'
      };

      const customCondition: MiddlewareCondition = {
        type: 'custom',
        value: (ctx: KoattyContext) => ctx.request.ip === '127.0.0.1',
        operator: 'custom'
      };

      const config = withMiddleware(AuthMiddleware, {
        conditions: [pathCondition, methodCondition, headerCondition, customCondition]
      });

      expect(config.conditions).toHaveLength(4);
      expect(config.conditions![0]).toEqual(pathCondition);
      expect(config.conditions![1]).toEqual(methodCondition);
      expect(config.conditions![2]).toEqual(headerCondition);
      expect(config.conditions![3]).toEqual(customCondition);
    });

    it('should support complex metadata', () => {
      const metadata = {
        role: 'admin',
        permissions: ['read', 'write'],
        config: {
          timeout: 5000,
          retries: 3
        }
      };

      const config = withMiddleware(AuthMiddleware, { metadata });

      expect(config.metadata).toEqual(metadata);
    });

    it('should support disabled middleware', () => {
      const config = withMiddleware(AuthMiddleware, { enabled: false });

      expect(config.enabled).toBe(false);
    });

    it('should support high priority middleware', () => {
      const config = withMiddleware(AuthMiddleware, { priority: 999 });

      expect(config.priority).toBe(999);
    });
  });
}); 