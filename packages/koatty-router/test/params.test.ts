/*
 * @Description: Params Decorators Tests
 * @Usage: Test parameter decorators and functionality
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { 
  Header, 
  PathVariable, 
  Get, 
  Post, 
  File, 
  RequestBody, 
  Body,
  RequestParam,
  Param
} from '../src/params/params';

// Mock dependencies
jest.mock('../src/utils/inject');
jest.mock('../src/payload/payload');

const { injectParam } = require('../src/utils/inject');
const { bodyParser, queryParser } = require('../src/payload/payload');

describe('Parameter Decorators', () => {
  let mockCtx: any;
  let mockTarget: any;
  let mockPropertyKey: string | symbol;
  let mockParameterIndex: number;

  beforeEach(() => {
    mockCtx = {
      get: jest.fn(),
      headers: { 'content-type': 'application/json', 'authorization': 'Bearer token' },
      params: { id: '123', name: 'test' },
      query: { page: '1', limit: '10' },
    };

    mockTarget = {};
    mockPropertyKey = 'testMethod';
    mockParameterIndex = 0;

    // Mock injectParam to capture the value getter function
    injectParam.mockImplementation((valueGetter: any, name: string) => {
      return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
        // Store the value getter for testing
        (target as any)[`__${name}_${parameterIndex}`] = valueGetter;
      };
    });

    bodyParser.mockResolvedValue({ body: { username: 'test', password: 'secret' } });
    queryParser.mockReturnValue({ page: '1', limit: '10', id: '123', name: 'test' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Header Decorator', () => {
    it('should get specific header by name', () => {
      const decorator = Header('authorization');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Header_0'];
      expect(valueGetter).toBeDefined();
      
      mockCtx.get.mockReturnValue('Bearer token');
      const result = valueGetter(mockCtx);
      
      expect(mockCtx.get).toHaveBeenCalledWith('authorization');
      expect(result).toBe('Bearer token');
    });

    it('should get all headers when no name specified', () => {
      const decorator = Header();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Header_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toBe(mockCtx.headers);
      expect(mockCtx.get).not.toHaveBeenCalled();
    });

    it('should call injectParam with correct parameters', () => {
      Header('content-type');
      
      expect(injectParam).toHaveBeenCalledWith(
        expect.any(Function),
        'Header'
      );
    });
  });

  describe('PathVariable Decorator', () => {
    it('should get specific path variable by name', () => {
      const decorator = PathVariable('id');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__PathVariable_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toBe('123');
    });

    it('should get all path variables when no name specified', () => {
      const decorator = PathVariable();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__PathVariable_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toEqual({ id: '123', name: 'test' });
    });

    it('should handle missing path variable', () => {
      const decorator = PathVariable('nonexistent');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__PathVariable_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toBeUndefined();
    });

    it('should handle undefined params', () => {
      const decorator = PathVariable();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__PathVariable_0'];
      const result = valueGetter({ ...mockCtx, params: undefined });
      
      expect(result).toEqual({});
    });
  });

  describe('Get Decorator', () => {
    it('should get specific query parameter by name', () => {
      const decorator = Get('page');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Get_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toBe('1');
    });

    it('should get all query parameters when no name specified', () => {
      const decorator = Get();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Get_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toEqual({ page: '1', limit: '10' });
    });

    it('should handle missing query parameter', () => {
      const decorator = Get('nonexistent');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Get_0'];
      const result = valueGetter(mockCtx);
      
      expect(result).toBeUndefined();
    });

    it('should handle undefined query', () => {
      const decorator = Get();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Get_0'];
      const result = valueGetter({ ...mockCtx, query: undefined });
      
      expect(result).toEqual({});
    });
  });

  describe('Post Decorator', () => {
    it('should get specific body parameter by name', async () => {
      const decorator = Post('username');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Post_0'];
      const result = await valueGetter(mockCtx);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, undefined);
      expect(result).toBe('test');
    });

    it('should get all body parameters when no name specified', async () => {
      const decorator = Post();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Post_0'];
      const result = await valueGetter(mockCtx);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, undefined);
      expect(result).toEqual({ username: 'test', password: 'secret' });
    });

    it('should handle body without body property', async () => {
      bodyParser.mockResolvedValueOnce({ username: 'direct' });
      
      const decorator = Post();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Post_0'];
      const result = await valueGetter(mockCtx);
      
      expect(result).toEqual({ username: 'direct' });
    });

    it('should pass payload options', async () => {
      const options = { limit: '5mb' };
      const decorator = Post('username');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__Post_0'];
      await valueGetter(mockCtx, options);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, options);
    });
  });

  describe('File Decorator', () => {
    it('should get specific file by name', async () => {
      bodyParser.mockResolvedValueOnce({ 
        body: { username: 'test' },
        file: { avatar: { filename: 'avatar.jpg' }, doc: { filename: 'doc.pdf' } }
      });

      const decorator = File('avatar');
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__File_0'];
      const result = await valueGetter(mockCtx);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, undefined);
      expect(result).toEqual({ filename: 'avatar.jpg' });
    });

    it('should get all files when no name specified', async () => {
      const files = { avatar: { filename: 'avatar.jpg' }, doc: { filename: 'doc.pdf' } };
      bodyParser.mockResolvedValueOnce({ 
        body: { username: 'test' },
        file: files
      });

      const decorator = File();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__File_0'];
      const result = await valueGetter(mockCtx);
      
      expect(result).toEqual(files);
    });

    it('should handle missing file property', async () => {
      bodyParser.mockResolvedValueOnce({ body: { username: 'test' } });

      const decorator = File();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__File_0'];
      const result = await valueGetter(mockCtx);
      
      expect(result).toEqual({});
    });

    it('should pass payload options', async () => {
      const options = { keepExtensions: true };
      const decorator = File();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__File_0'];
      await valueGetter(mockCtx, options);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, options);
    });
  });

  describe('RequestBody Decorator', () => {
    it('should get full body parser result', async () => {
      const expectedResult = { body: { username: 'test' }, file: { avatar: {} } };
      bodyParser.mockResolvedValueOnce(expectedResult);

      const decorator = RequestBody();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__RequestBody_0'];
      const result = await valueGetter(mockCtx);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, undefined);
      expect(result).toBe(expectedResult);
    });

    it('should pass payload options', async () => {
      const options = { multiples: false };
      const decorator = RequestBody();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__RequestBody_0'];
      await valueGetter(mockCtx, options);
      
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, options);
    });
  });

  describe('Body Alias', () => {
    it('should be an alias for RequestBody', () => {
      expect(Body).toBe(RequestBody);
    });
  });

  describe('RequestParam Decorator', () => {
    it('should get query parser result', () => {
      const decorator = RequestParam();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__RequestParam_0'];
      const result = valueGetter(mockCtx);
      
      expect(queryParser).toHaveBeenCalledWith(mockCtx, undefined);
      expect(result).toEqual({ page: '1', limit: '10', id: '123', name: 'test' });
    });

    it('should pass payload options', () => {
      const options = { encoding: 'ascii' };
      const decorator = RequestParam();
      decorator(mockTarget, mockPropertyKey, mockParameterIndex);

      const valueGetter = mockTarget['__RequestParam_0'];
      valueGetter(mockCtx, options);
      
      expect(queryParser).toHaveBeenCalledWith(mockCtx, options);
    });
  });

  describe('Param Alias', () => {
    it('should be an alias for RequestParam', () => {
      expect(Param).toBe(RequestParam);
    });
  });

  describe('Integration Tests', () => {
    it('should work with multiple decorators', () => {
      // Simulate a method with multiple parameters
      const headerDecorator = Header('authorization');
      const pathDecorator = PathVariable('id');
      const queryDecorator = Get('page');

      headerDecorator(mockTarget, mockPropertyKey, 0);
      pathDecorator(mockTarget, mockPropertyKey, 1);
      queryDecorator(mockTarget, mockPropertyKey, 2);

      expect(injectParam).toHaveBeenCalledTimes(3);
      expect(injectParam).toHaveBeenNthCalledWith(1, expect.any(Function), 'Header');
      expect(injectParam).toHaveBeenNthCalledWith(2, expect.any(Function), 'PathVariable');
      expect(injectParam).toHaveBeenNthCalledWith(3, expect.any(Function), 'Get');
    });

    it('should handle async and sync decorators together', async () => {
      const syncDecorator = Get('page');
      const asyncDecorator = Post('username');

      syncDecorator(mockTarget, mockPropertyKey, 0);
      asyncDecorator(mockTarget, mockPropertyKey, 1);

      const syncValueGetter = mockTarget['__Get_0'];
      const asyncValueGetter = mockTarget['__Post_1'];

      const syncResult = syncValueGetter(mockCtx);
      const asyncResult = await asyncValueGetter(mockCtx);

      expect(syncResult).toBe('1');
      expect(asyncResult).toBe('test');
    });
  });
}); 