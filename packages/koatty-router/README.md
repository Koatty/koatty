# koatty_router

Koatty路由组件，支持HTTP1/2、WebSocket、gRPC和GraphQL协议的统一路由管理。

## 特性

- 🚀 **多协议支持** - HTTP、HTTPS、HTTP/2、HTTP/3、WebSocket、gRPC、GraphQL
- 🏭 **工厂模式** - 灵活的路由器创建和管理
- 🔧 **中间件管理器** - 统一的中间件注册、组合和条件执行
- 📝 **参数验证** - 强大的输入验证和DTO支持
- 🎯 **装饰器支持** - 简洁的路由定义和参数注入
- ⚡ **高性能** - 优化的payload解析和路由匹配
- 🌊 **gRPC流处理** - 完整支持四种gRPC流类型，包括自动检测、背压控制和并发管理

## 安装

```bash
npm install koatty_router
```

## 快速开始

### 基础路由使用

```typescript
import { NewRouter } from "koatty_router";
import { Koatty } from "koatty_core";

const app = new Koatty();

// 创建HTTP路由器
const httpRouter = NewRouter(app, {
  protocol: "http",
  prefix: "/api"
});

// 创建WebSocket路由器
const wsRouter = NewRouter(app, {
  protocol: "ws",
  prefix: "/ws",
  ext: {
    maxFrameSize: 1024 * 1024,
    heartbeatInterval: 15000,
    maxConnections: 1000
  }
});

// 创建gRPC路由器
const grpcRouter = NewRouter(app, {
  protocol: "grpc",
  prefix: "/grpc",
  ext: {
    protoFile: "./proto/service.proto",
    poolSize: 10,
    streamConfig: {
      maxConcurrentStreams: 50,
      streamTimeout: 60000
    }
  }
});
```

### 控制器装饰器

```typescript
import { Get, Post, Controller } from "koatty_router";

@Controller("/user")
export class UserController {
  
  @Get("/profile")
  async getProfile(@Get("id") id: string) {
    return { id, name: "用户" };
  }
  
  @Post("/create")
  async createUser(@Post() userData: UserDTO) {
    return { success: true };
  }
}
```

## 路由器工厂模式

```typescript
import { RouterFactory, RegisterRouter } from "koatty_router";

const factory = RouterFactory.getInstance();

// 获取支持的协议
console.log(factory.getSupportedProtocols()); 
// ['http', 'https', 'ws', 'wss', 'grpc', 'graphql']

// 创建路由器
const router = factory.create("http", app, { prefix: "/api" });

// 注册自定义路由器
@RegisterRouter("mqtt")
class MqttRouter implements KoattyRouter {
  // 自定义路由器实现
}
```

## 中间件管理

`RouterMiddlewareManager` 专注于路由级别的中间件注册、组合和条件执行，支持基于路由的独立配置。

### 核心特性

- 🎯 **路由级别隔离** - 每个路由的中间件实例独立配置
- 🔧 **智能实例管理** - 使用 `${middlewareName}@${route}#${method}` 格式的唯一标识
- ⚡ **预组合优化** - 注册时组合中间件，提升运行时性能
- 🔄 **异步中间件类** - 完整支持异步 `run` 方法

### 中间件定义

```typescript
import { Middleware } from "koatty_router";

@Middleware()
export class AuthMiddleware {
  async run(config: any, app: Application) {
    return async (ctx: KoattyContext, next: KoattyNext) => {
      console.log('Auth middleware executed');
      ctx.authChecked = true;
      await next();
    };
  }
}
```

### 装饰器使用方式

#### 1. 基础中间件配置

```typescript
// 控制器级别中间件
@Controller('/api', [AuthMiddleware])
export class UserController {
  
  @GetMapping('/users')
  getUsers() {
    return 'users list';
  }
  
  // 方法级别中间件
  @GetMapping('/admin', { 
    middleware: [RateLimitMiddleware] 
  })
  adminAction() {
    return 'admin action';
  }
}
```

#### 2. 高级中间件配置

使用 `withMiddleware` 函数配置优先级、条件、元数据等高级特性：

```typescript
import { withMiddleware } from 'koatty_router';

@Controller('/api')
export class UserController {
  
  @GetMapping('/users', {
    middleware: [
      withMiddleware(AuthMiddleware, { 
        priority: 100,
        metadata: { role: 'admin' }
      }),
      withMiddleware(RateLimitMiddleware, { 
        priority: 90,
        conditions: [
          { type: 'header', value: 'x-api-key', operator: 'contains' }
        ]
      })
    ]
  })
  getUsers() {
    return 'users list';
  }

  // 条件中间件
  @PostMapping('/admin', {
    middleware: [
      withMiddleware(AuthMiddleware, {
        priority: 100,
        conditions: [
          { type: 'header', value: 'x-admin-token', operator: 'contains' }
        ]
      })
    ]
  })
  adminAction() {
    return 'admin action';
  }
}
```

