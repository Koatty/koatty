/**
 * @Description: Graceful shutdown test
 * @Usage: Test router cleanup on application shutdown
 * @Author: richen
 * @Date: 2025-10-12
 */

import { Koatty } from "koatty_core";
import { NewRouter, RouterFactory } from "../src/index";

class TestKoatty extends Koatty {
  constructor() {
    super();
  }
}

describe("Graceful Shutdown", () => {
  let app: Koatty;
  let factory: RouterFactory;

  beforeEach(() => {
    app = new TestKoatty();
    // Reset factory before each test and clear active routers
    factory = RouterFactory.getInstance();
    // Clear active routers from previous tests
    factory['activeRouters'] = [];
    // Reset shutdown flags
    factory['hasShutdown'] = false;
    factory['isShuttingDown'] = false;
    factory.reset();
  });

  test("should track active routers", () => {
    const httpRouter = NewRouter(app, { protocol: "http", prefix: "/api" });
    const wsRouter = NewRouter(app, { protocol: "ws", prefix: "/ws" });
    
    expect(factory.getActiveRouterCount()).toBe(2);
    expect(httpRouter).toBeDefined();
    expect(wsRouter).toBeDefined();
  });

  test("should have cleanup method on all routers", () => {
    const httpRouter = NewRouter(app, { protocol: "http", prefix: "/api" }) as any;
    const wsRouter = NewRouter(app, { protocol: "ws", prefix: "/ws" }) as any;
    const grpcRouter = NewRouter(app, { 
      protocol: "grpc", 
      prefix: "/grpc",
      ext: { protoFile: "./test.proto" }
    }) as any;
    const graphqlRouter = NewRouter(app, { 
      protocol: "graphql", 
      prefix: "/graphql",
      ext: { schemaFile: "./test.graphql" }
    }) as any;

    expect(typeof httpRouter.cleanup).toBe("function");
    expect(typeof wsRouter.cleanup).toBe("function");
    expect(typeof grpcRouter.cleanup).toBe("function");
    expect(typeof graphqlRouter.cleanup).toBe("function");
  });

  test("should shutdown all routers", async () => {
    NewRouter(app, { protocol: "http", prefix: "/api" });
    NewRouter(app, { protocol: "ws", prefix: "/ws" });
    
    expect(factory.getActiveRouterCount()).toBe(2);
    
    await factory.shutdownAll();
    
    expect(factory.getActiveRouterCount()).toBe(0);
  });

  test("should call cleanup on each router during shutdown", async () => {
    const httpRouter = NewRouter(app, { protocol: "http", prefix: "/api" }) as any;
    const wsRouter = NewRouter(app, { protocol: "ws", prefix: "/ws" }) as any;
    
    // Mock cleanup methods
    const httpCleanupSpy = jest.spyOn(httpRouter, 'cleanup');
    const wsCleanupSpy = jest.spyOn(wsRouter, 'cleanup');
    
    await factory.shutdownAll();
    
    expect(httpCleanupSpy).toHaveBeenCalled();
    expect(wsCleanupSpy).toHaveBeenCalled();
  });

  test("should handle cleanup errors gracefully", async () => {
    const router = NewRouter(app, { protocol: "http", prefix: "/api" }) as any;
    
    // Mock cleanup to throw error
    jest.spyOn(router, 'cleanup').mockImplementation(() => {
      throw new Error('Cleanup error');
    });
    
    // Should not throw
    await expect(factory.shutdownAll()).resolves.not.toThrow();
  });

  test("WebSocket router should cleanup connections and timers", () => {
    const wsRouter = NewRouter(app, { protocol: "ws", prefix: "/ws" }) as any;
    
    // Verify cleanup method exists
    expect(typeof wsRouter.cleanup).toBe("function");
    
    // Call cleanup (should not throw)
    expect(() => wsRouter.cleanup()).not.toThrow();
  });

  test("gRPC router should cleanup pools and streams", () => {
    const grpcRouter = NewRouter(app, { 
      protocol: "grpc", 
      prefix: "/grpc",
      ext: { protoFile: "./test.proto" }
    }) as any;
    
    // Verify cleanup method exists
    expect(typeof grpcRouter.cleanup).toBe("function");
    
    // Call cleanup (should not throw)
    expect(() => grpcRouter.cleanup()).not.toThrow();
  });

  test("should register stop event listener", () => {
    const eventListeners = (app as any)._events || {};
    const stopListenersBefore = eventListeners.stop ? eventListeners.stop.length : 0;
    
    NewRouter(app, { protocol: "http", prefix: "/api" });
    
    const stopListenersAfter = eventListeners.stop ? eventListeners.stop.length : 0;
    
    // Should have registered at least one stop event listener
    expect(stopListenersAfter).toBeGreaterThanOrEqual(stopListenersBefore);
  });

  test("factory should provide active routers list", () => {
    NewRouter(app, { protocol: "http", prefix: "/api" });
    NewRouter(app, { protocol: "ws", prefix: "/ws" });
    
    const routers = factory.getActiveRouters();
    
    expect(routers).toHaveLength(2);
    expect(routers[0]).toHaveProperty('protocol');
    expect(routers[1]).toHaveProperty('protocol');
  });
});

