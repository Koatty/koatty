/*
 * @Description: Tests for unified parameter extractors
 * @Usage: Test suite for param-extractors.ts
 * @Author: test
 * @Date: 2025-03-16
 */

import 'reflect-metadata';
import { ParamExtractors } from '../src/utils/param-extractors';

jest.mock('../src/payload/payload', () => ({
  bodyParser: jest.fn()
}));

describe('ParamExtractors Tests', () => {
  let mockCtx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCtx = {
      query: { id: '123', name: 'test' },
      params: { userId: '456' },
      headers: { 'content-type': 'application/json', 'x-custom': 'value' },
      get: jest.fn((key: string) => mockCtx.headers[key]),
      request: {
        body: { username: 'alice', age: 30 }
      }
    };
  });

  describe('Task 4.5: Unified Parameter Extractors', () => {
    it('should extract query parameter by name', () => {
      const result = ParamExtractors.query(mockCtx, 'id');
      expect(result).toBe('123');
    });

    it('should extract all query parameters without name', () => {
      const result = ParamExtractors.query(mockCtx);
      expect(result).toEqual({ id: '123', name: 'test' });
    });

    it('should extract header parameter by name', () => {
      const result = ParamExtractors.header(mockCtx, 'content-type');
      expect(result).toBe('application/json');
    });

    it('should extract all headers without name', () => {
      const result = ParamExtractors.header(mockCtx);
      expect(result).toEqual(mockCtx.headers);
    });

    it('should extract path parameter by name', () => {
      const result = ParamExtractors.path(mockCtx, 'userId');
      expect(result).toBe('456');
    });

    it('should extract all path parameters without name', () => {
      const result = ParamExtractors.path(mockCtx);
      expect(result).toEqual({ userId: '456' });
    });

    it('should extract body parameter by name', async () => {
      const { bodyParser } = require('../src/payload/payload');
      bodyParser.mockResolvedValue({ username: 'alice', age: 30 });

      const result = await ParamExtractors.body(mockCtx, 'username');
      expect(result).toBe('alice');
      expect(bodyParser).toHaveBeenCalledWith(mockCtx, undefined);
    });

    it('should extract entire body without name', async () => {
      const { bodyParser } = require('../src/payload/payload');
      const mockBody = { username: 'alice', age: 30 };
      bodyParser.mockResolvedValue(mockBody);

      const result = await ParamExtractors.body(mockCtx);
      expect(result).toEqual(mockBody);
    });

    it('should extract file parameter by name', async () => {
      const { bodyParser } = require('../src/payload/payload');
      bodyParser.mockResolvedValue({ 
        file: { avatar: 'avatar.jpg', document: 'doc.pdf' } 
      });

      const result = await ParamExtractors.file(mockCtx, 'avatar');
      expect(result).toBe('avatar.jpg');
    });

    it('should extract all files without name', async () => {
      const { bodyParser } = require('../src/payload/payload');
      const mockFiles = { avatar: 'avatar.jpg', document: 'doc.pdf' };
      bodyParser.mockResolvedValue({ file: mockFiles });

      const result = await ParamExtractors.file(mockCtx);
      expect(result).toEqual(mockFiles);
    });

    it('should call custom extraction function', () => {
      const customFn = jest.fn((ctx, options) => 'custom-value');
      const options = { some: 'option' };

      const result = ParamExtractors.custom(mockCtx, customFn, options);
      
      expect(customFn).toHaveBeenCalledWith(mockCtx, options);
      expect(result).toBe('custom-value');
    });

    it('should maintain monomorphic call sites for query', () => {
      // Call query extractor multiple times to verify consistency
      for (let i = 0; i < 10; i++) {
        const result = ParamExtractors.query(mockCtx, 'id');
        expect(result).toBe('123');
      }
    });

    it('should maintain monomorphic call sites for header', () => {
      // Call header extractor multiple times to verify consistency
      for (let i = 0; i < 10; i++) {
        const result = ParamExtractors.header(mockCtx, 'content-type');
        expect(result).toBe('application/json');
      }
    });

    it('should maintain monomorphic call sites for path', () => {
      // Call path extractor multiple times to verify consistency
      for (let i = 0; i < 10; i++) {
        const result = ParamExtractors.path(mockCtx, 'userId');
        expect(result).toBe('456');
      }
    });
  });
});

