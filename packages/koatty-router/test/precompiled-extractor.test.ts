/*
 * @Description: Tests for pre-compiled parameter extractors
 * @Usage: Test suite for generatePrecompiledExtractor
 * @Author: test
 * @Date: 2025-03-16
 */

import 'reflect-metadata';
import { generatePrecompiledExtractor, ParamSourceType } from '../src/utils/inject';

describe('Pre-compiled Extractor Tests', () => {
  describe('Task 4.6: Pre-compiled Parameter Extractors', () => {
    it('should generate query extractor with paramName', () => {
      const param = {
        sourceType: ParamSourceType.QUERY,
        paramName: 'id',
        name: 'id'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();
      expect(typeof extractor).toBe('function');

      const mockCtx = { query: { id: '123', name: 'test' } };
      const result = extractor!(mockCtx);
      expect(result).toBe('123');
    });

    it('should generate query extractor without paramName', () => {
      const param = {
        sourceType: ParamSourceType.QUERY,
        name: 'query'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();

      const mockCtx = { query: { id: '123', name: 'test' } };
      const result = extractor!(mockCtx);
      expect(result).toEqual({ id: '123', name: 'test' });
    });

    it('should generate header extractor with paramName', () => {
      const param = {
        sourceType: ParamSourceType.HEADER,
        paramName: 'content-type',
        name: 'contentType'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();

      const mockCtx = {
        get: (key: string) => key === 'content-type' ? 'application/json' : undefined
      };
      const result = extractor!(mockCtx);
      expect(result).toBe('application/json');
    });

    it('should generate header extractor without paramName', () => {
      const param = {
        sourceType: ParamSourceType.HEADER,
        name: 'headers'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();

      const mockHeaders = { 'content-type': 'application/json' };
      const mockCtx = { headers: mockHeaders };
      const result = extractor!(mockCtx);
      expect(result).toEqual(mockHeaders);
    });

    it('should generate path extractor with paramName', () => {
      const param = {
        sourceType: ParamSourceType.PATH,
        paramName: 'userId',
        name: 'userId'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();

      const mockCtx = { params: { userId: '456', orderId: '789' } };
      const result = extractor!(mockCtx);
      expect(result).toBe('456');
    });

    it('should generate path extractor without paramName', () => {
      const param = {
        sourceType: ParamSourceType.PATH,
        name: 'params'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeDefined();

      const mockParams = { userId: '456', orderId: '789' };
      const mockCtx = { params: mockParams };
      const result = extractor!(mockCtx);
      expect(result).toEqual(mockParams);
    });

    it('should return null for BODY sourceType (async required)', () => {
      const param = {
        sourceType: ParamSourceType.BODY,
        paramName: 'username',
        name: 'username'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeNull();
    });

    it('should return null for FILE sourceType (async required)', () => {
      const param = {
        sourceType: ParamSourceType.FILE,
        paramName: 'avatar',
        name: 'avatar'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeNull();
    });

    it('should return null for CUSTOM sourceType', () => {
      const param = {
        sourceType: ParamSourceType.CUSTOM,
        name: 'custom',
        fn: () => 'custom-value'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      expect(extractor).toBeNull();
    });

    it('should prefer paramName over name for extraction', () => {
      const param = {
        sourceType: ParamSourceType.QUERY,
        paramName: 'realName',
        name: 'differentName'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      const mockCtx = { query: { realName: 'correct', differentName: 'wrong' } };
      const result = extractor!(mockCtx);
      expect(result).toBe('correct');
    });

    it('should handle missing query gracefully', () => {
      const param = {
        sourceType: ParamSourceType.QUERY,
        name: 'query'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      const mockCtx = {}; // No query
      const result = extractor!(mockCtx);
      expect(result).toEqual({});
    });

    it('should handle missing params gracefully', () => {
      const param = {
        sourceType: ParamSourceType.PATH,
        name: 'params'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      const mockCtx = {}; // No params
      const result = extractor!(mockCtx);
      expect(result).toEqual({});
    });

    it('should generate consistent results for repeated calls', () => {
      const param = {
        sourceType: ParamSourceType.QUERY,
        paramName: 'id',
        name: 'id'
      } as any;

      const extractor = generatePrecompiledExtractor(param);
      const mockCtx = { query: { id: '123' } };

      // Call multiple times to verify consistency (monomorphic call sites)
      for (let i = 0; i < 100; i++) {
        const result = extractor!(mockCtx);
        expect(result).toBe('123');
      }
    });

    it('should create isolated extractors for different parameters', () => {
      const param1 = {
        sourceType: ParamSourceType.QUERY,
        paramName: 'id',
        name: 'id'
      } as any;

      const param2 = {
        sourceType: ParamSourceType.QUERY,
        paramName: 'name',
        name: 'name'
      } as any;

      const extractor1 = generatePrecompiledExtractor(param1);
      const extractor2 = generatePrecompiledExtractor(param2);

      const mockCtx = { query: { id: '123', name: 'test' } };
      
      expect(extractor1!(mockCtx)).toBe('123');
      expect(extractor2!(mockCtx)).toBe('test');
    });
  });
});

