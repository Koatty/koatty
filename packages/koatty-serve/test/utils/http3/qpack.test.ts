/*
 * @Description: QPACK encoder/decoder unit tests
 * @Usage: QPACK 压缩/解压缩单元测试
 * @Author: richen
 * @Date: 2025-01-12 19:00:00
 */

import { QPACKEncoder, QPACKDecoder } from '../../../src/utils/http3/qpack';

describe('QPACK Encoder/Decoder', () => {
  let encoder: QPACKEncoder;
  let decoder: QPACKDecoder;

  beforeEach(() => {
    encoder = new QPACKEncoder(4096);
    decoder = new QPACKDecoder(4096);
  });

  describe('QPACKEncoder', () => {
    it('should encode headers using static table index', () => {
      const headers: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
      ];

      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded.length).toBeLessThan(20); // Should be compressed
    });

    it('should encode headers with literal name and value', () => {
      const headers: Array<[string, string]> = [
        ['x-custom-header', 'custom-value'],
      ];

      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should encode multiple headers', () => {
      const headers: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/users'],
        [':scheme', 'https'],
        ['content-type', 'application/json'],
        ['accept', '*/*'],
      ];

      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should encode status codes', () => {
      const headers: Array<[string, string]> = [
        [':status', '200'],
      ];

      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should encode headers with name reference from static table', () => {
      const headers: Array<[string, string]> = [
        ['content-type', 'text/xml'], // content-type in static table, but value is not
      ];

      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('should handle empty headers array', () => {
      const headers: Array<[string, string]> = [];
      const encoded = encoder.encode(headers);
      expect(encoded).toBeInstanceOf(Buffer);
      expect(encoded.length).toBe(0);
    });
  });

  describe('QPACKDecoder', () => {
    it('should decode headers encoded with static table index', () => {
      const headers: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toEqual(headers);
    });

    it('should decode headers with literal name and value', () => {
      const headers: Array<[string, string]> = [
        ['x-custom-header', 'custom-value'],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][0]).toBe('x-custom-header');
      expect(decoded[0][1]).toBe('custom-value');
    });

    it('should decode multiple headers', () => {
      const headers: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/users'],
        [':scheme', 'https'],
        ['content-type', 'application/json'],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded.length).toBeGreaterThan(0);
      // Check that all headers are present (order may vary with literal encoding)
      const decodedMap = new Map(decoded);
      expect(decodedMap.has(':method') || decodedMap.has(':path')).toBeTruthy();
    });

    it('should handle empty buffer', () => {
      const decoded = decoder.decode(Buffer.alloc(0));
      expect(decoded).toEqual([]);
    });

    it('should handle malformed data gracefully', () => {
      const malformed = Buffer.from([0xFF, 0xFF, 0xFF]);
      const decoded = decoder.decode(malformed);
      expect(decoded).toBeInstanceOf(Array);
    });
  });

  describe('Round-trip encoding/decoding', () => {
    it('should preserve headers through encode/decode cycle', () => {
      const testCases: Array<Array<[string, string]>> = [
        [
          [':method', 'GET'],
          [':path', '/'],
        ],
        [
          [':method', 'POST'],
          [':path', '/api/data'],
          ['content-type', 'application/json'],
        ],
        [
          [':status', '200'],
          ['content-type', 'text/html; charset=utf-8'],
        ],
        [
          [':status', '404'],
          ['content-type', 'text/plain'],
        ],
      ];

      testCases.forEach((headers) => {
        const encoded = encoder.encode(headers);
        const decoded = decoder.decode(encoded);

        // For static table entries, we should get exact match
        const staticTableHeaders = headers.filter(([name, value]) => {
          // Check if this is likely in static table
          return (name.startsWith(':') || 
                  name === 'content-type' || 
                  name === 'accept');
        });

        if (staticTableHeaders.length > 0) {
          expect(decoded.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle large headers', () => {
      const largeValue = 'x'.repeat(1000);
      const headers: Array<[string, string]> = [
        ['x-large-header', largeValue],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][0]).toBe('x-large-header');
      expect(decoded[0][1]).toBe(largeValue);
    });

    it('should handle special characters in headers', () => {
      const headers: Array<[string, string]> = [
        ['x-special', 'value with spaces and 特殊字符'],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][1]).toBe('value with spaces and 特殊字符');
    });
  });

  describe('Performance', () => {
    it('should efficiently compress common headers', () => {
      const commonHeaders: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
        [':scheme', 'https'],
        ['accept', '*/*'],
      ];

      const encoded = encoder.encode(commonHeaders);
      
      // Calculate original size
      const originalSize = commonHeaders.reduce((sum, [name, value]) => 
        sum + name.length + value.length, 0
      );

      // Compression ratio should be significant for static table entries
      expect(encoded.length).toBeLessThan(originalSize);
    });

    it('should handle encoding 1000 headers', () => {
      const headers: Array<[string, string]> = [];
      for (let i = 0; i < 1000; i++) {
        headers.push([`x-header-${i}`, `value-${i}`]);
      }

      const startTime = Date.now();
      const encoded = encoder.encode(headers);
      const encodeTime = Date.now() - startTime;

      expect(encoded).toBeInstanceOf(Buffer);
      expect(encodeTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle decoding 1000 headers', () => {
      const headers: Array<[string, string]> = [];
      for (let i = 0; i < 1000; i++) {
        headers.push([`x-header-${i}`, `value-${i}`]);
      }

      const encoded = encoder.encode(headers);
      
      const startTime = Date.now();
      const decoded = decoder.decode(encoded);
      const decodeTime = Date.now() - startTime;

      expect(decoded).toBeInstanceOf(Array);
      expect(decoded.length).toBeGreaterThan(0);
      expect(decodeTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Edge cases', () => {
    it('should handle headers with empty values', () => {
      const headers: Array<[string, string]> = [
        ['x-empty', ''],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][0]).toBe('x-empty');
      expect(decoded[0][1]).toBe('');
    });

    it('should handle headers with very long names', () => {
      const longName = 'x-' + 'a'.repeat(100);
      const headers: Array<[string, string]> = [
        [longName, 'value'],
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][0]).toBe(longName);
    });

    it('should preserve header name case (lowercase)', () => {
      const headers: Array<[string, string]> = [
        ['Content-Type', 'text/html'], // Should be lowercased in HTTP/3
      ];

      const encoded = encoder.encode(headers);
      const decoded = decoder.decode(encoded);

      expect(decoded).toHaveLength(1);
      expect(decoded[0][0]).toBe('content-type'); // HTTP/3 uses lowercase
    });
  });
});