#### 3. 中间件元数据配置

通过 `metadata` 为中间件传递配置参数：

```typescript
@GetMapping('/rate-limited', {
  middleware: [
    withMiddleware(RateLimitMiddleware, {
      priority: 100,
      metadata: {
        limit: 100,           // 每分钟最大请求数
        window: 60000,        // 时间窗口（毫秒）
        keyGenerator: 'ip'    // 限流键生成策略
      }
    })
  ]
})
rateLimitedEndpoint() {
  return 'rate limited endpoint';
}
```

**中间件类接收配置：**

```typescript
class RateLimitMiddleware {
  async run(config: any, app: any) {
    const { 
      limit = 60, 
      window = 60000, 
      keyGenerator = 'ip' 
    } = config;
    
    return async (ctx: KoattyContext, next: KoattyNext) => {
      const key = keyGenerator === 'ip' ? ctx.ip : ctx.user?.id;
      
      if (await this.isRateLimited(key, limit, window)) {
        ctx.status = 429;
        ctx.body = { error: 'Rate limit exceeded' };
        return;
      }
      
      await next();
    };
  }
}
```

#### 4. 中间件禁用和添加功能

通过 `enabled: false` 配置可以禁用中间件的执行：

**控制器级别禁用**：控制器下所有路由都不执行该中间件
**方法级别禁用**：只有该方法不执行指定的中间件（仅限控制器已声明的中间件）
**方法级别添加**：可以添加控制器未声明的中间件，仅在该方法中生效

```typescript
@Controller('/api', [
  AuthMiddleware,
  withMiddleware(RateLimitMiddleware, { enabled: false }), // 控制器级别禁用
  LoggingMiddleware
])
export class UserController {
  
  @Get('/users')
  async getUsers() {
    // 执行 AuthMiddleware 和 LoggingMiddleware
  }
  
  @Post('/users', [
    withMiddleware(AuthMiddleware, { enabled: false }), // 方法级别禁用
    ValidationMiddleware // 方法级别添加
  ])
  async createUser() {
    // 执行 LoggingMiddleware 和 ValidationMiddleware
  }
  
  @Put('/users/:id', [
    withMiddleware(AuthMiddleware, { enabled: false }),     // 禁用认证
    withMiddleware(AdminAuthMiddleware, { priority: 80 })   // 添加管理员认证
  ])
  async updateUser() {
    // 只执行 AdminAuthMiddleware
  }
}
```

**优先级规划建议：**
- **100+**: 认证和授权中间件
- **90-99**: 限流和安全中间件  
- **80-89**: 验证和数据处理中间件
- **70-79**: 日志和监控中间件
- **50-69**: 业务逻辑中间件

## 参数验证和注入

### 参数装饰器

```typescript
import { Get, Post, Header, PathVariable, File } from "koatty_router";

@Controller("/api")
export class ApiController {
  
  @Get("/user/:id")
  async getUser(
    @PathVariable("id") id: string,
    @Get("include") include?: string,
    @Header("authorization") token?: string
  ) {
    return { id, include, token };
  }
  
  @Post("/upload")
  async upload(
    @File("file") file: any,
    @Post() metadata: any
  ) {
    return { filename: file.name, metadata };
  }
}
```

### DTO验证

```typescript
import { IsString, IsNumber, IsEmail } from "koatty_validation";

export class UserDTO {
  @IsString()
  name: string;
  
  @IsNumber()
  age: number;
  
  @IsEmail()
  email: string;
}

@Controller("/user")
export class UserController {
  @Post("/create")
  @Validated()
  async create(@Post() user: UserDTO) {
    return user;
  }
}
```

## 协议特定功能

### gRPC 流处理

```typescript
@GrpcController()
export class StreamController {
  
  // 服务器流
  async serverStream(ctx: any) {
    for (let i = 0; i < 10; i++) {
      ctx.writeStream({ data: `Message ${i}` });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    ctx.endStream();
  }
  
  // 双向流
  async bidirectionalStream(ctx: any) {
    if (ctx.streamMessage) {
      const response = processMessage(ctx.streamMessage);
      ctx.writeStream(response);
    }
  }
}
```

**gRPC 流特性：**
- 🔄 **自动流类型检测** - 无需手动指定流类型
- 🚦 **背压控制** - 防止内存溢出和性能问题
- ⚡ **并发管理** - 限制同时活跃的流数量

## 配置选项

### RouterOptions

```typescript
interface RouterOptions {
  prefix: string;              // 路由前缀
  protocol?: string;           // 协议类型
  methods?: string[];          // 支持的HTTP方法
  sensitive?: boolean;         // 大小写敏感
  strict?: boolean;           // 严格匹配
  payload?: PayloadOptions;    // 载荷解析选项
  ext?: Record<string, any>;   // 协议特定扩展配置
}
```

### 协议特定扩展配置 (ext)

