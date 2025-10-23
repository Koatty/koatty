/*
 * @Description: Test for multi-protocol graceful shutdown
 * @Usage: Verify that shutdownAll() only executes once in multi-protocol env
 * @Author: richen
 * @Date: 2025-10-14
 */

import { RouterFactory } from "../src/router/factory";
import { NewRouter } from "../src/router/router";

describe("Multi-Protocol Graceful Shutdown", () => {
  let mockApp: any;
  let appStopHandlers: Function[];

  beforeEach(() => {
    // Reset factory state
    const factory = RouterFactory.getInstance();
    (factory as any).activeRouters = [];
    (factory as any).isShuttingDown = false;
    (factory as any).hasShutdown = false;

    // Create mock app
    appStopHandlers = [];
    mockApp = {
      use: jest.fn(),
      once: jest.fn((event: string, handler: Function) => {
        if (event === "appStop") {
          appStopHandlers.push(handler);
        }
      }),
      on: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should register multiple appStop handlers in multi-protocol environment", () => {
    // Create routers for different protocols
    NewRouter(mockApp, { protocol: "http", prefix: "/api" });
    NewRouter(mockApp, { protocol: "ws", prefix: "/ws" });
    NewRouter(mockApp, { protocol: "grpc", prefix: "/grpc", ext: { protoFile: "./test.proto" } });
    NewRouter(mockApp, { protocol: "graphql", prefix: "/graphql", ext: { schemaFile: "./test.graphql" } });

    // Verify that 4 appStop handlers were registered
    const appStopCalls = mockApp.once.mock.calls.filter(
      (call: any[]) => call[0] === "appStop"
    );
    expect(appStopCalls.length).toBe(4);
    expect(appStopHandlers.length).toBe(4);
  });

  test("should only execute shutdownAll() once despite multiple calls", async () => {
    const factory = RouterFactory.getInstance();
    const shutdownSpy = jest.spyOn(factory, "shutdownAll");

    // Create mock routers with cleanup methods
    const mockRouters = [
      { protocol: "http", cleanup: jest.fn() },
      { protocol: "ws", cleanup: jest.fn() },
      { protocol: "grpc", cleanup: jest.fn() },
      { protocol: "graphql", cleanup: jest.fn() },
    ];

    // Manually set active routers
    (factory as any).activeRouters = mockRouters;

    // Simulate multiple appStop handlers being triggered
    await factory.shutdownAll(); // 1st call - should execute
    await factory.shutdownAll(); // 2nd call - should skip (hasShutdown = true)
    await factory.shutdownAll(); // 3rd call - should skip
    await factory.shutdownAll(); // 4th call - should skip

    // Verify shutdownAll was called 4 times
    expect(shutdownSpy).toHaveBeenCalledTimes(4);

    // Verify cleanup was only called once per router
    mockRouters.forEach((router) => {
      expect(router.cleanup).toHaveBeenCalledTimes(1);
    });

    shutdownSpy.mockRestore();
  });

  test("should handle concurrent shutdownAll() calls gracefully", async () => {
    const factory = RouterFactory.getInstance();

    // Create mock routers
    const mockRouters = [
      {
        protocol: "http",
        cleanup: jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100))),
      },
      {
        protocol: "ws",
        cleanup: jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100))),
      },
    ];

    (factory as any).activeRouters = mockRouters;

    // Trigger multiple concurrent shutdownAll() calls
    const promises = [
      factory.shutdownAll(),
      factory.shutdownAll(),
      factory.shutdownAll(),
    ];

    await Promise.all(promises);

    // Verify cleanup was only called once per router
    mockRouters.forEach((router) => {
      expect(router.cleanup).toHaveBeenCalledTimes(1);
    });

    // Verify activeRouters was cleared
    expect((factory as any).activeRouters.length).toBe(0);
  });

  test("should set correct flags during shutdown lifecycle", async () => {
    const factory = RouterFactory.getInstance();

    // Initial state
    expect((factory as any).isShuttingDown).toBe(false);
    expect((factory as any).hasShutdown).toBe(false);

    // Create mock router
    (factory as any).activeRouters = [
      {
        protocol: "http",
        cleanup: jest.fn(async () => {
          // During shutdown, isShuttingDown should be true
          expect((factory as any).isShuttingDown).toBe(true);
          expect((factory as any).hasShutdown).toBe(false);
        }),
      },
    ];

    await factory.shutdownAll();

    // After shutdown
    expect((factory as any).isShuttingDown).toBe(false);
    expect((factory as any).hasShutdown).toBe(true);
  });

  test("should skip shutdown if no active routers", async () => {
    const factory = RouterFactory.getInstance();
    (factory as any).activeRouters = [];

    await factory.shutdownAll();

    expect((factory as any).hasShutdown).toBe(true);
    expect((factory as any).isShuttingDown).toBe(false);
  });

  test("should handle cleanup errors gracefully", async () => {
    const factory = RouterFactory.getInstance();

    const mockRouters = [
      {
        protocol: "http",
        cleanup: jest.fn(),
      },
      {
        protocol: "ws",
        cleanup: jest.fn(() => {
          throw new Error("Cleanup failed");
        }),
      },
      {
        protocol: "grpc",
        cleanup: jest.fn(),
      },
    ];

    (factory as any).activeRouters = mockRouters;

    // Should not throw despite one router failing
    await expect(factory.shutdownAll()).resolves.not.toThrow();

    // Verify all cleanups were attempted
    expect(mockRouters[0].cleanup).toHaveBeenCalled();
    expect(mockRouters[1].cleanup).toHaveBeenCalled();
    expect(mockRouters[2].cleanup).toHaveBeenCalled();

    // Verify shutdown completed
    expect((factory as any).hasShutdown).toBe(true);
    expect((factory as any).activeRouters.length).toBe(0);
  });

  test("integration: simulate real multi-protocol shutdown scenario", async () => {
    const factory = RouterFactory.getInstance();
    
    // Reset state
    (factory as any).activeRouters = [];
    (factory as any).isShuttingDown = false;
    (factory as any).hasShutdown = false;

    // Create routers (they will register appStop handlers)
    NewRouter(mockApp, { protocol: "http", prefix: "/api" });
    NewRouter(mockApp, { protocol: "ws", prefix: "/ws" });
    NewRouter(mockApp, { protocol: "grpc", prefix: "/grpc", ext: { protoFile: "./test.proto" } });

    // Verify 4 routers were created (HTTP = 1, WS = 1, gRPC = 1, + initial state)
    const routerCount = factory.getActiveRouterCount();
    expect(routerCount).toBeGreaterThan(0);

    // Simulate app emitting appStop event (all handlers called)
    const shutdownPromises = appStopHandlers.map((handler) => handler());
    await Promise.all(shutdownPromises);

    // Verify only one shutdown occurred
    expect((factory as any).hasShutdown).toBe(true);
    expect(factory.getActiveRouterCount()).toBe(0);
  });
});

