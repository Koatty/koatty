# Koatty 🚀

[![npm version](https://img.shields.io/npm/v/koatty)](https://www.npmjs.com/package/koatty)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Koa2 + TypeScript + IOC = Koatty. **Koatty** is a progressive Node.js framework for building efficient and scalable server-side applications. It's perfect for crafting enterprise-level APIs, microservices, and full-stack applications with TypeScript excellence.

## Why Koatty? 💡

- 🚄 **High Performance**: Built on top of Koa2 with optimized architecture
- 🧩 **Full-Featured**: Supports gRPC, HTTP, WebSocket, scheduled tasks, and more
- 🧠 **TypeScript First**: Native TypeScript support with elegant OOP design
- 🌀 **Spring-like IOC Container**: Powerful dependency injection system with autowiring
- ✂️ **AOP Support**: Aspect-oriented programming with decorator-based interceptors
- 🔌 **Extensible Architecture**: Plugin system with dependency injection
- 📦 **Modern Tooling**: CLI scaffolding, testing utilities, and production-ready configurations
- 🌐 **Protocol Agnostic**: Write once, deploy as HTTP/gRPC/WebSocket services

### ✨ New Features

- ✅ **Multi-Protocol Architecture** - Run HTTP, HTTPS, HTTP/2, HTTP/3, gRPC, WebSocket, and GraphQL simultaneously
- ✅ **Intelligent Metadata Cache** - LRU caching with preloading for 70%+ performance boost
- ✅ **Protocol-Specific Middleware** - Bind middleware to specific protocols with `@Middleware({ protocol: [...] })`
- ✅ **Graceful Shutdown** - Enhanced connection pool management and cleanup handlers
- ✅ **Enhanced gRPC Support** - Timeout detection, duplicate call protection, streaming improvements
- ✅ **Application Lifecycle Hooks** - Custom decorators with `BindEventHook` API for boot/ready/stop events
- ✅ **Version Conflict Detection** - Automatic detection and resolution of dependency conflicts
- ✅ **GraphQL over HTTP/2** - Automatic HTTP/2 upgrade with SSL for multiplexing and compression
- ✅ **Global Exception Handling** - `@ExceptionHandler()` decorator for centralized error management
- ✅ **OpenTelemetry Tracing** - Full-stack observability with distributed tracing
- 💪 **Swagger/OpenAPI 3.0** - Automatic API documentation generation

## Core Features ✨

### 📡 Multi-Protocol Support

Koatty now supports running multiple protocols simultaneously on different ports. Configure multiple servers easily:

```typescript
// config/config.ts
export default {
  ...
  server: {
    hostname: '127.0.0.1',
    port: 3000,
    protocol: ["http", "grpc"], // Multiple protocols: 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss' | 'graphql'
    trace: false,
  },
  ...
}
```

**Single Protocol (backward compatible):**
```typescript
// config/config.ts
export default {
  server: {
    protocol: "grpc", // Single protocol
  }
}
```

**Multi-Protocol Router Configuration:**

When using multiple protocols, configure protocol-specific extensions in `config/router.ts`:

```typescript
// config/router.ts
export default {
  ext: {
    // HTTP protocol config (optional)
    ...,
    
    // gRPC protocol config (optional)
    protoFile: "./resource/proto/Hello.proto",
    poolSize: 10,
    streamConfig: { messageCount: 50 }
    
    
    // WebSocket protocol config (optional)
    maxFrameSize: 1024 * 1024,
    heartbeatInterval: 15000,
    maxConnections: 1000
  }
}
```

**How It Works:**
- `koatty_serve` automatically creates server instances for each protocol
- `koatty_router` creates dedicated router instances for each protocol
- Controllers are automatically registered to appropriate routers based on their decorators
- HTTP controllers (`@Controller`) work with HTTP/HTTPS/HTTP2
- gRPC controllers (`@GrpcController`) work with gRPC
- GraphQL controllers (`@GraphQLController`) work with GraphQL (over HTTP/HTTPS)
- WebSocket controllers (`@WsController`) work with WebSocket

**Important Notes:**
- **GraphQL Protocol**: GraphQL is an application-layer protocol that runs over HTTP/HTTP2, not a separate transport protocol. When you specify `protocol: "graphql"`, Koatty automatically:
  - Uses **HTTP** as transport by default
  - Uses **HTTP/2** when SSL certificates are configured (recommended for production)
  
- **GraphQL over HTTP/2** (Recommended): HTTP/2 provides significant benefits for GraphQL:
  - **Multiplexing**: Handle multiple queries over a single connection
  - **Header Compression**: Reduce bandwidth for large queries
  - **Server Push**: Prefetch related resources
  - **HTTP/1.1 Fallback**: Automatic downgrade for compatibility
  
  To enable HTTP/2 for GraphQL, configure in `config/config.ts`:
  ```typescript
  // config/config.ts
  export default {
    server: {
      protocol: "graphql",
      ssl: {
        mode: 'auto',
        key: './ssl/server.key',
        cert: './ssl/server.crt'
      },
      ext: {
        maxConcurrentStreams: 100  // Optional: HTTP/2 config
      }
    }
  }
  ```
  
  And configure GraphQL schema in `config/router.ts`:
  ```typescript
  // config/router.ts
  export default {
    ext: {
      schemaFile: "./resource/graphql/schema.graphql"
    }
  }
  ```


### 💉 Dependency Injection (IOC Container v1.17.0)

**Enhanced Features:**
-✅ **Intelligent Metadata Cache** - LRU caching mechanism, significantly improves performance
-✅ **Metadata Preloading** - Preload at startup, optimize component registration
-✅ **Version Conflict Detection** - Automatically detect and resolve dependency version conflicts
-✅ **Circular Dependency Detection** - Circular dependency detection and resolution suggestions

```typescript
@Service()
export class UserService {
  async findUser(id: number) {
    return { id, name: 'Koatty User' };
  }
}

@Controller()
export class IndexController {
    app: App;
    ctx: KoattyContext;
    @Config("server")
    conf: { protocol: string | string[] };
    ...

    @Autowired()
    private userService: UserService;

    async test(id: number) {
        const info = await this.userService.findUser(id);
        ...
    }
}
```

**Performance Improvements:**
```typescript
// In Loader.ts - Metadata is now preloaded for optimal performance
IOC.preloadMetadata(); // Preload all metadata to populate cache

// Intelligent caching reduces reflect operations by 70%+
// Cache hits: ~95% in typical applications
```

### 🌐 Multi-Protocol Controllers

Different controllers for different protocols:

```typescript
// HTTP Controller
@Controller('/api')
export class UserController {
  @GetMapping('/users/:id')
  async getUser(@PathVariable('id') id: string) {
    return { id, name: 'User' };
  }
}

// gRPC Controller
@GrpcController('/Hello')
export class HelloController {
  @PostMapping('/SayHello')
  @Validated()
  async sayHello(@RequestBody() params: SayHelloRequestDto): Promise<SayHelloReplyDto> {
    const res = new SayHelloReplyDto();
    res.message = `Hello, ${params.name}!`;
    return res;
  }
}

// GraphQL Controller (runs over HTTP/HTTPS)
@GraphQLController('/graphql')
export class UserController {
  @GetMapping()
  async getUser(@RequestParam() id: string): Promise<User> {
    return { id, name: 'GraphQL User' };
  }
  
  @PostMapping()
  async createUser(@RequestParam() input: UserInput): Promise<User> {
    return { id: input.id, name: input.name };
  }
}
```

### ✂️ Aspect-Oriented Programming
```typescript
@Aspect()
export class LogAspect implements IAspect {
  app: App;

  run() {
    console.log('LogAspect');
  }
}

// Apply aspect to controller
@Controller()
@BeforeEach(LogAspect)
export class UserController {
  ...
  @After(LogAspect)
  test() {
    ...
  }
}
```

### 🔌 Plugin System & Middleware

**Protocol-Specific Middleware (New in v3.13):**
```typescript
// Middleware can now be bound to specific protocols
@Middleware({ protocol: ["http", "https"] })
export class HttpOnlyMiddleware implements IMiddleware {
  run(options: any, app: App) {
    return async (ctx: KoattyContext, next: Function) => {
      // This middleware only runs for HTTP/HTTPS protocols
      console.log('HTTP request:', ctx.url);
      await next();
    };
  }
}
```

**Plugin System:**
```typescript
// plugin/logger.ts
export class LoggerPlugin implements IPlugin {
  app: App;

  run() {
    // Hook into application lifecycle events
    Logger.Debug("LoggerPlugin");
    return Promise.resolve();
  }
}
```

**Application Lifecycle Events:**
```typescript
// Use BindEventHook to customize application behavior
export function CustomDecorator(): ClassDecorator {
  return (target: Function) => {
    BindEventHook(AppEvent.appBoot, async (app: KoattyApplication) => {
      // Executed during application boot
      console.log('App is booting...');
    }, target);
    
    BindEventHook(AppEvent.appReady, async (app: KoattyApplication) => {
      // Executed when app is ready
      console.log('App is ready!');
    }, target);
    
    BindEventHook(AppEvent.appStop, async (app: KoattyApplication) => {
      // Executed during graceful shutdown
      console.log('App is stopping...');
    }, target);
  };
}
```

## Benchmarks 📊

| Framework  | Requests/sec | Latency | Memory Usage |
| ---------- | ------------ | ------- | ------------ |
| **Koatty** | 13,321       | 1.43ms  | 54MB         |
| Express    | 12,456       | 1.45ms  | 52MB         |
| NestJS     | 11,892       | 1.51ms  | 63MB         |

*Tested on AWS t3.micro with 100 concurrent connections*

## Documentation 📚

- [中文文档](https://koatty.org/)
- [Getting Started Guide](https://github.com/Koatty/koatty_doc/blob/master/docs/README-en.md)
- [API Reference](https://koatty.org/#/?id=api)
- [Recipes & Best Practices](https://github.com/Koatty/koatty_awesome)
- [Example](https://github.com/Koatty/koatty_demo)

## Quick Start ⚡

1. **Install CLI**:
```bash
npm install -g koatty_cli
```

2. **Create Project**:
```bash
koatty new awesome-app
```

3. **Run Development Server**:
```bash
cd awesome-app
npm run dev
```

## Community 🌍

- [GitHub Discussions](https://github.com/Koatty/koatty/discussions)

## Contributors ✨

Thanks to these amazing developers:

<!-- Add contributor list here -->

## License 📄

BSD-3 © [Koatty Team](https://github.com/Koatty)
