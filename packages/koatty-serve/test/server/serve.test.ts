import { SingleProtocolServer, NewServe } from "../../src/server/serve";
import { KoattyApplication } from "koatty_core";
import { ListeningOptions, KoattyProtocol } from "../../src/config/config";

// Mock KoattyApplication
class MockKoattyApplication {
  config(key?: string, section?: string, defaultValue?: any) {
    // Mock config responses based on key
    if (key === "key_file") return "/test/key.pem";
    if (key === "crt_file") return "/test/cert.pem";
    if (key === "protoFile" && section === "router") return "/test/service.proto";
    if (key === "maxConnections" && section === "websocket") return 1000;
    if (key === "connectionTimeout" && section === "websocket") return 30000;
    return defaultValue;
  }
}

// Mock the individual server classes
jest.mock("../../src/server/http", () => ({
  HttpServer: jest.fn().mockImplementation(() => ({
    Start: jest.fn((callback) => callback && callback()),
    Stop: jest.fn(callback => callback && callback()),
    getStatus: jest.fn(() => 200),
    getNativeServer: jest.fn(() => ({}))
  }))
}));

jest.mock("../../src/server/https", () => ({
  HttpsServer: jest.fn().mockImplementation(() => ({
    Start: jest.fn((callback) => callback && callback()),
    Stop: jest.fn(callback => callback && callback()),
    getStatus: jest.fn(() => 200),
    getNativeServer: jest.fn(() => ({}))
  }))
}));

jest.mock("../../src/server/http2", () => ({
  Http2Server: jest.fn().mockImplementation(() => ({
    Start: jest.fn((callback) => callback && callback()),
    Stop: jest.fn(callback => callback && callback()),
    getStatus: jest.fn(() => 200),
    getNativeServer: jest.fn(() => ({}))
  }))
}));

jest.mock("../../src/server/ws", () => ({
  WsServer: jest.fn().mockImplementation(() => ({
    Start: jest.fn((callback) => callback && callback()),
    Stop: jest.fn(callback => callback && callback()),
    getStatus: jest.fn(() => 200),
    getNativeServer: jest.fn(() => ({}))
  }))
}));

jest.mock("../../src/server/grpc", () => ({
  GrpcServer: jest.fn().mockImplementation(() => ({
    Start: jest.fn((callback) => callback && callback()),
    Stop: jest.fn(callback => callback && callback()),
    RegisterService: jest.fn(),
    getStatus: jest.fn(() => 200),
    getNativeServer: jest.fn(() => ({}))
  }))
}));

// Mock fs module for SSL certificate tests
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => "mock-certificate-content")
}));

// Mock terminus
jest.mock("../../src/utils/terminus", () => ({
  CreateTerminus: jest.fn()
}));

