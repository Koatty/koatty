/*
 * @Description: Simple tests for handler.ts
 * @Usage: Test suite for handler functionality
 * @Author: test
 * @Date: 2025-06-09
 */

// Set environment before imports
process.env.KOATTY_ENV = 'test';
process.env.NODE_ENV = 'test';

import 'reflect-metadata';

// Mock all external dependencies
jest.mock('koatty_core');
jest.mock('koa-compose', () => jest.fn((middleware) => async (ctx: any) => {
  for (const mw of middleware) {
    await mw(ctx, () => Promise.resolve());
  }
}));
jest.mock('koatty_lib', () => ({
  Helper: {
    isError: jest.fn(),
    isFunction: jest.fn(),
    isString: jest.fn(),
    isArray: jest.fn(),
    toString: jest.fn()
  }
}));
jest.mock('koatty_exception', () => ({
  Exception: jest.fn((message, code, status) => {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).status = status;
    return error;
  })
}));
jest.mock('koatty_container', () => ({
  IOC: {
    getClass: jest.fn(() => class MockDto {})
  }
}));
jest.mock('koatty_validation', () => ({
  ClassValidator: {
    valid: jest.fn()
  },
  convertParamsType: jest.fn(),
  FunctionValidator: {},
  plainToClass: jest.fn()
}));
jest.mock('../src/middleware/manager', () => ({
  RouterMiddlewareManager: {
    getInstance: jest.fn()
  }
}));
jest.mock('koatty_logger', () => ({
  DefaultLogger: {
    Debug: jest.fn(),
    Info: jest.fn(),
    Warn: jest.fn(),
    Error: jest.fn()
  }
}));


// Helper function to add sourceType and hasAsyncParams to test metadata
function addSourceType(params: any[]): any[] {
  const { ParamSourceType, inferSourceTypeFromFnName } = require('../src/utils/inject');
  const processedParams = params.map((p: any) => {
    if (!p.sourceType && p.fn) {
      p.sourceType = inferSourceTypeFromFnName(p.fn.name || '');
    } else if (!p.sourceType) {
      p.sourceType = ParamSourceType.CUSTOM;
    }
    return p;
  });
  
  // Add hasAsyncParams flag
  // Consider CUSTOM as potentially async since it calls custom fn
  const hasAsyncParams = processedParams.some((p: any) => 
    p.sourceType === ParamSourceType.BODY || 
    p.sourceType === ParamSourceType.FILE ||
    p.sourceType === ParamSourceType.CUSTOM ||  // Custom fn might be async
    p.isDto
  );
  (processedParams as any).hasAsyncParams = hasAsyncParams;
  
  return processedParams;
}

