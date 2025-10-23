/**
 * Test cases for Output module
 */

import { Output, JsonResult, CodeError } from '../src/output';

describe('Output Module', () => {
  describe('ok method', () => {
    it('should create success response with string message', () => {
      const result = Output.ok('Success message', { data: 'test' });
      
      expect(result).toEqual({
        code: 0,
        message: 'Success message',
        data: { data: 'test' }
      });
    });

    it('should create success response with custom code', () => {
      const result = Output.ok('Success', null, 200);
      
      expect(result).toEqual({
        code: 200,
        message: 'Success',
        data: null
      });
    });

    it('should handle JsonResult input', () => {
      const jsonResult: JsonResult = {
        code: 100,
        message: 'Custom success',
        data: 'custom data'
      };
      
      const result = Output.ok(jsonResult);
      
      expect(result).toEqual({
        code: 100,
        message: 'Custom success',
        data: 'custom data'
      });
    });

    it('should handle invalid code input', () => {
      const result = Output.ok('Success', null, -1);
      
      expect(result.code).toBe(0);
    });

    it('should handle non-string message', () => {
      const result = Output.ok(null as any, 'data');
      
      expect(result.message).toBe('');
    });

    it('should handle object message conversion', () => {
      const objMessage = { test: 'value' };
      const result = Output.ok(objMessage as any, null);
      
      expect(result.message).toBe('{"test":"value"}');
    });
  });

  describe('fail method', () => {
    it('should create error response with Error object', () => {
      const error = new Error('Test error');
      const result = Output.fail(error);
      
      expect(result).toEqual({
        code: 1,
        message: 'Test error',
        data: undefined
      });
    });

    it('should create error response with string message', () => {
      const result = Output.fail('Error message', null, 400);
      
      expect(result).toEqual({
        code: 400,
        message: 'Error message',
        data: null
      });
    });

    it('should handle CodeError object', () => {
      const codeError: CodeError = {
        code: 1001,
        message: 'Validation failed',
        data: { field: 'email' }
      };
      
      const result = Output.fail(codeError);
      
      expect(result).toEqual({
        code: 1001,
        message: 'Validation failed',
        data: { field: 'email' }
      });
    });

    it('should handle CodeError with invalid code', () => {
      const codeError: CodeError = {
        code: -1,
        message: 'Invalid code error'
      };
      
      const result = Output.fail(codeError, null, 500);
      
      expect(result.code).toBe(500);
    });

    it('should handle invalid code input', () => {
      const result = Output.fail('Error', null, 0);
      
      expect(result.code).toBe(1);
    });

    it('should handle empty string message', () => {
      const result = Output.fail('   ');
      
      expect(result.message).toBe('Unknown error');
    });

    it('should handle unknown error types', () => {
      const result = Output.fail(123);
      
      expect(result.message).toBe('123');
      expect(result.code).toBe(1);
    });

    it('should handle null/undefined errors', () => {
      const nullResult = Output.fail(null);
      const undefinedResult = Output.fail(undefined);
      
      expect(nullResult.message).toBe('Unknown error occurred');
      expect(undefinedResult.message).toBe('Unknown error occurred');
    });

    it('should handle Error without message', () => {
      const error = new Error();
      const result = Output.fail(error);
      
      expect(result.message).toBe('Unknown error');
    });
  });

  describe('paginate method', () => {
    it('should create paginated response', () => {
      const items = [1, 2, 3, 4, 5];
      const result = Output.paginate(items, 50, 2, 10);
      
      expect(result.code).toBe(0);
      expect(result.message).toBe('Success');
      expect(result.data.items).toEqual(items);
      expect(result.data.pagination).toEqual({
        total: 50,
        page: 2,
        pageSize: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: true
      });
    });

    it('should handle first page', () => {
      const items = ['a', 'b'];
      const result = Output.paginate(items, 20, 1, 5);
      
      expect(result.data.pagination.hasNext).toBe(true);
      expect(result.data.pagination.hasPrev).toBe(false);
    });

    it('should handle last page', () => {
      const items = ['x', 'y'];
      const result = Output.paginate(items, 12, 3, 5);
      
      expect(result.data.pagination.hasNext).toBe(false);
      expect(result.data.pagination.hasPrev).toBe(true);
      expect(result.data.pagination.totalPages).toBe(3);
    });

    it('should handle invalid inputs', () => {
      const result = Output.paginate(null as any, -10, 0, -5, 'Custom message');
      
      expect(result.data.items).toEqual([]);
      expect(result.data.pagination.total).toBe(0);
      expect(result.data.pagination.page).toBe(1);
      expect(result.data.pagination.pageSize).toBe(1);
      expect(result.message).toBe('Custom message');
    });

    it('should handle single page', () => {
      const items = [1, 2, 3];
      const result = Output.paginate(items, 3, 1, 10);
      
      expect(result.data.pagination.totalPages).toBe(1);
      expect(result.data.pagination.hasNext).toBe(false);
      expect(result.data.pagination.hasPrev).toBe(false);
    });
  });

  describe('withMeta method', () => {
    it('should create response with metadata', () => {
      const data = { id: 1, name: 'test' };
      const meta = { version: '1.0', timestamp: 123456789 };
      
      const result = Output.withMeta('Success with meta', data, meta);
      
      expect(result).toEqual({
        code: 0,
        message: 'Success with meta',
        data: {
          data: data,
          meta: meta
        }
      });
    });

    it('should handle empty metadata', () => {
      const data = { test: 'value' };
      const result = Output.withMeta('Success', data, {});
      
      expect(result.data).toEqual({
        data: data
      });
      expect(result.data).not.toHaveProperty('meta');
    });

    it('should handle undefined metadata', () => {
      const data = { test: 'value' };
      const result = Output.withMeta('Success', data);
      
      expect(result.data).toEqual({
        data: data
      });
      expect(result.data).not.toHaveProperty('meta');
    });

    it('should handle custom code', () => {
      const result = Output.withMeta('Custom', null, { info: 'test' }, 201);
      
      expect(result.code).toBe(201);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety with generics', () => {
      interface User {
        id: number;
        name: string;
      }
      
      const user: User = { id: 1, name: 'John' };
      const result = Output.ok<User>('User found', user);
      
      // TypeScript should infer the correct type
      expect(result.data.id).toBe(1);
      expect(result.data.name).toBe('John');
    });

    it('should handle complex nested types', () => {
      interface ApiResponse {
        users: Array<{ id: number; email: string }>;
        count: number;
      }
      
      const data: ApiResponse = {
        users: [{ id: 1, email: 'test@example.com' }],
        count: 1
      };
      
      const result = Output.ok<ApiResponse>('Users retrieved', data);
      
      expect(result.data.users).toHaveLength(1);
      expect(result.data.count).toBe(1);
    });
  });
}); 