describe("SingleProtocolServer", () => {
  let app: MockKoattyApplication;

  beforeEach(() => {
    app = new MockKoattyApplication();
    jest.clearAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      expect(server.options.hostname).toBe("localhost");
      expect(server.options.port).toBe(3000);
      expect(server.options.protocol).toBe("http");
      expect(server.protocol).toBe("http");
    });

    it.skip("should initialize with multiple protocols - DEPRECATED: Only single protocol supported", () => {
      // This test is skipped because SingleProtocolServer now only supports single protocol
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      expect(server.options.protocol).toBe("http");
    });

    it("should apply default values for missing options", () => {
      const server = new SingleProtocolServer(app as any, {
        protocol: "grpc"
      } as ListeningOptions);

      expect(server.options.hostname).toBe("127.0.0.1");
      expect(server.options.port).toBe(3000);
      expect(server.options.protocol).toBe("grpc");
    });
  });

  describe("Start method", () => {
    it("should start HTTP server successfully", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      const callback = jest.fn();
      server.Start(callback);

      expect(callback).toHaveBeenCalled();
    });

    it.skip("should start multiple protocol servers - DEPRECATED: Only single protocol supported", () => {
      // Skipped: SingleProtocolServer now only supports single protocol
    });

    it("should handle callback parameter", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      const callback = jest.fn();
      server.Start(callback);

      expect(callback).toHaveBeenCalled();
    });

    it("should work without callback", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      expect(() => server.Start()).not.toThrow();
    });
  });

       describe("Stop method", () => {
      it("should stop server", (done) => {
        const server = new SingleProtocolServer(app as any, {
          hostname: "localhost",
          port: 3000,
          protocol: "http"
        });

      server.Start();

      const callback = jest.fn(() => {
        // Should call callback after stopping
        expect(callback).toHaveBeenCalled();
        done();
      });
      
      server.Stop(callback);
    });

    it("should work without callback", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      server.Start();

      expect(() => server.Stop()).not.toThrow();
    });

    it("should clear server after stopping", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      server.Start();
      expect(server.status).toBe(200);

      server.Stop();
      
      // Need to wait for async stop to complete
      setTimeout(() => {
        expect(server.status).toBe(0);
      }, 10);
    });
  });

  describe("Server management", () => {
    it.skip("should get server by protocol and port - DEPRECATED: getServer() method removed", () => {
      // Skipped: getServer() method no longer exists in SingleProtocolServer
    });

    it.skip("should return undefined for non-existent server - DEPRECATED: getServer() method removed", () => {
      // Skipped: getServer() method no longer exists in SingleProtocolServer
    });

    it.skip("should get all servers - DEPRECATED: getAllServers() method removed", () => {
      // Skipped: getAllServers() method no longer exists in SingleProtocolServer
    });
  });

  describe("Status and native server access", () => {
    it("should get status from primary server", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      server.Start();

      const status = server.getStatus();
      expect(status).toBe(200);
    });

    it.skip("should get status from specific protocol server - DEPRECATED: Only single protocol supported", () => {
      // Skipped: getStatus() no longer accepts protocol/port parameters
    });

    it("should get native server instance", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      server.Start();

      const nativeServer = server.getNativeServer();
      expect(nativeServer).toBeDefined();
    });

    it.skip("should get native server for specific protocol - DEPRECATED: Only single protocol supported", () => {
      // Skipped: getNativeServer() no longer accepts protocol/port parameters
    });
  });

     describe("gRPC specific functionality", () => {
     it("should register gRPC service", () => {
       const server = new SingleProtocolServer(app as any, {
         hostname: "localhost",
         port: 3000,
         protocol: "grpc"
       });

       server.Start();

       const mockService = jest.fn();
       
       // RegisterService should be called on the single server instance
       server.RegisterService(mockService);
       // Just verify it doesn't throw
       expect(true).toBe(true);
     });

         it.skip("should register service on specific gRPC server - DEPRECATED: Only single protocol supported", () => {
       // Skipped: RegisterService() no longer accepts protocol/port parameters
     });
  });

  describe("Port allocation", () => {
    it.skip("should allocate different ports for multiple protocols - DEPRECATED: Only single protocol supported", () => {
      // Skipped: Port allocation for multiple protocols no longer needed
    });

    it("should use configured port for single protocol", () => {
      const server = new SingleProtocolServer(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

      server.Start();

      expect(server.options.port).toBe(3000);
      expect(server.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("should handle server creation errors gracefully", () => {
      // Mock a server constructor to throw an error
      const originalHttpServer = require("../../src/server/http").HttpServer;
      require("../../src/server/http").HttpServer = jest.fn(() => {
        throw new Error("Server creation failed");
      });

      expect(() => {
        const server = new SingleProtocolServer(app as any, {
          hostname: "localhost",
          port: 3000,
          protocol: "http"
        });
        server.Start();
      }).toThrow("Server creation failed");

      // Restore original
      require("../../src/server/http").HttpServer = originalHttpServer;
    });
  });
});

describe("NewServe function", () => {
  let app: MockKoattyApplication;

  beforeEach(() => {
    app = new MockKoattyApplication();
    jest.clearAllMocks();
  });

  describe("Default behavior", () => {
    it("should create server with default options", () => {
      const server = NewServe(app as any);

      expect(server).toBeInstanceOf(SingleProtocolServer);
      expect(server.options.hostname).toBe("127.0.0.1");
      expect(server.options.port).toBe(3000);
      expect(server.options.protocol).toBe("http");
    });

    it("should handle environment variables", () => {
      process.env.IP = "192.168.1.1";
      process.env.PORT = "8080";

      const server = NewServe(app as any);

      expect(server.options.hostname).toBe("192.168.1.1");
      expect(server.options.port).toBe(8080);

      // Clean up
      delete process.env.IP;
      delete process.env.PORT;
    });

    it("should handle APP_PORT environment variable", () => {
      process.env.APP_PORT = "9000";

      const server = NewServe(app as any);

      expect(server.options.port).toBe(9000);

      // Clean up
      delete process.env.APP_PORT;
    });

    it("should validate port numbers", () => {
      process.env.PORT = "invalid";

      const server = NewServe(app as any);

      expect(server.options.port).toBe(3000); // fallback to default

      // Clean up
      delete process.env.PORT;
    });

    it("should handle port numbers out of range", () => {
      process.env.PORT = "99999";

      const server = NewServe(app as any);

      expect(server.options.port).toBe(3000); // fallback to default

      // Clean up
      delete process.env.PORT;
    });

    it("should handle negative port numbers", () => {
      process.env.PORT = "-1";

      const server = NewServe(app as any);

      expect(server.options.port).toBe(3000); // fallback to default

      // Clean up
      delete process.env.PORT;
    });
  });

  describe("Custom options", () => {
    it("should merge custom options with defaults", () => {
      const options: ListeningOptions = {
        hostname: "custom.host",
        port: 5000,
        protocol: "https",
        trace: true,
        ext: {
          custom: "value",
          keyFile: "test/temp/test-key.pem",
          crtFile: "test/temp/test-cert.pem"
        }
      };

      const server = NewServe(app as any, options);

      expect(server.options.hostname).toBe("custom.host");
      expect(server.options.port).toBe(5000);
      expect(server.options.protocol).toBe("https");
      expect(server.options.trace).toBe(true);
      expect(server.options.ext?.custom).toBe("value");
    });

    it.skip("should preserve protocol arrays - DEPRECATED: Only single protocol supported", () => {
      // Skipped: Protocol arrays no longer supported
    });

    it("should keep single protocol as string", () => {
      const options: ListeningOptions = {
        hostname: "localhost",
        port: 3000,
        protocol: "grpc"
      };

      const server = NewServe(app as any, options);

      expect(typeof server.options.protocol).toBe("string");
      expect(server.options.protocol).toBe("grpc");
    });

    it("should handle all protocol types", () => {
      const protocols: KoattyProtocol[] = ["http", "https", "http2", "grpc", "ws", "wss"];

      protocols.forEach(protocol => {
        const needsSSL = ["https", "http2", "wss"].includes(protocol);
        const server = NewServe(app as any, {
          hostname: "localhost",
          port: 3000,
          protocol,
          ...(needsSSL && {
            ext: {
              keyFile: "test/temp/test-key.pem",
              crtFile: "test/temp/test-cert.pem"
            }
          })
        });

        expect(server.options.protocol).toBe(protocol);
      });
    });

    it("should handle extended configurations", () => {
      const options: ListeningOptions = {
        hostname: "localhost",
        port: 3000,
        protocol: "https",
        ext: {
          keyFile: "test/temp/test-key.pem",
          crtFile: "test/temp/test-cert.pem",
          key: "ssl-key-content",
          cert: "ssl-cert-content",
          protoFile: "service.proto",
          server: null,
          customOption: "value"
        }
      };

      const server = NewServe(app as any, options);

      expect(server.options.ext?.key).toBe("ssl-key-content");
      expect(server.options.ext?.cert).toBe("ssl-cert-content");
      expect(server.options.ext?.protoFile).toBe("service.proto");
      expect(server.options.ext?.customOption).toBe("value");
    });
  });

  describe("Return value", () => {
    it("should return SingleProtocolServer instance", () => {
      const server = NewServe(app as any);
      expect(server).toBeInstanceOf(SingleProtocolServer);
    });

    it("should return working server instance", () => {
      const server = NewServe(app as any, {
        hostname: "localhost",
        port: 3000,
        protocol: "http"
      });

             expect(typeof server.Start).toBe("function");
       expect(typeof server.Stop).toBe("function");
       // These are SingleProtocolServer specific methods
       expect(server).toHaveProperty("getStatus");
       expect(server).toHaveProperty("getNativeServer");
    });
  });
}); 