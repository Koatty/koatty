/*
 * @Description: HTTP/3 Frame Parser unit tests
 * @Usage: HTTP/3 帧解析器单元测试
 * @Author: richen
 * @Date: 2025-01-12 19:00:00
 */

import {
  Http3FrameParser,
  Http3FrameSerializer,
  Http3MessageHandler,
  Http3FrameType,
  Http3Settings,
} from '../../../src/utils/http3/frames';
import { QPACKEncoder, QPACKDecoder } from '../../../src/utils/http3/qpack';

describe('HTTP/3 Frame Parser', () => {
  describe('Http3FrameSerializer', () => {
    it('should serialize DATA frame', () => {
      const data = Buffer.from('Hello, HTTP/3!');
      const serialized = Http3FrameSerializer.serializeDataFrame(data);

      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBeGreaterThan(data.length); // Includes type and length
      expect(serialized[0]).toBe(Http3FrameType.DATA); // First byte should be DATA type
    });

    it('should serialize HEADERS frame', () => {
      const headers = Buffer.from('encoded-headers');
      const serialized = Http3FrameSerializer.serializeHeadersFrame(headers);

      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBeGreaterThan(headers.length);
      expect(serialized[0]).toBe(Http3FrameType.HEADERS);
    });

    it('should serialize SETTINGS frame', () => {
      const settings = new Map<number, number>([
        [Http3Settings.QPACK_MAX_TABLE_CAPACITY, 4096],
        [Http3Settings.MAX_FIELD_SECTION_SIZE, 16384],
      ]);

      const serialized = Http3FrameSerializer.serializeSettingsFrame(settings);

      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized[0]).toBe(Http3FrameType.SETTINGS);
    });

    it('should serialize GOAWAY frame', () => {
      const streamId = BigInt(42);
      const serialized = Http3FrameSerializer.serializeGoAwayFrame(streamId);

      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized[0]).toBe(Http3FrameType.GOAWAY);
    });

    it('should serialize empty DATA frame', () => {
      const data = Buffer.alloc(0);
      const serialized = Http3FrameSerializer.serializeDataFrame(data);

      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBeGreaterThan(0); // Still has type and length bytes
    });
  });

  describe('Http3FrameParser', () => {
    it('should parse DATA frame', () => {
      const data = Buffer.from('Test data');
      const serialized = Http3FrameSerializer.serializeDataFrame(data);

      const { frames, remaining } = Http3FrameParser.parse(serialized);

      expect(frames).toHaveLength(1);
      expect(frames[0].type).toBe(Http3FrameType.DATA);
      expect(frames[0].payload).toEqual(data);
      expect(remaining.length).toBe(0);
    });

    it('should parse HEADERS frame', () => {
      const headers = Buffer.from('test-headers');
      const serialized = Http3FrameSerializer.serializeHeadersFrame(headers);

      const { frames, remaining } = Http3FrameParser.parse(serialized);

      expect(frames).toHaveLength(1);
      expect(frames[0].type).toBe(Http3FrameType.HEADERS);
      expect(frames[0].payload).toEqual(headers);
      expect(remaining.length).toBe(0);
    });

    it('should parse SETTINGS frame', () => {
      const settings = new Map<number, number>([
        [Http3Settings.QPACK_MAX_TABLE_CAPACITY, 4096],
        [Http3Settings.MAX_FIELD_SECTION_SIZE, 8192],
      ]);

      const serialized = Http3FrameSerializer.serializeSettingsFrame(settings);
      const { frames } = Http3FrameParser.parse(serialized);

      expect(frames).toHaveLength(1);
      expect(frames[0].type).toBe(Http3FrameType.SETTINGS);
      
      const parsedFrame: any = frames[0];
      expect(parsedFrame.settings).toBeInstanceOf(Map);
      expect(parsedFrame.settings.get(Http3Settings.QPACK_MAX_TABLE_CAPACITY)).toBe(4096);
      expect(parsedFrame.settings.get(Http3Settings.MAX_FIELD_SECTION_SIZE)).toBe(8192);
    });

    it('should parse GOAWAY frame', () => {
      const streamId = BigInt(100);
      const serialized = Http3FrameSerializer.serializeGoAwayFrame(streamId);

      const { frames } = Http3FrameParser.parse(serialized);

      expect(frames).toHaveLength(1);
      expect(frames[0].type).toBe(Http3FrameType.GOAWAY);
      
      const parsedFrame: any = frames[0];
      expect(typeof parsedFrame.streamId).toBe('bigint');
    });

    it('should parse multiple frames', () => {
      const frame1 = Http3FrameSerializer.serializeDataFrame(Buffer.from('data1'));
      const frame2 = Http3FrameSerializer.serializeDataFrame(Buffer.from('data2'));
      const combined = Buffer.concat([frame1, frame2]);

      const { frames, remaining } = Http3FrameParser.parse(combined);

      expect(frames).toHaveLength(2);
      expect(frames[0].type).toBe(Http3FrameType.DATA);
      expect(frames[1].type).toBe(Http3FrameType.DATA);
      expect(remaining.length).toBe(0);
    });

    it('should handle incomplete frame data', () => {
      const data = Buffer.from('Complete data');
      const serialized = Http3FrameSerializer.serializeDataFrame(data);
      const incomplete = serialized.slice(0, serialized.length - 5); // Cut off last 5 bytes

      const { frames, remaining } = Http3FrameParser.parse(incomplete);

      expect(frames).toHaveLength(0); // No complete frames
      expect(remaining.length).toBeGreaterThan(0); // Remaining data for next parse
    });

    it('should handle empty buffer', () => {
      const { frames, remaining } = Http3FrameParser.parse(Buffer.alloc(0));

      expect(frames).toHaveLength(0);
      expect(remaining.length).toBe(0);
    });

    it('should handle large frame data', () => {
      const largeData = Buffer.alloc(100000, 'x');
      const serialized = Http3FrameSerializer.serializeDataFrame(largeData);

      const { frames } = Http3FrameParser.parse(serialized);

      expect(frames).toHaveLength(1);
      expect(frames[0].payload.length).toBe(100000);
    });
  });

  describe('Http3FrameSerializer varint encoding', () => {
    it('should encode 1-byte varint (0-63)', () => {
      const encoded = Http3FrameSerializer.encodeVarint(42);
      expect(encoded.length).toBe(1);
      expect(encoded[0]).toBe(42);
    });

    it('should encode 2-byte varint (64-16383)', () => {
      const encoded = Http3FrameSerializer.encodeVarint(100);
      expect(encoded.length).toBe(2);
      expect((encoded[0] & 0xC0) >> 6).toBe(1); // First 2 bits should be 01
    });

    it('should encode 4-byte varint (16384-1073741823)', () => {
      const encoded = Http3FrameSerializer.encodeVarint(100000);
      expect(encoded.length).toBe(4);
      expect((encoded[0] & 0xC0) >> 6).toBe(2); // First 2 bits should be 10
    });

    it('should encode 8-byte varint (>1073741823)', () => {
      const encoded = Http3FrameSerializer.encodeVarint(2000000000);
      expect(encoded.length).toBe(8);
      expect((encoded[0] & 0xC0) >> 6).toBe(3); // First 2 bits should be 11
    });

    it('should throw on negative values', () => {
      expect(() => Http3FrameSerializer.encodeVarint(-1)).toThrow();
    });
  });

  describe('Http3MessageHandler', () => {
    let encoder: QPACKEncoder;
    let decoder: QPACKDecoder;

    beforeEach(() => {
      encoder = new QPACKEncoder(4096);
      decoder = new QPACKDecoder(4096);
    });

    it('should extract HTTP request from frames', () => {
      const requestHeaders: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/api/users'],
        [':scheme', 'https'],
        ['accept', 'application/json'],
      ];

      const encodedHeaders = encoder.encode(requestHeaders);
      const headersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedHeaders);
      const dataFrame = Http3FrameSerializer.serializeDataFrame(Buffer.from('request body'));

      const combined = Buffer.concat([headersFrame, dataFrame]);
      const { frames } = Http3FrameParser.parse(combined);

      const request = Http3MessageHandler.extractRequest(frames, decoder);

      expect(request).not.toBeNull();
      expect(request?.method).toBe('GET');
      expect(request?.url).toBe('/api/users');
      expect(request?.body).toBeInstanceOf(Buffer);
    });

    it('should create HTTP response frames', () => {
      const statusCode = 200;
      const headers = {
        'content-type': 'application/json',
        'content-length': '13',
      };
      const body = Buffer.from('{"ok": true}');

      const frameBuffers = Http3MessageHandler.createResponse(
        statusCode,
        headers,
        body,
        encoder
      );

      expect(frameBuffers).toBeInstanceOf(Array);
      expect(frameBuffers.length).toBeGreaterThan(0);

      // Parse and verify the response frames
      const combined = Buffer.concat(frameBuffers);
      const { frames } = Http3FrameParser.parse(combined);

      expect(frames.length).toBeGreaterThan(0);
      expect(frames[0].type).toBe(Http3FrameType.HEADERS);
    });

    it('should handle request without body', () => {
      const requestHeaders: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
      ];

      const encodedHeaders = encoder.encode(requestHeaders);
      const headersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedHeaders);

      const { frames } = Http3FrameParser.parse(headersFrame);
      const request = Http3MessageHandler.extractRequest(frames, decoder);

      expect(request).not.toBeNull();
      expect(request?.body.length).toBe(0);
    });

    it('should handle response with empty body', () => {
      const statusCode = 204; // No Content
      const headers = {};
      const body = Buffer.alloc(0);

      const frameBuffers = Http3MessageHandler.createResponse(
        statusCode,
        headers,
        body,
        encoder
      );

      expect(frameBuffers).toBeInstanceOf(Array);
      expect(frameBuffers.length).toBeGreaterThan(0);
    });

    it('should handle multiple header values', () => {
      const statusCode = 200;
      const headers = {
        'set-cookie': ['session=abc123', 'user=john'],
        'content-type': 'text/html',
      };
      const body = Buffer.from('<html></html>');

      const frameBuffers = Http3MessageHandler.createResponse(
        statusCode,
        headers,
        body,
        encoder
      );

      expect(frameBuffers).toBeInstanceOf(Array);

      // Verify frames can be parsed
      const combined = Buffer.concat(frameBuffers);
      const { frames } = Http3FrameParser.parse(combined);
      expect(frames.length).toBeGreaterThan(0);
    });
  });

  describe('Integration tests', () => {
    let encoder: QPACKEncoder;
    let decoder: QPACKDecoder;

    beforeEach(() => {
      encoder = new QPACKEncoder(4096);
      decoder = new QPACKDecoder(4096);
    });

    it('should handle complete request-response cycle', () => {
      // 1. Create request
      const requestHeaders: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/data'],
        [':scheme', 'https'],
        ['content-type', 'application/json'],
      ];

      const requestBody = Buffer.from(JSON.stringify({ name: 'test' }));
      const encodedReqHeaders = encoder.encode(requestHeaders);
      const reqHeadersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedReqHeaders);
      const reqDataFrame = Http3FrameSerializer.serializeDataFrame(requestBody);

      // 2. Parse request
      const reqCombined = Buffer.concat([reqHeadersFrame, reqDataFrame]);
      const { frames: reqFrames } = Http3FrameParser.parse(reqCombined);
      const request = Http3MessageHandler.extractRequest(reqFrames, decoder);

      expect(request).not.toBeNull();
      expect(request?.method).toBe('POST');
      expect(request?.url).toBe('/api/data');

      // 3. Create response
      const responseBody = Buffer.from(JSON.stringify({ id: 1, name: 'test' }));
      const responseFrames = Http3MessageHandler.createResponse(
        201,
        { 'content-type': 'application/json' },
        responseBody,
        encoder
      );

      // 4. Parse response
      const resCombined = Buffer.concat(responseFrames);
      const { frames: resFrames } = Http3FrameParser.parse(resCombined);

      expect(resFrames.length).toBeGreaterThan(0);
      expect(resFrames[0].type).toBe(Http3FrameType.HEADERS);
    });

    it('should handle streamed data with multiple DATA frames', () => {
      const chunk1 = Buffer.from('chunk1');
      const chunk2 = Buffer.from('chunk2');
      const chunk3 = Buffer.from('chunk3');

      const frame1 = Http3FrameSerializer.serializeDataFrame(chunk1);
      const frame2 = Http3FrameSerializer.serializeDataFrame(chunk2);
      const frame3 = Http3FrameSerializer.serializeDataFrame(chunk3);

      const combined = Buffer.concat([frame1, frame2, frame3]);
      const { frames } = Http3FrameParser.parse(combined);

      expect(frames).toHaveLength(3);
      
      const totalData = Buffer.concat(frames.map(f => f.payload));
      expect(totalData.toString()).toBe('chunk1chunk2chunk3');
    });
  });

  describe('Performance', () => {
    it('should parse 1000 frames efficiently', () => {
      const frames: Buffer[] = [];
      for (let i = 0; i < 1000; i++) {
        frames.push(Http3FrameSerializer.serializeDataFrame(Buffer.from(`data${i}`)));
      }

      const combined = Buffer.concat(frames);

      const startTime = Date.now();
      const { frames: parsed } = Http3FrameParser.parse(combined);
      const parseTime = Date.now() - startTime;

      expect(parsed).toHaveLength(1000);
      expect(parseTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should serialize 1000 frames efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        Http3FrameSerializer.serializeDataFrame(Buffer.from(`data${i}`));
      }
      
      const serializeTime = Date.now() - startTime;

      expect(serializeTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});

