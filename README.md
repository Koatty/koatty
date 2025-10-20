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

- ✅ **Multi-Protocol Architecture** - Run HTTP, HTTPS, HTTP/2,  HTTP/3, gRPC, WebSocket, and GraphQL simultaneously
- ✅ **Stable Multi-Protocol Support** - Full support for multiple routers with proper payload handling (v1.20.0-4+)
- ✅ **GraphQL over HTTP/2** - Automatic HTTP/2 upgrade for GraphQL with SSL (multiplexing, header compression)
- ✅ **Modular Server Creation** - Independent `CreateServers()` and `CreateRouters()` functions for flexibility
- ✅ **Protocol-Specific Configuration** - Fine-grained control for each protocol (SSL, HTTP/2 settings, etc.)
- ✅ **Graceful Shutdown** - Enhanced connection pool management with proper cleanup
- ✅ **Connection Pool Monitoring** - Real-time metrics and health checks for all protocols
- ✅ **Environment-Based Config** - Support for command-line arguments and environment variables
- ✅ **Global Exception Handling** - `@ExceptionHandler()` decorator for centralized error management
- ✅ **OpenTelemetry Tracing** - Full-stack observability with distributed tracing
- ✅ **Hot Configuration Reload** - Runtime configuration updates without restart (where supported)
- ✅ **Custom App Events** - Bind decorators to application lifecycle events
- ✅ **Route-Level Middleware** - Bind middleware to specific controllers and methods
- ✅ **gRPC Streaming** - Full support for bidirectional, client, and server streaming
- ✅ **Swagger/OpenAPI 3.0** - Automatic API documentation generation

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
    http: {},
    
    // gRPC protocol config
    grpc: {
      protoFile: "./resource/proto/Hello.proto",
      poolSize: 10,
      streamConfig: { maxConcurrentStreams: 50 }
    },
    
    // WebSocket protocol config
    ws: {
      maxFrameSize: 1024 * 1024,
      heartbeatInterval: 15000,
      maxConnections: 1000
    }
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
  
  To enable HTTP/2 for GraphQL, add SSL certificate configuration in `config/router.ts`:
  ```typescript
  ext: {
    graphql: {
      schemaFile: "./resource/graphql/schema.graphql",
      keyFile: "./ssl/server.key",    // Enable HTTP/2 with SSL
      crtFile: "./ssl/server.crt",
      ssl: { mode: 'auto', allowHTTP1: true },     // Optional: SSL config
      http2: { maxConcurrentStreams: 100 }         // Optional: HTTP/2 config
    }
  }
  ```


### 💉 Dependency Injection
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

### 🔌 Plugin System
```typescript
// plugin/logger.ts
export class LoggerPlugin implements IPlugin {
  app: App;

  run() {
    // todo something or hook on app.event
    Logger.Debug("LoggerPlugin");
    return Promise.resolve();
  }
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
