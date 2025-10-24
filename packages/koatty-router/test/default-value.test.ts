/*
 * @Description: Tests for decorator default values (Task 4.7)
 * @Usage: Test suite for default value support in parameter decorators
 * @Author: test
 * @Date: 2025-03-16
 */

import 'reflect-metadata';

// Mock all dependencies before imports
jest.mock('koatty_lib');
jest.mock('koatty_container');
jest.mock('koatty_validation');
jest.mock('../src/payload/payload');

describe('Default Value Tests (Task 4.7)', () => {
  let mockCtx: any;
  let Handler: any;
  let mockApp: any;
  let mockCtl: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const { Helper } = require('koatty_lib');
    Helper.isFunction = jest.fn().mockReturnValue(true);
    Helper.isString = jest.fn().mockReturnValue(false);
    Helper.toString = jest.fn((val: any) => String(val));

    const { convertParamsType } = require('koatty_validation');
    convertParamsType.mockImplementation((v: any) => v);

    const { bodyParser } = require('../src/payload/payload');
    bodyParser.mockResolvedValue({});

    // Import handler after mocks
    const handlerModule = require('../src/utils/handler');
    Handler = handlerModule.Handler;

    mockCtx = {
      query: {},
      params: {},
      headers: {},
      get: jest.fn((key: string) => mockCtx.headers[key]),
      throw: jest.fn()
    };

    mockApp = {};
    mockCtl = {
      testMethod: jest.fn()
    };
  });

  describe('Query Parameter Default Values', () => {
    it('should use default value when query parameter is undefined', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const params = [{
        fn: (ctx: any) => ctx.query?.page,
        name: 'page',
        sourceType: ParamSourceType.QUERY,
        paramName: 'page',
        defaultValue: 1,  // Default value
        index: 0,
        type: 'number',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // Should receive default value
      expect(mockCtl.testMethod).toHaveBeenCalledWith(1);
    });

    it('should use actual value when query parameter is provided', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      mockCtx.query = { page: '5' };
      
      const params = [{
        fn: (ctx: any) => ctx.query?.page,
        name: 'page',
        sourceType: ParamSourceType.QUERY,
        paramName: 'page',
        defaultValue: 1,
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // Should receive actual value, not default
      expect(mockCtl.testMethod).toHaveBeenCalledWith('5');
    });

    it('should handle multiple parameters with different default values', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      mockCtx.query = { limit: '20' }; // Only limit is provided
      
      const params = [
        {
          fn: (ctx: any) => ctx.query?.page,
          name: 'page',
          sourceType: ParamSourceType.QUERY,
          paramName: 'page',
          defaultValue: 1,  // page default
          index: 0,
          type: 'number',
          isDto: false,
          validRule: undefined,
          validOpt: undefined,
          dtoCheck: false,
          dtoRule: undefined,
          clazz: undefined,
          options: {}
        },
        {
          fn: (ctx: any) => ctx.query?.limit,
          name: 'limit',
          sourceType: ParamSourceType.QUERY,
          paramName: 'limit',
          defaultValue: 10,  // limit default
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
      ];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // page uses default (1), limit uses actual value ('20')
      expect(mockCtl.testMethod).toHaveBeenCalledWith(1, '20');
    });
  });

  describe('Path Parameter Default Values', () => {
    it('should use default value when path parameter is undefined', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const params = [{
        fn: (ctx: any) => ctx.params?.id,
        name: 'id',
        sourceType: ParamSourceType.PATH,
        paramName: 'id',
        defaultValue: '0',
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith('0');
    });
  });

  describe('Header Parameter Default Values', () => {
    it('should use default value when header is undefined', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const params = [{
        fn: (ctx: any) => ctx.get('accept-language'),
        name: 'lang',
        sourceType: ParamSourceType.HEADER,
        paramName: 'accept-language',
        defaultValue: 'en',
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith('en');
    });
  });

  describe('Default Value with Pre-compiled Extractor', () => {
    it('should apply default value when pre-compiled extractor returns undefined', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const params = [{
        fn: (ctx: any) => ctx.query?.sort,
        name: 'sort',
        sourceType: ParamSourceType.QUERY,
        paramName: 'sort',
        defaultValue: 'asc',
        precompiledExtractor: (ctx: any) => ctx.query?.sort,  // Pre-compiled extractor
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith('asc');
    });
  });

  describe('Default Value with Complex Types', () => {
    it('should support object as default value', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const defaultConfig = { theme: 'dark', lang: 'en' };
      
      const params = [{
        fn: (ctx: any) => ctx.query?.config,
        name: 'config',
        sourceType: ParamSourceType.QUERY,
        paramName: 'config',
        defaultValue: defaultConfig,
        index: 0,
        type: 'object',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith(defaultConfig);
    });

    it('should support array as default value', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      const defaultTags = ['news', 'tech'];
      
      const params = [{
        fn: (ctx: any) => ctx.query?.tags,
        name: 'tags',
        sourceType: ParamSourceType.QUERY,
        paramName: 'tags',
        defaultValue: defaultTags,
        index: 0,
        type: 'array',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      expect(mockCtl.testMethod).toHaveBeenCalledWith(defaultTags);
    });
  });

  describe('Edge Cases', () => {
    it('should not apply default value when parameter is null', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      mockCtx.query = { value: null };
      
      const params = [{
        fn: (ctx: any) => ctx.query?.value,
        name: 'value',
        sourceType: ParamSourceType.QUERY,
        paramName: 'value',
        defaultValue: 'default',
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // null is not undefined, so default should not be applied
      expect(mockCtl.testMethod).toHaveBeenCalledWith(null);
    });

    it('should not apply default value when parameter is 0', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      mockCtx.query = { count: '0' };
      
      const params = [{
        fn: (ctx: any) => ctx.query?.count,
        name: 'count',
        sourceType: ParamSourceType.QUERY,
        paramName: 'count',
        defaultValue: 10,
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // '0' is not undefined, so default should not be applied
      expect(mockCtl.testMethod).toHaveBeenCalledWith('0');
    });

    it('should not apply default value when parameter is empty string', async () => {
      const { ParamSourceType } = require('../src/utils/inject');
      
      mockCtx.query = { search: '' };
      
      const params = [{
        fn: (ctx: any) => ctx.query?.search,
        name: 'search',
        sourceType: ParamSourceType.QUERY,
        paramName: 'search',
        defaultValue: 'default-search',
        index: 0,
        type: 'string',
        isDto: false,
        validRule: undefined,
        validOpt: undefined,
        dtoCheck: false,
        dtoRule: undefined,
        clazz: undefined,
        options: {}
      }];

      (params as any).hasAsyncParams = false;

      await Handler(mockApp, mockCtx, mockCtl, 'testMethod', params);
      
      // '' is not undefined, so default should not be applied
      expect(mockCtl.testMethod).toHaveBeenCalledWith('');
    });
  });
});

