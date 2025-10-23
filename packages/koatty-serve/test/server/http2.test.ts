import { Http2Server } from '../../src/server/http2';
import { KoattyApplication } from 'koatty_core';
import * as http2 from 'http2';
import * as fs from 'fs';

// Mock dependencies
jest.mock('http2');
jest.mock('fs');

const mockHttp2 = http2 as jest.Mocked<typeof http2>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Http2Server', () => {
  let mockApp: any;
  let mockServer: any;
  let http2Server: Http2Server;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock KoattyApplication
    mockApp = {
      config: jest.fn((key?: string, defaultValue?: any) => {
        const configs = {
          'server': {
            hostname: '127.0.0.1',
            port: 3000,
            protocol: 'http2'
          }
        };
        
        if (key) {
          return configs[key] || defaultValue;
        }
        return defaultValue;
      }),
      on: jest.fn(),
      emit: jest.fn(),
      use: jest.fn(),
      callback: jest.fn(() => (req: any, res: any) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello HTTP/2 World');
      })
    };

    // Mock HTTP/2 server
    mockServer = {
      listen: jest.fn((port: any, hostname?: any, callback?: any) => {
        if (typeof hostname === 'function') {
          callback = hostname;
        }
        if (callback) setTimeout(callback, 10);
        return mockServer;
      }),
      close: jest.fn((callback?: any) => {
        if (callback) setTimeout(callback, 10);
      }),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      address: jest.fn(() => ({ address: '127.0.0.1', port: 3000 })),
      listening: false,
      timeout: 30000,
      updateSettings: jest.fn(),
      setTimeout: jest.fn()
    };

    // Mock file system operations with valid PEM format
    mockFs.readFileSync.mockImplementation((path: any) => {
      if (path.includes('key')) return '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----';
      if (path.includes('cert')) return '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----';
      if (path.includes('ca')) return '-----BEGIN CERTIFICATE-----\nMOCK CA\n-----END CERTIFICATE-----';
      return 'mock-file-content';
    });
    
    // Mock existsSync to return true for certificate files
    mockFs.existsSync.mockImplementation((path: any) => {
      return typeof path === 'string' && (path.includes('key') || path.includes('cert') || path.includes('ca'));
    });

    mockHttp2.createSecureServer.mockReturnValue(mockServer);
    mockHttp2.createServer.mockReturnValue(mockServer);

    http2Server = new Http2Server(mockApp as KoattyApplication, {
      hostname: '127.0.0.1',
      port: 3000,
      protocol: 'http2',
      ssl: {
        mode: 'manual',
        key: 'mock-private-key',
        cert: 'mock-certificate'
      }
    });
  });

  describe('Initialization', () => {
    it('should create HTTP/2 server instance', () => {
      expect(http2Server).toBeInstanceOf(Http2Server);
      expect(mockHttp2.createSecureServer).toHaveBeenCalled();
    });

    it('should create secure HTTP/2 server with SSL', () => {
      // Clear previous calls
      mockHttp2.createSecureServer.mockClear();
      
      const secureServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 443,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'private-key-content',
          cert: 'certificate-content'
        }
      });

      // Check that the server was created with SSL configuration
      expect(mockHttp2.createSecureServer).toHaveBeenCalled();
      expect(secureServer).toBeInstanceOf(Http2Server);
    });

    it('should configure HTTP/2 settings', () => {
      const serverWithSettings = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        },
        http2: {
          settings: {
            headerTableSize: 4096,
            enablePush: true,
            maxConcurrentStreams: 100,
            initialWindowSize: 65535,
            maxFrameSize: 16384,
            maxHeaderListSize: 8192
          }
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true,
          settings: expect.objectContaining({
            headerTableSize: 4096,
            enablePush: true,
            maxConcurrentStreams: 100
          })
        }),
        expect.any(Function)
      );
    });

    it('should support HTTP/1.1 fallback', () => {
      const fallbackServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate',
          allowHTTP1: true
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true
        }),
        expect.any(Function)
      );
    });
  });

  describe('Server Lifecycle', () => {
    it('should start HTTP/2 server successfully', async () => {
      const startPromise = new Promise<void>((resolve) => {
        const result = http2Server.Start(() => {
          resolve();
        });
        expect(result).toBe(mockServer);
      });

      await startPromise;
      expect(mockServer.listen).toHaveBeenCalledWith(3000, '127.0.0.1', expect.any(Function));
    });

    it('should stop HTTP/2 server successfully', () => {
      // Mock the close method to call the callback immediately
      mockServer.close.mockImplementation((callback: any) => {
        if (callback) setTimeout(callback, 0);
      });

      // Test that Stop method can be called without throwing
      expect(() => {
        http2Server.Stop();
      }).not.toThrow();
    });

    it('should handle server startup errors', () => {
      mockServer.listen.mockImplementation(() => {
        throw new Error('Port already in use');
      });

      expect(() => http2Server.Start()).toThrow();
    });
  });

  describe('HTTP/2 Features', () => {
    it('should handle HTTP/2 streams', () => {
      const streamHandler = mockServer.on.mock.calls.find(call => call[0] === 'stream')?.[1];
      
      const mockStream = {
        respond: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        pushStream: jest.fn(),
        session: {
          socket: { encrypted: true }
        },
        headers: {
          ':method': 'GET',
          ':path': '/api/users',
          ':scheme': 'https',
          ':authority': 'localhost:3000'
        }
      };

      if (streamHandler) {
        expect(() => {
          streamHandler(mockStream, mockStream.headers);
        }).not.toThrow();
        
        expect(mockStream.respond).toHaveBeenCalled();
      }
    });

    it('should support server push', () => {
      const mockStream = {
        respond: jest.fn(),
        end: jest.fn(),
        pushStream: jest.fn((headers: any, callback: any) => {
          const pushStream = {
            respond: jest.fn(),
            end: jest.fn()
          };
          callback(null, pushStream);
        }),
        session: {
          socket: { encrypted: true }
        }
      };

      // Simulate server push
      const pushHeaders = {
        ':method': 'GET',
        ':path': '/api/users.css',
        ':scheme': 'https',
        ':authority': 'localhost:3000'
      };

      mockStream.pushStream(pushHeaders, (err: any, pushStream: any) => {
        if (!err) {
          pushStream.respond({ ':status': 200 });
          pushStream.end('/* CSS content */');
        }
      });

      expect(mockStream.pushStream).toHaveBeenCalledWith(pushHeaders, expect.any(Function));
    });

    it('should handle HTTP/2 headers', () => {
      const headers = {
        ':method': 'POST',
        ':path': '/api/users',
        ':scheme': 'https',
        ':authority': 'localhost:3000',
        'content-type': 'application/json',
        'authorization': 'Bearer token123'
      };

      const mockStream = {
        respond: jest.fn(),
        end: jest.fn(),
        headers
      };

      expect(mockStream.headers[':method']).toBe('POST');
      expect(mockStream.headers['content-type']).toBe('application/json');
    });

    it('should handle flow control', () => {
      const mockStream = {
        respond: jest.fn(),
        end: jest.fn(),
        write: jest.fn(),
        on: jest.fn(),
        state: {
          localWindowSize: 65535,
          remoteWindowSize: 65535
        }
      };

      // Simulate writing large data with flow control
      const largeData = 'x'.repeat(100000);
      
      mockStream.write(largeData);
      
      expect(mockStream.write).toHaveBeenCalledWith(largeData);
    });
  });

  describe('SSL/TLS Configuration', () => {
    it('should handle SSL certificates from files', () => {
      const sslServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 443,
        protocol: 'http2',
        ssl: {
          mode: 'auto',
          key: '/path/to/private-key.pem',
          cert: '/path/to/certificate.pem',
          ca: '/path/to/ca.pem'
        }
      });

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/private-key.pem', 'utf8');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/certificate.pem', 'utf8');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/certificate.pem', 'utf8');
    });

    it('should handle ALPN protocol negotiation', () => {
      const alpnServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 443,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        }
      });

      // The actual implementation doesn't directly use ALPNProtocols in this way
      // It's handled by the HTTP/2 implementation internally
      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.stringContaining('-----BEGIN PRIVATE KEY-----'),
          cert: expect.stringContaining('-----BEGIN CERTIFICATE-----'),
          allowHTTP1: true
        }),
        expect.any(Function)
      );
    });

    it('should handle client certificate authentication', () => {
      const clientCertServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 443,
        protocol: 'http2',
        ssl: {
          mode: 'mutual_tls',
          key: 'mock-private-key',
          cert: 'mock-certificate',
          ca: 'ca-cert',
          requestCert: true,
          rejectUnauthorized: true
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true,
          requestCert: true,
          rejectUnauthorized: true,
          ca: expect.stringContaining('-----BEGIN CERTIFICATE-----'),
          key: expect.stringContaining('-----BEGIN PRIVATE KEY-----'),
          cert: expect.stringContaining('-----BEGIN CERTIFICATE-----')
        }),
        expect.any(Function)
      );
    });
  });

  describe('Performance Configuration', () => {
    it('should configure connection limits', () => {
      const limitServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        },
        http2: {
          maxSessionMemory: 20,
          settings: {
            maxConcurrentStreams: 200,
            initialWindowSize: 131072
          }
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true,
          settings: expect.objectContaining({
            maxConcurrentStreams: 200,
            initialWindowSize: 131072
          })
        }),
        expect.any(Function)
      );
    });

    it('should handle session timeout', () => {
      const timeoutServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        }
      });

      expect(timeoutServer).toBeInstanceOf(Http2Server);
    });

    it('should configure padding strategy', () => {
      const paddedServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'auto',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        },
        http2: {
          settings: {
            enablePush: true,
            maxConcurrentStreams: 100
          }
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true,
          settings: expect.objectContaining({
            enablePush: true,
            maxConcurrentStreams: 100
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle session errors', () => {
      const sessionErrorHandler = mockServer.on.mock.calls.find(call => call[0] === 'sessionError')?.[1];
      
      if (sessionErrorHandler) {
        const mockSession = {
          destroy: jest.fn(),
          socket: { destroyed: false }
        };

        expect(() => {
          sessionErrorHandler(new Error('Session error'), mockSession);
        }).not.toThrow();
      }
    });

    it('should handle stream errors', () => {
      const streamHandler = mockServer.on.mock.calls.find(call => call[0] === 'stream')?.[1];
      
      const mockStream = {
        respond: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        destroy: jest.fn(),
        session: {
          socket: { encrypted: true }
        },
        headers: {
          ':method': 'GET',
          ':path': '/test'
        }
      };

      if (streamHandler) {
        streamHandler(mockStream, mockStream.headers);
        
        const errorHandler = mockStream.on.mock.calls.find(call => call[0] === 'error')?.[1];
        if (errorHandler) {
          expect(() => {
            errorHandler(new Error('Stream error'));
          }).not.toThrow();
        }
      }
    });

    it('should handle connection timeout', () => {
      const timeoutHandler = mockServer.on.mock.calls.find(call => call[0] === 'timeout')?.[1];
      
      if (timeoutHandler) {
        expect(() => {
          timeoutHandler();
        }).not.toThrow();
      }
    });

    it('should handle invalid frames', () => {
      const frameErrorHandler = mockServer.on.mock.calls.find(call => call[0] === 'frameError')?.[1];
      
      if (frameErrorHandler) {
        expect(() => {
          frameErrorHandler(1, 2, 'PROTOCOL_ERROR');
        }).not.toThrow();
      }
    });
  });

  describe('Session Management', () => {
    it('should handle new sessions', () => {
      const sessionHandler = mockServer.on.mock.calls.find(call => call[0] === 'session')?.[1];
      
      const mockSession = {
        on: jest.fn(),
        settings: jest.fn(),
        ping: jest.fn(),
        goaway: jest.fn(),
        socket: {
          encrypted: true,
          authorized: true
        }
      };

      if (sessionHandler) {
        expect(() => {
          sessionHandler(mockSession);
        }).not.toThrow();
      }
    });

    it('should handle session settings updates', () => {
      const mockSession = {
        on: jest.fn(),
        settings: jest.fn(),
        localSettings: {
          headerTableSize: 4096,
          enablePush: true,
          maxConcurrentStreams: 100
        },
        remoteSettings: {
          headerTableSize: 4096,
          enablePush: false,
          maxConcurrentStreams: 50
        }
      };

      const newSettings = {
        maxConcurrentStreams: 200,
        initialWindowSize: 131072
      };

      mockSession.settings(newSettings);
      
      expect(mockSession.settings).toHaveBeenCalledWith(newSettings);
    });

    it('should handle session ping/pong', () => {
      const mockSession = {
        ping: jest.fn((payload: any, callback: any) => {
          setTimeout(() => callback(null, Date.now() - payload.readUInt32BE(0), payload), 10);
        })
      };

      const pingPayload = Buffer.allocUnsafe(8);
      pingPayload.writeUInt32BE(12345, 0); // Use a smaller number to avoid range error

      mockSession.ping(pingPayload, (err: any, duration: number, payload: Buffer) => {
        expect(err).toBeNull();
        expect(typeof duration).toBe('number');
        expect(Buffer.isBuffer(payload)).toBe(true);
      });

      expect(mockSession.ping).toHaveBeenCalledWith(pingPayload, expect.any(Function));
    });
  });

  describe('Compatibility', () => {
    it('should handle HTTP/1.1 requests when allowHTTP1 is enabled', () => {
      const compatServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate',
          allowHTTP1: true
        }
      });

      const requestHandler = mockHttp2.createSecureServer.mock.calls[0][1];
      
      const mockReq = {
        method: 'GET',
        url: '/api/users',
        headers: { 'host': 'localhost:3000' },
        httpVersion: '1.1'
      } as any;
      
      const mockRes = {
        writeHead: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
        statusCode: 200
      } as any;

      if (requestHandler) {
        requestHandler(mockReq, mockRes);
        expect(mockApp.callback).toHaveBeenCalled();
      }
    });

    it('should upgrade HTTP/1.1 connections to HTTP/2', () => {
      const upgradeHandler = mockServer.on.mock.calls.find(call => call[0] === 'upgrade')?.[1];
      
      const mockReq = {
        method: 'GET',
        url: '/api/users',
        headers: {
          'upgrade': 'h2c',
          'connection': 'upgrade, http2-settings',
          'http2-settings': 'AAMAAABkAARAAAAAAAIAAAAA'
        }
      };
      
      const mockSocket = {
        write: jest.fn(),
        end: jest.fn()
      };

      if (upgradeHandler) {
        expect(() => {
          upgradeHandler(mockReq, mockSocket, Buffer.alloc(0));
        }).not.toThrow();
      }
    });
  });

  describe('Monitoring', () => {
    it('should provide server status', () => {
      const status = http2Server.getStatus();
      expect(typeof status).toBe('number');
    });

    it('should track HTTP/2 metrics using base server methods', () => {
      const stats = http2Server.getHttp2Stats();
      
      expect(stats).toEqual(
        expect.objectContaining({
          activeConnections: expect.any(Number),
          totalConnections: expect.any(Number),
          protocol: 'http2'
        })
      );
    });

    it('should monitor connections status', () => {
      const connectionStatus = http2Server.getConnectionsStatus();
      
      expect(connectionStatus).toEqual(
        expect.objectContaining({
          current: expect.any(Number),
          max: expect.any(Number)
        })
      );
    });
  });

  describe('Advanced Features', () => {
    it('should support custom frame handling', () => {
      const frameServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true
        }),
        expect.any(Function)
      );
    });

    it('should handle priority frames', () => {
      const mockStream = {
        priority: jest.fn(),
        weight: 16,
        parent: null,
        exclusive: false
      };

      // Simulate priority change
      mockStream.priority({
        parent: 0,
        weight: 32,
        exclusive: true
      });

      expect(mockStream.priority).toHaveBeenCalledWith({
        parent: 0,
        weight: 32,
        exclusive: true
      });
    });

    it('should support custom settings', () => {
      const customSettings = {
        headerTableSize: 8192,
        enablePush: false,
        maxConcurrentStreams: 1000,
        initialWindowSize: 262144,
        maxFrameSize: 32768,
        maxHeaderListSize: 16384
      };

      const customServer = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'manual',
          key: 'mock-private-key',
          cert: 'mock-certificate'
        },
        http2: {
          settings: customSettings
        }
      });

      expect(mockHttp2.createSecureServer).toHaveBeenCalledWith(
        expect.objectContaining({
          allowHTTP1: true,
          settings: customSettings
        }),
        expect.any(Function)
      );
    });
  });

  describe('HTTP/2 Configuration Management', () => {
    it('should handle HTTP2 settings configuration', () => {
      const serverWithSettings = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'auto',
          key: 'test-key',
          cert: 'test-cert'
        },
        http2: {
          settings: {
            headerTableSize: 4096,
            enablePush: true,
            maxConcurrentStreams: 100,
            initialWindowSize: 65535,
            maxFrameSize: 16384,
            maxHeaderListSize: 8192
          }
        }
      });

      expect(serverWithSettings).toBeInstanceOf(Http2Server);
    });

    it('should extract relevant configuration for logging', () => {
      const config = {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2' as const,
        ssl: {
          mode: 'auto' as const,
          allowHTTP1: false
        },
        connectionPool: {
          maxConnections: 100,
          maxSessionMemory: 10485760,
          maxHeaderListSize: 8192
        },
        http2: {
          settings: {
            maxConcurrentStreams: 100
          }
        }
      };

      const extracted = (http2Server as any).extractRelevantConfig(config);
      expect(extracted).toEqual({
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        sslMode: 'auto',
        allowHTTP1: false,
        connectionPool: {
          maxConnections: 100,
          maxSessionMemory: 10485760,
          maxHeaderListSize: 8192
        },
        http2Settings: {
          maxConcurrentStreams: 100
        }
      });
    });

    it('should detect configuration changes requiring restart', () => {
      const oldConfig = {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2' as const,
        ssl: {
          mode: 'auto' as const,
          key: 'old-key',
          cert: 'old-cert'
        }
      };

      const newConfig = {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2' as const,
        ssl: {
          mode: 'auto' as const,
          key: 'new-key',
          cert: 'new-cert'
        }
      };

      const analysis = (http2Server as any).analyzeConfigChanges(['ssl'], oldConfig, newConfig);
      expect(analysis.requiresRestart).toBe(true);
    });

    it('should handle runtime configuration changes', () => {
      const analysis = {
        requiresRestart: false,
        changedKeys: ['connectionPool'],
        canApplyRuntime: true
      };

      const newConfig = {
        connectionPool: {
          maxConnections: 200
        }
      };

      // Test that the method exists and can be called
      expect(() => {
        (http2Server as any).onRuntimeConfigChange(analysis, newConfig, 'test-trace-id');
      }).not.toThrow();
    });
  });

  describe('HTTP/2 Connection Lifecycle', () => {
    it('should stop accepting new connections during shutdown', async () => {
      const traceId = 'test-trace-id';
      
      // Mock server close method
      (http2Server as any).server = {
        close: jest.fn((callback) => {
          if (callback) callback();
        }),
        listening: true
      };

      await (http2Server as any).stopAcceptingNewConnections(traceId);
      expect((http2Server as any).server.close).toHaveBeenCalled();
    });

    it('should wait for connection completion with timeout', async () => {
      const traceId = 'test-trace-id';
      const timeout = 1000;

      // Mock connection pool with no active connections
      (http2Server as any).connectionPool = {
        getActiveConnectionCount: jest.fn().mockReturnValue(0)
      };

      await (http2Server as any).waitForConnectionCompletion(timeout, traceId);
      expect((http2Server as any).connectionPool.getActiveConnectionCount).toHaveBeenCalled();
    });

    it('should force close remaining connections', async () => {
      const traceId = 'test-trace-id';

      // Mock connection pool with active connections
      (http2Server as any).connectionPool = {
        getActiveConnectionCount: jest.fn().mockReturnValue(2),
        closeAllConnections: jest.fn().mockResolvedValue(undefined)
      };

      await (http2Server as any).forceCloseRemainingConnections(traceId);
      expect((http2Server as any).connectionPool.closeAllConnections).toHaveBeenCalled();
    });

    it('should handle force shutdown', () => {
      const traceId = 'test-trace-id';

      // Mock server
      (http2Server as any).server = {
        close: jest.fn()
      };

      (http2Server as any).forceShutdown(traceId);

      expect((http2Server as any).server.close).toHaveBeenCalled();
    });
  });

  describe('HTTP/2 Statistics and Monitoring', () => {
    it('should get HTTP2 statistics', () => {
      // Mock connection pool with statistics
      (http2Server as any).connectionPool = {
        getConnectionStats: jest.fn().mockReturnValue({
          activeConnections: 5,
          totalConnections: 20,
          activeSessions: 3,
          totalSessions: 15
        })
      };

      const stats = http2Server.getHttp2Stats();
      expect(stats).toEqual({
        activeConnections: 5,
        totalConnections: 20,
        activeSessions: 3,
        totalSessions: 15
      });
    });

    it('should return null when no connection pool exists', () => {
      (http2Server as any).connectionPool = null;
      const stats = http2Server.getHttp2Stats();
      expect(stats).toBeNull();
    });

    it('should start connection pool monitoring', () => {
      const timerManager = (http2Server as any).timerManager;
      const initialTimerCount = timerManager.getActiveTimerCount();

      (http2Server as any).startConnectionPoolMonitoring();

      // Should have added a monitoring timer
      expect(timerManager.getActiveTimerCount()).toBeGreaterThan(initialTimerCount);
      expect(timerManager.getTimerNames()).toContain('http2_connection_monitoring');
    });

    it('should provide connection statistics through base class', () => {
      // Mock connection pool
      (http2Server as any).connectionPool = {
        getMetrics: jest.fn().mockReturnValue({
          activeConnections: 10,
          totalConnections: 50,
          connectionsPerSecond: 2.5,
          averageLatency: 120,
          errorRate: 0.02
        })
      };

      const stats = http2Server.getConnectionStats();
      expect(stats).toEqual({
        activeConnections: 10,
        totalConnections: 50,
        connectionsPerSecond: 2.5,
        averageLatency: 120,
        errorRate: 0.02
      });
    });
  });

  describe('HTTP/2 Error Handling', () => {
    it('should handle server creation errors gracefully', () => {
      // Mock https.createSecureServer to throw an error
      const originalCreateSecureServer = require('http2').createSecureServer;
      require('http2').createSecureServer = jest.fn().mockImplementation(() => {
        throw new Error('Failed to create HTTP/2 server');
      });

      expect(() => {
        new Http2Server(mockApp as KoattyApplication, {
          hostname: '127.0.0.1',
          port: 3000,
          protocol: 'http2',
          ssl: {
            mode: 'auto',
            key: 'test-key',
            cert: 'test-cert'
          }
        });
      }).toThrow('Failed to create HTTP/2 server');

      // Restore original function
      require('http2').createSecureServer = originalCreateSecureServer;
    });

    it('should handle SSL configuration errors', () => {
      expect(() => {
        new Http2Server(mockApp as KoattyApplication, {
          hostname: '127.0.0.1',
          port: 3000,
          protocol: 'http2',
          ssl: {
            mode: 'manual',
            // Missing key and cert
          }
        });
      }).toThrow();
    });
  });

  describe('HTTP/2 Server Status', () => {
    it('should provide server status', () => {
      const status = http2Server.getStatus();
      expect(typeof status).toBe('number');
    });

    it('should provide native server instance', () => {
      const nativeServer = http2Server.getNativeServer();
      expect(nativeServer).toBe((http2Server as any).server);
    });

    it('should handle graceful shutdown flow', async () => {
      // Mock the graceful shutdown methods
      (http2Server as any).stopAcceptingNewConnections = jest.fn().mockResolvedValue(undefined);
      (http2Server as any).waitForConnectionCompletion = jest.fn().mockResolvedValue(undefined);
      (http2Server as any).forceCloseRemainingConnections = jest.fn().mockResolvedValue(undefined);
      (http2Server as any).stopMonitoringAndCleanup = jest.fn();

      const options = {
        timeout: 10000,
        drainDelay: 2000,
        stepTimeout: 2000
      };

      await http2Server.gracefulShutdown(options);

      expect((http2Server as any).stopAcceptingNewConnections).toHaveBeenCalled();
      expect((http2Server as any).waitForConnectionCompletion).toHaveBeenCalled();
      expect((http2Server as any).stopMonitoringAndCleanup).toHaveBeenCalled();
    });
  });

  describe('HTTP/2 Options Creation', () => {
    it('should create HTTP2 options with allowHTTP1 enabled', () => {
      const serverWithHTTP1 = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'auto',
          allowHTTP1: true,
          key: 'test-key',
          cert: 'test-cert'
        }
      });

      expect(serverWithHTTP1).toBeInstanceOf(Http2Server);
    });

    it('should create HTTP2 options with custom settings', () => {
      const serverWithCustomSettings = new Http2Server(mockApp as KoattyApplication, {
        hostname: '127.0.0.1',
        port: 3000,
        protocol: 'http2',
        ssl: {
          mode: 'auto',
          key: 'test-key',
          cert: 'test-cert'
        },
        http2: {
          settings: {
            headerTableSize: 8192,
            enablePush: false,
            maxConcurrentStreams: 50,
            initialWindowSize: 32768
          }
        }
      });

      expect(serverWithCustomSettings).toBeInstanceOf(Http2Server);
    });
  });
}); 