describe('Handler Simple Tests', () => {
  let mockApp: any;
  let mockCtx: any;
  let mockCtl: any;
  let mockMiddlewareManager: any;
  let Handler: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mocks
    const { Helper } = require('koatty_lib');
    Helper.isError.mockReturnValue(false);
    Helper.isFunction.mockReturnValue(true);
    Helper.isString.mockReturnValue(false);
    Helper.isArray.mockReturnValue(false);

    const { ClassValidator, convertParamsType, plainToClass } = require('koatty_validation');
    ClassValidator.valid.mockResolvedValue({});
    convertParamsType.mockImplementation((value) => value);
    plainToClass.mockReturnValue({});

    // Mock middleware manager
    mockMiddlewareManager = {
      getMiddleware: jest.fn().mockReturnValue({ name: 'test', middleware: jest.fn() }),
      compose: jest.fn().mockImplementation(() => async (ctx: any, next: any) => {
        await next();
      }),
      _instanceId: 'test-id'
    };

    const { RouterMiddlewareManager } = require('../src/middleware/manager');
    RouterMiddlewareManager.getInstance.mockReturnValue(mockMiddlewareManager);

    // Dynamically import Handler after mocks are set up
    const handlerModule = await import('../src/utils/handler');
    Handler = handlerModule.Handler;

    // Setup test objects
    mockApp = {
      appDebug: false
    };

    mockCtx = {
      throw: jest.fn((status, message) => {
        const error = new Error(message);
        (error as any).status = status;
        throw error;
      }),
      path: '/test',
      method: 'GET',
      protocol: 'http',
      body: undefined
    };

    mockCtl = {
      ctx: undefined,
      testMethod: jest.fn().mockResolvedValue('success'),
      errorMethod: jest.fn().mockResolvedValue(new Error('test error'))
    };
  });

  describe('Basic Handler functionality', () => {
    it('should throw 404 when controller is null', async () => {
      await expect(Handler(mockApp, mockCtx, null, 'testMethod')).rejects.toThrow();
      expect(mockCtx.throw).toHaveBeenCalledWith(404, 'Controller not found.');
    });

    it('should throw 404 when context is null', async () => {
      await expect(Handler(mockApp, null, mockCtl, 'testMethod')).rejects.toThrow();
    });

    it('should execute controller method successfully', async () => {
      const result = await Handler(mockApp, mockCtx, mockCtl, 'testMethod');
      
      expect(mockCtl.testMethod).toHaveBeenCalled();
      expect(mockCtx.body).toBe('success');
      expect(result).toBe('success');
    });

    it('should set controller context if not exists', async () => {
      await Handler(mockApp, mockCtx, mockCtl, 'testMethod');
      expect(mockCtl.ctx).toBe(mockCtx);
    });

    it('should preserve existing controller context', async () => {
      const existingCtx = { existing: true };
      mockCtl.ctx = existingCtx;
      
      await Handler(mockApp, mockCtx, mockCtl, 'testMethod');
      expect(mockCtl.ctx).toBe(existingCtx);
    });

    it('should handle existing body in context', async () => {
      mockCtx.body = 'existing';
      
      const result = await Handler(mockApp, mockCtx, mockCtl, 'testMethod');
      expect(result).toBe('existing');
    });

    it('should handle error from controller method', async () => {
      const { Helper } = require('koatty_lib');
      Helper.isError.mockReturnValue(true);

      await expect(Handler(mockApp, mockCtx, mockCtl, 'errorMethod')).rejects.toThrow('test error');
    });
  });



  describe('Parameter handling', () => {
    it('should handle no parameters', async () => {
      await Handler(mockApp, mockCtx, mockCtl, 'testMethod');
      expect(mockCtl.testMethod).toHaveBeenCalledWith();
    });

    it('should handle basic parameters', async () => {
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue('param1'),
          name: 'test',
          index: 0,
          type: 'string',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(params[0].fn).toHaveBeenCalledWith(mockCtx, {});
      expect(mockCtl.testMethod).toHaveBeenCalledWith('param1');
    });

    it('should handle predefined parameter values', async () => {
      const params = addSourceType([
        {
          fn: jest.fn(),
          name: 'test',
          index: 0,
          type: 'string',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);
      const ctlParamsValue = ['predefined'];

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params, ctlParamsValue);
      
      expect(params[0].fn).not.toHaveBeenCalled();
      expect(mockCtl.testMethod).toHaveBeenCalledWith('predefined');
    });

    it('should handle DTO parameters with validation', async () => {
      const { ClassValidator } = require('koatty_validation');
      const TestDto = class TestDto {};
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue({ name: 'test' }),
          name: 'dto',
          index: 0,
          type: 'TestDto',
          isDto: true,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: true,
          dtoRule: undefined,
          clazz: TestDto,
          options: {}
        }
      ]);

      ClassValidator.valid.mockResolvedValue({ name: 'validated' });

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(ClassValidator.valid).toHaveBeenCalledWith(TestDto, { name: 'test' }, true);
      expect(mockCtl.testMethod).toHaveBeenCalledWith({ name: 'validated' });
    });

    it('should handle DTO parameters without validation', async () => {
      const { plainToClass } = require('koatty_validation');
      const TestDto = class TestDto {};
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue({ name: 'test' }),
          name: 'dto',
          index: 0,
          type: 'TestDto',
          isDto: true,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: TestDto,
          options: {}
        }
      ]);

      plainToClass.mockReturnValue({ name: 'plain' });

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(plainToClass).toHaveBeenCalledWith(TestDto, { name: 'test' }, true);
      expect(mockCtl.testMethod).toHaveBeenCalledWith({ name: 'plain' });
    });

    it('should handle DTO parameters without clazz', async () => {
      const { IOC } = require('koatty_container');
      const { plainToClass } = require('koatty_validation');
      const TestDto = class TestDto {};
      
      IOC.getClass.mockReturnValue(TestDto);
      plainToClass.mockReturnValue({});
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue({}),
          name: 'dto',
          index: 0,
          type: 'TestDto',
          isDto: true,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(IOC.getClass).toHaveBeenCalledWith('TestDto', 'COMPONENT');
    });

    it('should handle type conversion', async () => {
      const { convertParamsType } = require('koatty_validation');
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue('123'),
          name: 'param',
          index: 0,
          type: 'number',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);

      convertParamsType.mockReturnValue(123);

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(convertParamsType).toHaveBeenCalledWith('123', 'number');
      expect(mockCtl.testMethod).toHaveBeenCalledWith(123);
    });

    it('should handle validation errors', async () => {
      const { ClassValidator } = require('koatty_validation');
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue({}),
          name: 'dto',
          index: 0,
          type: 'TestDto',
          isDto: true,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: true,
          dtoRule: undefined,
          clazz: class TestDto {},
          options: {}
        }
      ]);

      ClassValidator.valid.mockRejectedValue(new Error('Validation failed'));

      await expect(Handler(mockApp, mockCtx, mockCtl, 'testMethod', params)).rejects.toThrow();
    });

    it('should handle parameters with non-function fn', async () => {
      const { Helper } = require('koatty_lib');
      Helper.isFunction.mockReturnValue(false);
      
      const params = addSourceType([
        {
          fn: 'not a function',
          name: 'param',
          index: 0,
          type: 'string',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);
      const ctlParamsValue = ['fallback'];

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params, ctlParamsValue);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith('fallback');
    });

    it('should handle function validation rules', async () => {
      const { Helper } = require('koatty_lib');
      Helper.isFunction.mockReturnValue(true);
      
      const validationRule = jest.fn();
      // Task 6.2: All validators must be pre-compiled
      const compiledValidator = jest.fn((value) => validationRule(value));
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue('test'),
          name: 'param',
          index: 0,
          type: 'string',
          isDto: false,
          validRule: validationRule,
          validOpt: {},
          compiledValidator: compiledValidator,  // Pre-compiled validator required
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(compiledValidator).toHaveBeenCalledWith('test');
    });

    it('should handle multiple parameters', async () => {
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue('param1'),
          name: 'first',
          index: 0,
          type: 'string',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        },
        {
          fn: jest.fn().mockResolvedValue('param2'),
          name: 'second',
          index: 1,
          type: 'string',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        }
      ]);

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith('param1', 'param2');
    });

    it('should handle validation error without message', async () => {
      const { ClassValidator } = require('koatty_validation');
      
      const params = addSourceType([
        {
          fn: jest.fn().mockResolvedValue({}),
          name: 'dto',
          index: 0,
          type: 'TestDto',
          isDto: true,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: true,
          dtoRule: undefined,
          clazz: class TestDto {},
          options: {}
        }
      ]);

      const errorWithoutMessage = new Error();
      errorWithoutMessage.message = '';
      ClassValidator.valid.mockRejectedValue(errorWithoutMessage);

      await expect(Handler(mockApp, mockCtx, mockCtl, 'testMethod', params))
        .rejects.toThrow('ValidatorError: invalid arguments.');
    });
  });
});