#### WebSocket 配置
```typescript
ext: {
  maxFrameSize?: number;        // 最大分帧大小(字节)，默认1MB
  heartbeatInterval?: number;   // 心跳检测间隔(ms)，默认15秒
  heartbeatTimeout?: number;    // 心跳超时时间(ms)，默认30秒
  maxConnections?: number;      // 最大连接数，默认1000
  maxBufferSize?: number;       // 最大缓冲区大小(字节)，默认10MB
}
```

#### gRPC 配置
```typescript
ext: {
  protoFile: string;           // Protocol Buffer 文件路径（必需）
  poolSize?: number;           // 连接池大小，默认10
  batchSize?: number;          // 批处理大小，默认10
  streamConfig?: {             // 流配置
    maxConcurrentStreams?: number;    // 最大并发流数量，默认50
    streamTimeout?: number;           // 流超时时间(ms)，默认60秒
    backpressureThreshold?: number;   // 背压阈值(字节)，默认2048
  };
  enableReflection?: boolean;          // 是否启用反射，默认false
}
```

#### GraphQL 配置
```typescript
ext: {
  schemaFile: string;          // GraphQL Schema 文件路径（必需）
  playground?: boolean;        // 启用 GraphQL Playground，默认false
  introspection?: boolean;     // 启用内省查询，默认true
  debug?: boolean;             // 调试模式，默认false
  depthLimit?: number;         // 查询深度限制，默认10
  complexityLimit?: number;    // 查询复杂度限制，默认1000
}
```

## 最佳实践

### 1. 中间件分层管理

```typescript
// 框架级别的全局中间件（由Koatty框架管理）
// - 错误处理、请求日志、CORS处理、安全头设置

// 路由级别的中间件（由RouterMiddlewareManager管理）
const routeMiddlewareOrder = [
  "paramValidation", // 100 - 参数验证
  "routeAuth",       // 90  - 路由认证
  "routeCache",      // 80  - 路由缓存
  "rateLimit"        // 70  - 限流控制
];
```

### 2. 路由器选择

```typescript
const protocolMap = {
  "web-api": "http",
  "real-time": "ws", 
  "microservice": "grpc",
  "query-api": "graphql"
};
```

### 3. Graceful Shutdown（优雅关闭）

在生产环境中，正确处理应用终止信号非常重要，特别是使用 WebSocket 或 gRPC 时。`koatty_router` 提供了完善的资源清理机制。

#### 自动清理（推荐）

路由器组件会自动注册到 Koatty 框架的 `stop` 事件，当应用收到 `SIGTERM` 或 `SIGINT` 信号时，框架会自动触发清理：

```typescript
import { NewRouter } from "koatty_router";
import { Koatty } from "koatty_core";

const app = new Koatty();

// 创建路由器（自动注册清理处理）
const wsRouter = NewRouter(app, { 
  protocol: "ws", 
  prefix: "/ws" 
});

const grpcRouter = NewRouter(app, { 
  protocol: "grpc", 
  prefix: "/grpc",
  ext: { protoFile: "./proto/service.proto" }
});

// 上层框架会在收到终止信号时自动调用清理
// 无需手动处理
```

#### 手动清理

在某些场景下，你可能需要手动控制清理时机：

```typescript
import { RouterFactory } from "koatty_router";

const factory = RouterFactory.getInstance();

// 获取活跃路由器数量
console.log(`Active routers: ${factory.getActiveRouterCount()}`);

// 手动触发所有路由器的清理
await factory.shutdownAll();
```

#### 各协议路由器的清理行为

**WebSocket 路由器：**
- 清理所有活跃连接的定时器（心跳、超时检测）
- 清理定期维护定时器
- 释放连接缓冲区内存

**gRPC 路由器：**
- 关闭所有活跃的流
- 刷新批处理队列（处理待处理的请求）
- 清空连接池

**HTTP/GraphQL 路由器：**
- 无状态协议，无需特殊清理

#### Kubernetes 部署配置

```yaml
apiVersion: v1
kind: Pod
spec:
  terminationGracePeriodSeconds: 60  # 给予足够时间清理资源
  containers:
  - name: app
    lifecycle:
      preStop:
        exec:
          # 可选：延迟确保负载均衡器已摘除节点
          command: ["/bin/sh", "-c", "sleep 5"]
```

#### Docker Compose 配置

```yaml
version: '3.8'
services:
  app:
    image: your-app:latest
    stop_grace_period: 60s  # 设置停止等待时间
```

#### 清理流程

1. **接收信号**：上层框架（Koatty）监听 `SIGTERM`/`SIGINT`
2. **停止接收新请求**：关闭服务器监听端口
3. **触发清理**：发出 `stop` 事件
4. **路由器清理**：按顺序清理所有活跃路由器
5. **完成退出**：所有资源释放后正常退出进程

## API文档

详细的API文档请参考：[API Documentation](./docs/api.md)

## 许可证

[BSD-3-Clause](./LICENSE)
