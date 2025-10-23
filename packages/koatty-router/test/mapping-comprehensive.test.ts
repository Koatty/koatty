/*
 * @Description: Comprehensive tests for mapping.ts
 * @Usage: Test suite for HTTP request mapping decorators
 * @Author: test
 * @Date: 2025-06-09
 */

// Set environment before imports
process.env.KOATTY_ENV = 'test';
process.env.NODE_ENV = 'test';

import 'reflect-metadata';

// Mock dependencies
jest.mock('koatty_container', () => ({
  IOC: {
    getType: jest.fn(),
    attachPropertyData: jest.fn()
  }
}));

import {
  RequestMapping,
  PostMapping,
  GetMapping,
  DeleteMapping,
  PutMapping,
  PatchMapping,
  OptionsMapping,
  HeadMapping,
  RequestMethod,
  MAPPING_KEY
} from '../src/params/mapping';

describe('mapping.ts Tests', () => {
  let mockTarget: any;

  beforeEach(() => {
    jest.clearAllMocks();

    const { IOC } = require('koatty_container');
    IOC.getType.mockReturnValue('CONTROLLER');
    IOC.attachPropertyData.mockImplementation(() => {});

    mockTarget = {
      constructor: { name: 'TestController' }
    };
  });

  describe('RequestMapping', () => {
    it('should create mapping with defaults', () => {
      const decorator = RequestMapping();
      const descriptor = { value: jest.fn() };

      decorator(mockTarget, 'test', descriptor);

      const { IOC } = require('koatty_container');
      expect(IOC.attachPropertyData).toHaveBeenCalledWith(
        MAPPING_KEY,
        expect.objectContaining({
          path: '/',
          requestMethod: RequestMethod.GET
        }),
        mockTarget,
        'test'
      );
    });

    it('should validate middleware', () => {
      class ValidMiddleware {
        run() {}
      }

      const decorator = RequestMapping('/test', RequestMethod.GET, {
        middleware: [ValidMiddleware]
      });

      expect(() => {
        decorator(mockTarget, 'test', { value: jest.fn() });
      }).not.toThrow();
    });

    it('should reject invalid middleware', () => {
      class InvalidMiddleware {}

      const decorator = RequestMapping('/test', RequestMethod.GET, {
        middleware: [InvalidMiddleware]
      });

      expect(() => {
        decorator(mockTarget, 'test', { value: jest.fn() });
      }).toThrow('Middleware must be a class implementing IMiddleware');
    });

    it('should reject non-controller target', () => {
      const { IOC } = require('koatty_container');
      IOC.getType.mockReturnValue('SERVICE');

      const decorator = RequestMapping();

      expect(() => {
        decorator(mockTarget, 'test', { value: jest.fn() });
      }).toThrow('RequestMapping decorator is only used in controllers class.');
    });
  });

  describe('HTTP Method Decorators', () => {
    const testMethods = [
      { decorator: PostMapping, method: RequestMethod.POST },
      { decorator: GetMapping, method: RequestMethod.GET },
      { decorator: DeleteMapping, method: RequestMethod.DELETE },
      { decorator: PutMapping, method: RequestMethod.PUT },
      { decorator: PatchMapping, method: RequestMethod.PATCH },
      { decorator: OptionsMapping, method: RequestMethod.OPTIONS },
      { decorator: HeadMapping, method: RequestMethod.HEAD }
    ];

    testMethods.forEach(({ decorator, method }) => {
      it(`should create ${method.toUpperCase()} mapping`, () => {
        const dec = decorator('/api/test');
        dec(mockTarget, 'testMethod', { value: jest.fn() });

        const { IOC } = require('koatty_container');
        expect(IOC.attachPropertyData).toHaveBeenCalledWith(
          MAPPING_KEY,
          expect.objectContaining({
            path: '/api/test',
            requestMethod: method
          }),
          mockTarget,
          'testMethod'
        );
      });
    });
  });
}); 