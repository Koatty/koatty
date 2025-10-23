/*
 * @Description: Component decorators and interfaces test
 * @Usage: npm test -- test/component.test.ts  
 * @Author: richen
 * @Date: 2025-06-08 17:30:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { IOC } from "koatty_container";
import {
  Controller,
  GrpcController,
  WebSocketController,
  GraphQLController,
  Middleware,
  Service,
  Plugin,
  ControllerProtocol,
  CONTROLLER_ROUTER,
  implementsMiddlewareInterface,
  implementsControllerInterface,
  implementsServiceInterface,
  implementsPluginInterface,
  implementsAspectInterface,
  IMiddleware,
  IController,
  IService,
  IPlugin
} from "../src/Component";
import { KoattyApplication } from "../src/IApplication";
import { KoattyContext, KoattyNext } from "../src/IContext";

// Mock the IOC container methods
jest.mock("koatty_container", () => ({
  IOC: {
    getIdentifier: jest.fn(),
    saveClass: jest.fn(),
    savePropertyData: jest.fn()
  }
}));

describe("Component Decorators", () => {
  const mockIOC = IOC as jest.Mocked<typeof IOC>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIOC.getIdentifier.mockReturnValue("TestClass");
  });

  describe("Controller Decorator", () => {
    test("should register controller with default options", () => {
      @Controller()
      class TestController {}

      expect(mockIOC.getIdentifier).toHaveBeenCalledWith(TestController);
      expect(mockIOC.saveClass).toHaveBeenCalledWith("CONTROLLER", TestController, "TestClass");
      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "",
          protocol: ControllerProtocol.http,
          middleware: []
        },
        TestController,
        "TestClass"
      );
    });

    test("should register controller with custom path", () => {
      @Controller("/api")
      class ApiController {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "/api",
          protocol: ControllerProtocol.http,
          middleware: []
        },
        ApiController,
        "TestClass"
      );
    });

    test("should register controller with custom options", () => {
      // Mock middleware classes
      class TestMiddleware implements IMiddleware {
        run(options: any, app: KoattyApplication) {
          return async (ctx: KoattyContext, next: KoattyNext) => {
            await next();
          };
        }
      }

      @Controller("/api", {
        protocol: ControllerProtocol.websocket,
        middleware: [TestMiddleware]
      })
      class CustomController {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "/api",
          protocol: ControllerProtocol.websocket,
          middleware: ["TestMiddleware"]
        },
        CustomController,
        "TestClass"
      );
    });

    test("should throw error for invalid middleware", () => {
      expect(() => {
        @Controller("/api", {
          middleware: [function invalidMiddleware() {}]
        })
        class BadController {}
      }).toThrow("Middleware must be a class implementing IMiddleware");
    });

    test("should handle middleware without run method", () => {
      class InvalidMiddleware {}

      expect(() => {
        @Controller("/api", {
          middleware: [InvalidMiddleware]
        })
        class BadController {}
      }).toThrow("Middleware must be a class implementing IMiddleware");
    });
  });

  describe("GrpcController Decorator", () => {
    test("should register gRPC controller with default options", () => {
      @GrpcController()
      class GrpcTestController {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("CONTROLLER", GrpcTestController, "TestClass");
      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "",
          protocol: ControllerProtocol.grpc,
          middleware: []
        },
        GrpcTestController,
        "TestClass"
      );
    });

    test("should register gRPC controller with custom path", () => {
      @GrpcController("/grpc")
      class CustomGrpcController {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "/grpc",
          protocol: ControllerProtocol.grpc,
          middleware: []
        },
        CustomGrpcController,
        "TestClass"
      );
    });

    test("should register gRPC controller with middleware", () => {
      class GrpcMiddleware implements IMiddleware {
        run(options: any, app: KoattyApplication) {
          return async (ctx: KoattyContext, next: KoattyNext) => {
            await next();
          };
        }
      }

      @GrpcController("/grpc", {
        middleware: [GrpcMiddleware]
      })
      class GrpcWithMiddleware {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        expect.objectContaining({
          path: "/grpc",
          protocol: ControllerProtocol.grpc,
          middleware: ["GrpcMiddleware"]
        }),
        GrpcWithMiddleware,
        "TestClass"
      );
    });
  });

  describe("WebSocketController Decorator", () => {
    test("should register WebSocket controller with default options", () => {
      @WebSocketController()
      class WsController {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("CONTROLLER", WsController, "TestClass");
      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "",
          protocol: ControllerProtocol.websocket,
          middleware: []
        },
        WsController,
        "TestClass"
      );
    });

    test("should register WebSocket controller with custom path", () => {
      @WebSocketController("/ws")
      class CustomWsController {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "/ws",
          protocol: ControllerProtocol.websocket,
          middleware: []
        },
        CustomWsController,
        "TestClass"
      );
    });

    test("should register WebSocket controller with middleware", () => {
      class WsMiddleware implements IMiddleware {
        run(options: any, app: KoattyApplication) {
          return async (ctx: KoattyContext, next: KoattyNext) => {
            await next();
          };
        }
      }

      @WebSocketController("/ws", {
        middleware: [WsMiddleware]
      })
      class WsWithMiddleware {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        expect.objectContaining({
          path: "/ws",
          protocol: ControllerProtocol.websocket,
          middleware: ["WsMiddleware"]
        }),
        WsWithMiddleware,
        "TestClass"
      );
    });
  });

  describe("GraphQLController Decorator", () => {
    test("should register GraphQL controller with default options", () => {
      @GraphQLController()
      class GraphQLTestController {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("CONTROLLER", GraphQLTestController, "TestClass");
      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "",
          protocol: ControllerProtocol.graphql,
          middleware: []
        },
        GraphQLTestController,
        "TestClass"
      );
    });

    test("should register GraphQL controller with custom path", () => {
      @GraphQLController("/graphql")
      class CustomGraphQLController {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        {
          path: "/graphql",
          protocol: ControllerProtocol.graphql,
          middleware: []
        },
        CustomGraphQLController,
        "TestClass"
      );
    });

    test("should register GraphQL controller with middleware", () => {
      class GraphQLMiddleware implements IMiddleware {
        run(options: any, app: KoattyApplication) {
          return async (ctx: KoattyContext, next: KoattyNext) => {
            await next();
          };
        }
      }

      @GraphQLController("/graphql", {
        middleware: [GraphQLMiddleware]
      })
      class GraphQLWithMiddleware {}

      expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
        CONTROLLER_ROUTER,
        expect.objectContaining({
          path: "/graphql",
          protocol: ControllerProtocol.graphql,
          middleware: ["GraphQLMiddleware"]
        }),
        GraphQLWithMiddleware,
        "TestClass"
      );
    });
  });

  describe("Middleware Decorator", () => {
    test("should register middleware with default identifier", () => {
      @Middleware()
      class TestMiddleware {}

      expect(mockIOC.getIdentifier).toHaveBeenCalledWith(TestMiddleware);
      expect(mockIOC.saveClass).toHaveBeenCalledWith("MIDDLEWARE", TestMiddleware, "TestClass");
    });

    test("should register middleware with custom identifier", () => {
      @Middleware("CustomMiddleware")
      class TestMiddleware {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("MIDDLEWARE", TestMiddleware, "CustomMiddleware");
    });
  });

  describe("Service Decorator", () => {
    test("should register service with default identifier", () => {
      @Service()
      class TestService {}

      expect(mockIOC.getIdentifier).toHaveBeenCalledWith(TestService);
      expect(mockIOC.saveClass).toHaveBeenCalledWith("SERVICE", TestService, "TestClass");
    });

    test("should register service with custom identifier", () => {
      @Service("CustomService")
      class TestService {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("SERVICE", TestService, "CustomService");
    });
  });

  describe("Plugin Decorator", () => {
    test("should register plugin with valid name suffix", () => {
      mockIOC.getIdentifier.mockReturnValue("TestPlugin");

      @Plugin()
      class TestPlugin {}

      expect(mockIOC.getIdentifier).toHaveBeenCalledWith(TestPlugin);
      expect(mockIOC.saveClass).toHaveBeenCalledWith("COMPONENT", TestPlugin, "TestPlugin");
    });

    test("should register plugin with custom identifier ending with Plugin", () => {
      @Plugin("MyCustomPlugin")
      class TestPlugin {}

      expect(mockIOC.saveClass).toHaveBeenCalledWith("COMPONENT", TestPlugin, "MyCustomPlugin");
    });

    test("should throw error for invalid plugin name", () => {
      mockIOC.getIdentifier.mockReturnValue("InvalidClass");

      expect(() => {
        @Plugin()
        class InvalidClass {}
      }).toThrow("Plugin class name must be 'Plugin' suffix.");
    });

    test("should throw error for custom identifier without Plugin suffix", () => {
      expect(() => {
        @Plugin("InvalidName")
        class TestPlugin {}
      }).toThrow("Plugin class name must be 'Plugin' suffix.");
    });
  });
});

describe("Interface Implementation Checkers", () => {
  describe("implementsMiddlewareInterface", () => {
    test("should return true for valid middleware class", () => {
      class ValidMiddleware implements IMiddleware {
        run(options: any, app: KoattyApplication) {
          return async (ctx: KoattyContext, next: KoattyNext) => {
            await next();
          };
        }
      }

      expect(implementsMiddlewareInterface(ValidMiddleware.prototype)).toBe(true);
    });

    test("should return false for class without run method", () => {
      class InvalidMiddleware {}

      expect(implementsMiddlewareInterface(InvalidMiddleware.prototype)).toBe(false);
    });

    test("should return false for class with non-function run property", () => {
      class InvalidMiddleware {
        run = "not a function";
      }

      expect(implementsMiddlewareInterface(InvalidMiddleware.prototype)).toBe(false);
    });

    test("should return false for null/undefined", () => {
      // These should not throw but return false
      expect(() => implementsMiddlewareInterface(null)).toThrow();
      expect(() => implementsMiddlewareInterface(undefined)).toThrow();
    });
  });

  describe("implementsControllerInterface", () => {
    test("should return true for valid controller class", () => {
      class ValidController implements IController {
        readonly app: KoattyApplication = {} as KoattyApplication;
        readonly ctx: KoattyContext = {} as KoattyContext;
      }

      const instance = new ValidController();
      expect(implementsControllerInterface(instance)).toBe(true);
    });

    test("should return false for class without app property", () => {
      class InvalidController {
        readonly ctx: KoattyContext = {} as KoattyContext;
      }

      const instance = new InvalidController();
      expect(implementsControllerInterface(instance)).toBe(false);
    });

    test("should return false for class without ctx property", () => {
      class InvalidController {
        readonly app: KoattyApplication = {} as KoattyApplication;
      }

      const instance = new InvalidController();
      expect(implementsControllerInterface(instance)).toBe(false);
    });

    test("should return false for class without both properties", () => {
      class InvalidController {}

      const instance = new InvalidController();
      expect(implementsControllerInterface(instance)).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(() => implementsControllerInterface(null)).toThrow();
      expect(() => implementsControllerInterface(undefined)).toThrow();
    });
  });

  describe("implementsServiceInterface", () => {
    test("should return true for valid service class", () => {
      class ValidService implements IService {
        readonly app: KoattyApplication = {} as KoattyApplication;
      }

      const instance = new ValidService();
      expect(implementsServiceInterface(instance)).toBe(true);
    });

    test("should return false for class without app property", () => {
      class InvalidService {}

      const instance = new InvalidService();
      expect(implementsServiceInterface(instance)).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(() => implementsServiceInterface(null)).toThrow();
      expect(() => implementsServiceInterface(undefined)).toThrow();
    });
  });

  describe("implementsPluginInterface", () => {
    test("should return true for valid plugin class", () => {
      class ValidPlugin implements IPlugin {
        run(options: object, app: KoattyApplication): Promise<any> {
          return Promise.resolve();
        }
      }

      expect(implementsPluginInterface(ValidPlugin.prototype)).toBe(true);
    });

    test("should return false for class without run method", () => {
      class InvalidPlugin {}

      expect(implementsPluginInterface(InvalidPlugin.prototype)).toBe(false);
    });

    test("should return false for class with non-function run property", () => {
      class InvalidPlugin {
        run = "not a function";
      }

      expect(implementsPluginInterface(InvalidPlugin.prototype)).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(() => implementsPluginInterface(null)).toThrow();
      expect(() => implementsPluginInterface(undefined)).toThrow();
    });
  });

  describe("implementsAspectInterface", () => {
    test("should return true for valid aspect class", () => {
      class ValidAspect {
        app: KoattyApplication = {} as KoattyApplication;
        run(): any {
          return {};
        }
      }

      const instance = new ValidAspect();
      expect(implementsAspectInterface(instance)).toBe(true);
    });

    test("should return false for class without app property", () => {
      class InvalidAspect {
        run(): any {
          return {};
        }
      }

      expect(implementsAspectInterface(InvalidAspect.prototype)).toBe(false);
    });

    test("should return false for class without run method", () => {
      class InvalidAspect {
        app: KoattyApplication = {} as KoattyApplication;
      }

      expect(implementsAspectInterface(InvalidAspect.prototype)).toBe(false);
    });

    test("should return false for class with non-function run property", () => {
      class InvalidAspect {
        app: KoattyApplication = {} as KoattyApplication;
        run = "not a function";
      }

      expect(implementsAspectInterface(InvalidAspect.prototype)).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(() => implementsAspectInterface(null)).toThrow();
      expect(() => implementsAspectInterface(undefined)).toThrow();
    });
  });
});

describe("ControllerProtocol Enum", () => {
  test("should have correct protocol values", () => {
    expect(ControllerProtocol.http).toBe("http");
    expect(ControllerProtocol.websocket).toBe("ws");
    expect(ControllerProtocol.grpc).toBe("grpc");
    expect(ControllerProtocol.graphql).toBe("graphql");
  });
});

describe("Edge Cases and Error Handling", () => {
  const mockIOC = IOC as jest.Mocked<typeof IOC>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIOC.getIdentifier.mockReturnValue("TestClass");
  });

  test("should handle empty middleware array", () => {
    @Controller("/api", {
      middleware: []
    })
    class EmptyMiddlewareController {}

    expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
      CONTROLLER_ROUTER,
      expect.objectContaining({
        middleware: []
      }),
      EmptyMiddlewareController,
      "TestClass"
    );
  });

  test("should handle undefined options in Controller", () => {
    @Controller("/api", undefined)
    class UndefinedOptionsController {}

    expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
      CONTROLLER_ROUTER,
      {
        path: "/api",
        protocol: ControllerProtocol.http,
        middleware: []
      },
      UndefinedOptionsController,
      "TestClass"
    );
  });

  test("should handle partial options", () => {
    @Controller("/api", {
      protocol: ControllerProtocol.grpc
      // middleware not provided
    })
    class PartialOptionsController {}

    expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
      CONTROLLER_ROUTER,
      {
        path: "/api",
        protocol: ControllerProtocol.grpc,
        middleware: []
      },
      PartialOptionsController,
      "TestClass"
    );
  });

  test("should handle multiple middleware classes", () => {
    class Middleware1 implements IMiddleware {
      run(options: any, app: KoattyApplication) {
        return async (ctx: KoattyContext, next: KoattyNext) => {
          await next();
        };
      }
    }

    class Middleware2 implements IMiddleware {
      run(options: any, app: KoattyApplication) {
        return async (ctx: KoattyContext, next: KoattyNext) => {
          await next();
        };
      }
    }

    @Controller("/api", {
      middleware: [Middleware1, Middleware2]
    })
    class MultipleMiddlewareController {}

    expect(mockIOC.savePropertyData).toHaveBeenCalledWith(
      CONTROLLER_ROUTER,
      expect.objectContaining({
        middleware: ["Middleware1", "Middleware2"]
      }),
      MultipleMiddlewareController,
      "TestClass"
    );
  });
});
