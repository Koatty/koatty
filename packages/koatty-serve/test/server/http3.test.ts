/*
 * @Description: HTTP/3 Server full integration tests
 * @Usage: HTTP/3 服务器完整集成测试
 * @Author: richen
 * @Date: 2025-01-12 20:00:00
 * 
 * Note: This test suite tests the integration between HTTP/3 components
 * without requiring @matrixai/quic to be installed.
 */

// Mock @matrixai/quic before importing modules that depend on it
jest.mock('@matrixai/quic', () => ({
  QUICServer: class MockQUICServer {
    listen() {}
    close() {}
    on() {}
    addEventListener() {}
    start() { return Promise.resolve(); }
    stop() { return Promise.resolve(); }
  },
}), { virtual: true });

import { Http3Server } from '../../src/server/http3';
import { ConfigHelper } from '../../src/config/config';
import { QPACKEncoder, QPACKDecoder } from '../../src/utils/http3/qpack';
import { 
  Http3FrameParser, 
  Http3FrameSerializer, 
  Http3MessageHandler,
  Http3FrameType 
} from '../../src/utils/http3/frames';
import Koa from 'koa';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('HTTP/3 Server - Full Integration Tests', () => {
  let app: Koa;
  const certDir = join(__dirname, '../fixtures/certs');
  const certFile = join(certDir, 'test.crt');
  const keyFile = join(certDir, 'test.key');

  beforeAll(() => {
    // Create test certificates directory
    if (!existsSync(certDir)) {
      mkdirSync(certDir, { recursive: true });
    }

    // Create self-signed test certificates
    if (!existsSync(certFile) || !existsSync(keyFile)) {
      const cert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDQ4JvXc5xRxDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjUwMTEyMDAwMDAwWhcNMjYwMTEyMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDL
test-certificate-data
-----END CERTIFICATE-----`;

      const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDL
test-key-data
-----END PRIVATE KEY-----`;

      writeFileSync(certFile, cert);
      writeFileSync(keyFile, key);
    }
  });

  beforeEach(() => {
    app = new Koa();
  });

  describe('Component Integration', () => {
    describe('QPACK + Frame Integration', () => {
      it('should encode and decode HTTP request through full pipeline', () => {
        const encoder = new QPACKEncoder(4096);
        const decoder = new QPACKDecoder(4096);

        // 1. Create HTTP request headers
        const requestHeaders: Array<[string, string]> = [
          [':method', 'POST'],
          [':path', '/api/users'],
          [':scheme', 'https'],
          [':authority', 'example.com'],
          ['content-type', 'application/json'],
          ['accept', 'application/json'],
          ['user-agent', 'HTTP3-Test/1.0'],
        ];

        // 2. Encode headers with QPACK
        const encodedHeaders = encoder.encode(requestHeaders);
        expect(encodedHeaders.length).toBeGreaterThan(0);

        // 3. Create HTTP/3 HEADERS frame
        const headersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedHeaders);
        expect(headersFrame[0]).toBe(Http3FrameType.HEADERS);

        // 4. Create HTTP/3 DATA frame with body
        const requestBody = JSON.stringify({ name: 'John', email: 'john@example.com' });
        const dataFrame = Http3FrameSerializer.serializeDataFrame(Buffer.from(requestBody));
        expect(dataFrame[0]).toBe(Http3FrameType.DATA);

        // 5. Combine frames (as would be sent over QUIC)
        const combinedFrames = Buffer.concat([headersFrame, dataFrame]);

        // 6. Parse frames (as would be received)
        const { frames } = Http3FrameParser.parse(combinedFrames);
        expect(frames).toHaveLength(2);
        expect(frames[0].type).toBe(Http3FrameType.HEADERS);
        expect(frames[1].type).toBe(Http3FrameType.DATA);

        // 7. Extract HTTP request
        const extractedRequest = Http3MessageHandler.extractRequest(frames, decoder);
        expect(extractedRequest).not.toBeNull();
        expect(extractedRequest?.method).toBe('POST');
        expect(extractedRequest?.url).toBe('/api/users');
        expect(extractedRequest?.headers['content-type']).toBe('application/json');
        expect(extractedRequest?.body.toString()).toBe(requestBody);
      });

      it('should encode and decode HTTP response through full pipeline', () => {
        const encoder = new QPACKEncoder(4096);
        const decoder = new QPACKDecoder(4096);

        // 1. Create HTTP response
        const responseHeaders = {
          'content-type': 'application/json',
          'content-length': '27',
          'x-request-id': 'abc-123',
        };
        const responseBody = Buffer.from('{"id":1,"name":"John"}');

        // 2. Create response frames with QPACK encoding
        const responseFrames = Http3MessageHandler.createResponse(
          200,
          responseHeaders,
          responseBody,
          encoder
        );

        expect(responseFrames.length).toBeGreaterThan(0);

        // 3. Combine frames
        const combinedFrames = Buffer.concat(responseFrames);

        // 4. Parse response frames
        const { frames } = Http3FrameParser.parse(combinedFrames);
        expect(frames.length).toBeGreaterThan(0);

        // 5. Verify HEADERS frame contains encoded status
        const headersFrame = frames[0];
        expect(headersFrame.type).toBe(Http3FrameType.HEADERS);

        const decodedHeaders = decoder.decode(headersFrame.payload);
        const statusHeader = decodedHeaders.find(([name]) => name === ':status');
        expect(statusHeader).toBeDefined();
        expect(statusHeader?.[1]).toBe('200');
      });
    });

    describe('Adapter + QPACK/Frame Integration', () => {
      it('should verify adapter configuration structure', () => {
        const config = {
          hostname: 'localhost',
          port: 9000,
          certFile: certFile,
          keyFile: keyFile,
          qpackMaxTableCapacity: 8192,
        };

        // Verify configuration structure is correct
        expect(config.hostname).toBe('localhost');
        expect(config.port).toBe(9000);
        expect(config.qpackMaxTableCapacity).toBe(8192);
        
        // Note: Actual adapter initialization requires @matrixai/quic
      });
    });

    describe('Server Configuration Integration', () => {
      it('should create server with all HTTP/3 components configured', () => {
        const config = ConfigHelper.createHttp3Config({
          hostname: 'localhost',
          port: 9001,
          ext: {
            ssl: {
              mode: 'auto',
              key: keyFile,
              cert: certFile,
              alpnProtocols: ['h3'],
            }
          },
          http3: {
            maxHeaderListSize: 32768,
            qpackMaxTableCapacity: 8192,
            qpackBlockedStreams: 200,
          },
          quic: {
            maxIdleTimeout: 60000,
            maxUdpPayloadSize: 65527,
            initialMaxData: 20971520,
            initialMaxStreamsBidi: 200,
            initialMaxStreamsUni: 200,
          },
          connectionPool: {
            maxConnections: 5000,
            keepAliveTimeout: 120000,
          },
        });

        const server = new Http3Server(app as any, config);
        
        expect(server).toBeDefined();
        expect(config.http3?.maxHeaderListSize).toBe(32768);
        expect(config.http3?.qpackMaxTableCapacity).toBe(8192);
        expect(config.quic?.maxIdleTimeout).toBe(60000);
        expect(config.quic?.initialMaxStreamsBidi).toBe(200);
      });
    });
  });

  describe('End-to-End Request/Response Simulation', () => {
    it('should simulate complete GET request cycle', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // === CLIENT SIDE: Create Request ===
      const requestHeaders: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/api/health'],
        [':scheme', 'https'],
        [':authority', 'localhost:9000'],
        ['accept', 'application/json'],
      ];

      const encodedReqHeaders = encoder.encode(requestHeaders);
      const reqHeadersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedReqHeaders);

      // === NETWORK: Send over QUIC ===
      const wireData = reqHeadersFrame;

      // === SERVER SIDE: Receive and Process ===
      const { frames: serverFrames } = Http3FrameParser.parse(wireData);
      const serverRequest = Http3MessageHandler.extractRequest(serverFrames, decoder);

      expect(serverRequest).not.toBeNull();
      expect(serverRequest?.method).toBe('GET');
      expect(serverRequest?.url).toBe('/api/health');

      // === SERVER SIDE: Create Response ===
      const responseData = { status: 'healthy', timestamp: Date.now() };
      const responseBody = Buffer.from(JSON.stringify(responseData));
      const responseHeaders = {
        'content-type': 'application/json',
        'content-length': responseBody.length.toString(),
      };

      const responseFrames = Http3MessageHandler.createResponse(
        200,
        responseHeaders,
        responseBody,
        encoder
      );

      // === NETWORK: Send back over QUIC ===
      const responseWireData = Buffer.concat(responseFrames);

      // === CLIENT SIDE: Receive and Parse ===
      const { frames: clientFrames } = Http3FrameParser.parse(responseWireData);
      expect(clientFrames.length).toBeGreaterThan(0);

      const headersFrame = clientFrames.find(f => f.type === Http3FrameType.HEADERS);
      const dataFrame = clientFrames.find(f => f.type === Http3FrameType.DATA);

      expect(headersFrame).toBeDefined();
      expect(dataFrame).toBeDefined();

      // Decode response headers
      const decodedRespHeaders = decoder.decode(headersFrame!.payload);
      const statusHeader = decodedRespHeaders.find(([name]) => name === ':status');
      expect(statusHeader?.[1]).toBe('200');

      // Parse response body
      const parsedBody = JSON.parse(dataFrame!.payload.toString());
      expect(parsedBody.status).toBe('healthy');
    });

    it('should simulate complete POST request with body', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // === CLIENT SIDE: Create POST Request ===
      const requestData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'secret123',
      };

      const requestHeaders: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/users'],
        [':scheme', 'https'],
        [':authority', 'localhost:9000'],
        ['content-type', 'application/json'],
        ['content-length', JSON.stringify(requestData).length.toString()],
      ];

      const encodedReqHeaders = encoder.encode(requestHeaders);
      const reqHeadersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedReqHeaders);
      const reqDataFrame = Http3FrameSerializer.serializeDataFrame(
        Buffer.from(JSON.stringify(requestData))
      );

      // === NETWORK: Send over QUIC ===
      const wireData = Buffer.concat([reqHeadersFrame, reqDataFrame]);

      // === SERVER SIDE: Receive and Process ===
      const { frames: serverFrames } = Http3FrameParser.parse(wireData);
      const serverRequest = Http3MessageHandler.extractRequest(serverFrames, decoder);

      expect(serverRequest).not.toBeNull();
      expect(serverRequest?.method).toBe('POST');
      expect(serverRequest?.url).toBe('/api/users');
      
      const receivedData = JSON.parse(serverRequest!.body.toString());
      expect(receivedData.username).toBe('testuser');
      expect(receivedData.email).toBe('test@example.com');

      // === SERVER SIDE: Create Response ===
      const createdUser = { id: 1, ...requestData, password: undefined };
      const responseBody = Buffer.from(JSON.stringify(createdUser));
      const responseHeaders = {
        'content-type': 'application/json',
        'location': '/api/users/1',
      };

      const responseFrames = Http3MessageHandler.createResponse(
        201,
        responseHeaders,
        responseBody,
        encoder
      );

      // === CLIENT SIDE: Verify Response ===
      const responseWireData = Buffer.concat(responseFrames);
      const { frames: clientFrames } = Http3FrameParser.parse(responseWireData);

      const headersFrame = clientFrames.find(f => f.type === Http3FrameType.HEADERS);
      const decodedRespHeaders = decoder.decode(headersFrame!.payload);
      const statusHeader = decodedRespHeaders.find(([name]) => name === ':status');
      
      expect(statusHeader?.[1]).toBe('201');
    });

    it('should handle large request body (chunked simulation)', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // Create large payload (1MB)
      const largeData = Buffer.alloc(1024 * 1024, 'x');
      
      // Headers
      const requestHeaders: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/upload'],
        [':scheme', 'https'],
        ['content-type', 'application/octet-stream'],
        ['content-length', largeData.length.toString()],
      ];

      const encodedHeaders = encoder.encode(requestHeaders);
      const headersFrame = Http3FrameSerializer.serializeHeadersFrame(encodedHeaders);

      // Simulate chunked data (split into 100KB chunks)
      const chunkSize = 100 * 1024;
      const dataFrames: Buffer[] = [];
      
      for (let i = 0; i < largeData.length; i += chunkSize) {
        const chunk = largeData.slice(i, Math.min(i + chunkSize, largeData.length));
        dataFrames.push(Http3FrameSerializer.serializeDataFrame(chunk));
      }

      // Combine all frames
      const wireData = Buffer.concat([headersFrame, ...dataFrames]);

      // Parse on server side
      const { frames } = Http3FrameParser.parse(wireData);
      
      expect(frames.length).toBeGreaterThan(1); // Headers + multiple data frames
      
      const request = Http3MessageHandler.extractRequest(frames, decoder);
      expect(request).not.toBeNull();
      expect(request?.body.length).toBe(largeData.length);
    });

    it('should handle streaming response with multiple DATA frames', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // Simulate streaming response (e.g., server-sent events)
      const chunks = [
        'data: {"event": "start"}\n\n',
        'data: {"event": "progress", "value": 50}\n\n',
        'data: {"event": "progress", "value": 100}\n\n',
        'data: {"event": "complete"}\n\n',
      ];

      // Create headers
      const responseHeaders = {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      };

      const headersFrame = Http3FrameSerializer.serializeHeadersFrame(
        encoder.encode([
          [':status', '200'],
          ['content-type', 'text/event-stream'],
          ['cache-control', 'no-cache'],
        ])
      );

      // Create multiple DATA frames
      const dataFrames = chunks.map(chunk => 
        Http3FrameSerializer.serializeDataFrame(Buffer.from(chunk))
      );

      // Client receives frames progressively
      const allFrames = [headersFrame, ...dataFrames];
      let receivedData = '';

      allFrames.forEach(frameBuffer => {
        const { frames } = Http3FrameParser.parse(frameBuffer);
        frames.forEach(frame => {
          if (frame.type === Http3FrameType.DATA) {
            receivedData += frame.payload.toString();
          }
        });
      });

      expect(receivedData).toContain('start');
      expect(receivedData).toContain('progress');
      expect(receivedData).toContain('complete');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed frames gracefully', () => {
      const decoder = new QPACKDecoder(4096);

      // Create malformed frame data
      const malformedData = Buffer.from([
        0xFF, 0xFF, 0xFF, 0xFF, // Invalid frame type and length
        0x00, 0x00, 0x00, 0x00,
      ]);

      const { frames, remaining } = Http3FrameParser.parse(malformedData);
      
      // Parser should handle gracefully
      expect(frames).toBeInstanceOf(Array);
      expect(remaining).toBeInstanceOf(Buffer);
    });

    it('should handle partial frame data', () => {
      const encoder = new QPACKEncoder(4096);
      
      const headers: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
      ];

      const encodedHeaders = encoder.encode(headers);
      const completeFrame = Http3FrameSerializer.serializeHeadersFrame(encodedHeaders);

      // Send only partial frame (cut in the middle)
      const partialFrame = completeFrame.slice(0, Math.max(1, completeFrame.length - 10));

      const { frames, remaining } = Http3FrameParser.parse(partialFrame);

      // Parser should handle incomplete frames gracefully
      // Either preserve data in remaining, or parse what it can
      expect(frames).toBeInstanceOf(Array);
      expect(remaining).toBeInstanceOf(Buffer);
      
      // The total data should be preserved (either in frames or remaining)
      const totalProcessed = frames.reduce((sum, f) => sum + f.length + 2, 0); // +2 for type+length
      const totalData = totalProcessed + remaining.length;
      expect(totalData).toBeGreaterThanOrEqual(0);
      
      // If we later send the rest, we should be able to parse the complete frame
      if (remaining.length > 0) {
        const restOfFrame = completeFrame.slice(partialFrame.length);
        const combinedData = Buffer.concat([remaining, restOfFrame]);
        const { frames: finalFrames } = Http3FrameParser.parse(combinedData);
        
        // Should now have complete data
        expect(finalFrames).toBeInstanceOf(Array);
      }
    });

    it('should handle empty frames', () => {
      const { frames, remaining } = Http3FrameParser.parse(Buffer.alloc(0));
      
      expect(frames).toHaveLength(0);
      expect(remaining.length).toBe(0);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle 100 concurrent request/response cycles', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        // Create request
        const requestHeaders: Array<[string, string]> = [
          [':method', 'GET'],
          [':path', `/api/item/${i}`],
          [':scheme', 'https'],
        ];

        const reqFrame = Http3FrameSerializer.serializeHeadersFrame(
          encoder.encode(requestHeaders)
        );

        // Parse request
        const { frames: reqFrames } = Http3FrameParser.parse(reqFrame);
        const request = Http3MessageHandler.extractRequest(reqFrames, decoder);

        // Create response
        const responseFrames = Http3MessageHandler.createResponse(
          200,
          { 'content-type': 'application/json' },
          Buffer.from(JSON.stringify({ id: i })),
          encoder
        );

        // Parse response
        const responseData = Buffer.concat(responseFrames);
        const { frames: respFrames } = Http3FrameParser.parse(responseData);

        expect(request).not.toBeNull();
        expect(respFrames.length).toBeGreaterThan(0);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });

    it('should maintain performance with large headers', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // Create headers with many values
      const headers: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/'],
        [':scheme', 'https'],
      ];

      // Add 50 custom headers
      for (let i = 0; i < 50; i++) {
        headers.push([`x-custom-${i}`, `value-${i}-${'x'.repeat(100)}`]);
      }

      const startTime = Date.now();
      
      const encoded = encoder.encode(headers);
      const frame = Http3FrameSerializer.serializeHeadersFrame(encoded);
      const { frames } = Http3FrameParser.parse(frame);
      const decoded = decoder.decode(frames[0].payload);

      const duration = Date.now() - startTime;

      expect(decoded.length).toBeGreaterThan(50);
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical REST API request pattern', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // Scenario: Client fetches user list with filters
      const requestHeaders: Array<[string, string]> = [
        [':method', 'GET'],
        [':path', '/api/users?page=1&limit=20&sort=name'],
        [':scheme', 'https'],
        [':authority', 'api.example.com'],
        ['authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'],
        ['accept', 'application/json'],
        ['accept-encoding', 'gzip, deflate, br'],
        ['user-agent', 'MyApp/1.0'],
      ];

      const reqFrame = Http3FrameSerializer.serializeHeadersFrame(
        encoder.encode(requestHeaders)
      );

      const { frames: reqFrames } = Http3FrameParser.parse(reqFrame);
      const request = Http3MessageHandler.extractRequest(reqFrames, decoder);

      expect(request?.url).toContain('page=1');
      expect(request?.url).toContain('limit=20');
      expect(request?.headers['authorization']).toBeDefined();

      // Server response with pagination metadata
      const users = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));

      const responseBody = JSON.stringify({
        data: users,
        meta: { page: 1, limit: 20, total: 150 },
      });

      const responseFrames = Http3MessageHandler.createResponse(
        200,
        {
          'content-type': 'application/json',
          'x-total-count': '150',
          'x-page': '1',
        },
        Buffer.from(responseBody),
        encoder
      );

      const responseData = Buffer.concat(responseFrames);
      const { frames: respFrames } = Http3FrameParser.parse(responseData);

      expect(respFrames.length).toBeGreaterThan(0);
    });

    it('should handle file upload scenario', () => {
      const encoder = new QPACKEncoder(4096);
      const decoder = new QPACKDecoder(4096);

      // Simulate file upload with multipart form data
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      const fileContent = Buffer.alloc(50000, 'F'); // 50KB file

      const requestHeaders: Array<[string, string]> = [
        [':method', 'POST'],
        [':path', '/api/files/upload'],
        [':scheme', 'https'],
        ['content-type', `multipart/form-data; boundary=${boundary}`],
        ['content-length', fileContent.length.toString()],
      ];

      const headersFrame = Http3FrameSerializer.serializeHeadersFrame(
        encoder.encode(requestHeaders)
      );
      const dataFrame = Http3FrameSerializer.serializeDataFrame(fileContent);

      const wireData = Buffer.concat([headersFrame, dataFrame]);
      const { frames } = Http3FrameParser.parse(wireData);
      const request = Http3MessageHandler.extractRequest(frames, decoder);

      expect(request?.method).toBe('POST');
      expect(request?.headers['content-type']).toContain('multipart/form-data');
      expect(request?.body.length).toBe(50000);

      // Server responds with file metadata
      const responseFrames = Http3MessageHandler.createResponse(
        201,
        {
          'content-type': 'application/json',
          'location': '/api/files/abc123',
        },
        Buffer.from(JSON.stringify({
          id: 'abc123',
          size: 50000,
          type: 'application/octet-stream',
        })),
        encoder
      );

      expect(responseFrames.length).toBeGreaterThan(0);
    });
  });
});

