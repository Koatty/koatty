/**
 * Test cases for utils module
 */

import { prevent, isException, toSafeError, isNetworkError } from '../src/utils';
import { Exception } from '../src/exception';

describe('Utils Module', () => {
  describe('prevent', () => {
    it('should return a rejected promise with PREVENT_NEXT_PROCESS error', async () => {
      const promise = prevent();
      
      await expect(promise).rejects.toThrow('PREVENT_NEXT_PROCESS');
    });
  });

  describe('isException', () => {
    it('should return true for Exception instances', () => {
      const exception = new Exception('Test exception');
      expect(isException(exception)).toBe(true);
    });

    it('should return true for objects with Exception type', () => {
      const exceptionLike = {
        type: 'Exception',
        message: 'Test',
        code: 1,
        status: 500
      };
      expect(isException(exceptionLike)).toBe(true);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Regular error');
      expect(isException(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isException(null)).toBe(false);
      expect(isException(undefined)).toBe(false);
      expect(isException('string')).toBe(false);
      expect(isException(123)).toBe(false);
    });

    it('should return false for objects without all required properties', () => {
      expect(isException({ type: 'Exception' })).toBe(false);
      expect(isException({ message: 'test' })).toBe(false);
    });
  });

  describe('toSafeError', () => {
    it('should return Error instances as-is', () => {
      const error = new Error('Test error');
      expect(toSafeError(error)).toBe(error);
    });

    it('should return Exception instances as-is', () => {
      const exception = new Exception('Test exception');
      expect(toSafeError(exception)).toBe(exception);
    });

    it('should convert strings to Error objects', () => {
      const result = toSafeError('Test error message');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Test error message');
    });

    it('should convert objects with message property to Error', () => {
      const obj = { message: 'Test message', other: 'data' };
      const result = toSafeError(obj);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Test message');
    });

    it('should handle null and undefined', () => {
      const nullResult = toSafeError(null);
      const undefinedResult = toSafeError(undefined);
      
      expect(nullResult).toBeInstanceOf(Error);
      expect(undefinedResult).toBeInstanceOf(Error);
      expect(nullResult.message).toBe('Unknown error occurred');
      expect(undefinedResult.message).toBe('Unknown error occurred');
    });

    it('should handle other types', () => {
      const numberResult = toSafeError(123);
      const booleanResult = toSafeError(true);
      
      expect(numberResult).toBeInstanceOf(Error);
      expect(booleanResult).toBeInstanceOf(Error);
      expect(numberResult.message).toBe('123');
      expect(booleanResult.message).toBe('true');
    });
  });

  describe('isNetworkError', () => {
    it('should return true for network error codes', () => {
      const errors = [
        { code: 'ECONNREFUSED' },
        { code: 'ENOTFOUND' },
        { code: 'ETIMEDOUT' },
        { code: 'ECONNRESET' }
      ];

      errors.forEach(errorData => {
        const error = new Error('Network error');
        (error as any).code = errorData.code;
        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Regular error');
      (error as any).code = 'OTHER_ERROR';
      expect(isNetworkError(error)).toBe(false);
    });

    it('should return false for errors without code', () => {
      const error = new Error('No code error');
      expect(isNetworkError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError('string')).toBe(false);
      expect(isNetworkError(123)).toBe(false);
    });
  });
}); 