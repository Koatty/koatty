# Koatty 🚀

[![npm version](https://img.shields.io/npm/v/koatty)](https://www.npmjs.com/package/koatty)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Koa2 + Typescript + IOC = koatty. **Koatty** is a progressive Node.js framework for building efficient and scalable server-side applications. Perfect for crafting enterprise-level APIs, microservices, and full-stack applications with TypeScript excellence.

## Why Koatty? 💡

- 🚄 **High Performance**: Built on top of Koa2 with optimized architecture
- 🧩 **Full-Featured**: Supports gRPC, HTTP, WebSocket, Schedule tasks, and more
- 🧠 **TypeScript First**: Native TypeScript support with elegant OOP design
- 🌀 **Spring-like IOC Container**: Powerful dependency injection system with autowiring
- ✂️ **AOP Support**: Aspect-oriented programming with decorator-based interceptors
- 🔌 **Extensible Architecture**: Plugin system with dependency injection
- 📦 **Modern Tooling**: CLI scaffolding, testing utilities, and production-ready configs
- 🌐 **Protocol Agnostic**: Write once, deploy as HTTP/gRPC/WebSocket services


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

## Core Features ✨

### 📡 Multi-Protocol Support
```typescript
// config/config.ts
export default {
  ...
  protocol: "grpc", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss'
  ...
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
    ...

    @Autowired()
    private userService: UserService;

    async test(id: number) {
        const info = await this.userService.findUser(id);
        ...
    }
}
```

### ✂️ Aspect-Oriented Programming
```javascript
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
export class UserController {}
```

### 🔌 Plugin System
```javascript
// plugin/logger.ts
export function LoggerPlugin: IPlugin {
  run(options: any, app: App) {
    // todo something or hook on app.event
    Logger.Debug("LoggerPlugin");
    return Promise.resolve();
  }
}
```

## New features ✨

* HTTP、HTTPS、HTTP2、gRPC、WebSocket server.✔️
* Support loading environment configuration, parsing command line parameters (process.argv) and environment variables (process.env).✔️
* `@ExceptionHandler()` Register global exception handling.✔️
* graceful shutdown and pre-exit event.✔️
* custom decorator based on app events.✔️
* GraphQL supporting. 💪
* OpenTelemetry . 💪


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


## Community 🌍

- [GitHub Discussions](https://github.com/Koatty/koatty/discussions)

## Contributors ✨

Thanks to these amazing developers:

<!-- Add contributor list here -->


## License 📄

BSD-3 © [Koatty Team](https://github.com/Koatty)
