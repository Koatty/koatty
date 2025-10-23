# koatty_serve

高性能单协议服务器框架，为Koatty提供统一的HTTP、HTTPS、HTTP/2、HTTP/3、WebSocket、gRPC服务支持。采用现代化架构设计，具备企业级的配置管理、连接池、优雅关闭、健康检查和性能监控功能。

## 🚀 核心特性

### 🏗️ 统一架构设计
- ✅ **模板方法模式**: 基于`BaseServer`的统一服务器架构
- ✅ **单协议设计**: 每个服务器实例专注于单一协议，职责清晰
- ✅ **多种协议支持**: HTTP、HTTPS、HTTP/2、HTTP/3 (QUIC)、WebSocket、WSS、gRPC
- ✅ **配置统一管理**: `ConfigHelper`提供一致的配置接口
- ✅ **连接池系统**: 高性能的协议专用连接池管理

### 🔧 统一配置管理
- 🔄 **统一配置接口**: 所有协议使用相同的配置模式
- 🔥 **配置热重载**: 智能检测配置变更，自动决定重启策略
- 📋 **类型安全**: 完整的TypeScript类型定义和验证
- 🎛️ **默认值管理**: 智能的默认配置和环境适配

### 🏊‍♂️ 高性能连接池
- ⚡ **协议专用池**: 每种协议优化的连接池实现
- 📊 **智能监控**: 实时连接统计和健康检查
- 🔄 **自动清理**: 过期连接自动清理和资源回收
- 🎯 **负载均衡**: 智能连接分配和负载管理

### 🛡️ 运维监控
- 🔄 **优雅关闭**: 五步式优雅关闭流程
- 🏥 **健康检查**: 多层次健康状态监控
- 📊 **性能监控**: 实时指标收集和历史数据
- 📝 **结构化日志**: 统一的日志系统和链路追踪

## 📦 安装

```bash
npm install koatty_serve
# 或者
yarn add koatty_serve
# 或者
pnpm add koatty_serve
```

## 🎯 快速开始

### 使用 NewServe 创建服务器（推荐）

```typescript
import { NewServe } from "koatty_serve";
import { KoattyApplication } from "koatty_core";

const app = new KoattyApplication();

// 创建单协议 HTTP 服务器
const server = NewServe(app, {
  hostname: '127.0.0.1',
  port: 3000,
  protocol: 'http'  // 单个协议
});

server.Start(() => {
  console.log('HTTP服务器已启动: http://127.0.0.1:3000');
});
```

### 运行多个协议服务

如果需要同时运行多个协议，创建多个服务器实例：

```typescript
import { NewServe } from "koatty_serve";

const app = new KoattyApplication();

// HTTP 服务器
const httpServer = NewServe(app, {
  hostname: '127.0.0.1',
  port: 3000,
  protocol: 'http'
});

// gRPC 服务器
const grpcServer = NewServe(app, {
  hostname: '127.0.0.1',
  port: 50051,
  protocol: 'grpc'
});

// WebSocket 服务器
const wsServer = NewServe(app, {
  hostname: '127.0.0.1',
  port: 8080,
  protocol: 'ws'
});

// 启动所有服务器
httpServer.Start(() => console.log('HTTP 服务器已启动'));
grpcServer.Start(() => console.log('gRPC 服务器已启动'));
wsServer.Start(() => console.log('WebSocket 服务器已启动'));
```

### 使用协议专用服务器类（高级用法）

```typescript
import { HttpServer } from "koatty_serve";
import { ConfigHelper } from "koatty_serve/config";

const app = new KoattyApplication();

// 使用ConfigHelper创建配置
const config = ConfigHelper.createHttpConfig({
  hostname: '127.0.0.1',
  port: 3000,
  connectionPool: {
    maxConnections: 1000,
    connectionTimeout: 30000
  }
});

// 直接创建HTTP服务器
const server = new HttpServer(app, config);

server.Start(() => {
  console.log('HTTP服务器已启动: http://127.0.0.1:3000');
});
```

### HTTPS服务器

```typescript
import { HttpsServer } from "koatty_serve";
import { ConfigHelper } from "koatty_serve/config";

const httpsConfig = ConfigHelper.createHttpsConfig({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'auto',
    key: './ssl/server.key',
    cert: './ssl/server.crt'
  },
  connectionPool: {
    maxConnections: 2000,
    keepAliveTimeout: 65000
  }
});

const httpsServer = new HttpsServer(app, httpsConfig);
httpsServer.Start(() => {
  console.log('HTTPS服务器已启动: https://0.0.0.0:443');
});
```

### gRPC服务器

```typescript
import { GrpcServer } from "koatty_serve";
import { ConfigHelper } from "koatty_serve/config";

const grpcConfig = ConfigHelper.createGrpcConfig({
  hostname: '127.0.0.1',
  port: 50051,
  ssl: {
    enabled: true,
    keyFile: './certs/server.key',
    certFile: './certs/server.crt',
    clientCertRequired: false
  },
  connectionPool: {
    maxConnections: 500,
    protocolSpecific: {
      keepAliveTime: 30000,
      maxReceiveMessageLength: 4 * 1024 * 1024,
      maxSendMessageLength: 4 * 1024 * 1024
    }
  }
});

const grpcServer = new GrpcServer(app, grpcConfig);
grpcServer.Start(() => {
  console.log('gRPC服务器已启动: 127.0.0.1:50051');
});
```

### HTTP/3服务器（基于QUIC）

```typescript
import { Http3Server } from "koatty_serve";
import { ConfigHelper } from "koatty_serve/config";

const http3Config = ConfigHelper.createHttp3Config({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'auto',
    key: './ssl/server.key',
    cert: './ssl/server.crt',
    alpnProtocols: ['h3'],  // HTTP/3 ALPN
  },
  quic: {
    maxIdleTimeout: 30000,
    maxUdpPayloadSize: 65527,
    initialMaxStreamsBidi: 100,
    initialMaxStreamsUni: 100,
  },
  http3: {
    maxHeaderListSize: 16384,
    qpackMaxTableCapacity: 4096,
  },
  connectionPool: {
    maxConnections: 2000,
    keepAliveTimeout: 65000
  }
});

const http3Server = new Http3Server(app, http3Config);
http3Server.Start(() => {
  console.log('HTTP/3服务器已启动: https://0.0.0.0:443 (QUIC)');
});
```

**注意**: HTTP/3 基于 QUIC 协议（UDP），使用 `@matrixai/quic` 作为 QUIC 传输层（基于 Cloudflare QuICHE），并实现了完整的 HTTP/3 帧解析和 QPACK 头部压缩（符合 RFC 9114 和 RFC 9204 规范）。

### WebSocket服务器

```typescript
import { WsServer } from "koatty_serve";
import { ConfigHelper } from "koatty_serve/config";

const wsConfig = ConfigHelper.createWebSocketConfig({
  hostname: '127.0.0.1',
  port: 8080,
  ssl: {
    enabled: false
  },
  connectionPool: {
    maxConnections: 5000,
    connectionTimeout: 60000,
    protocolSpecific: {
      pingInterval: 30000,
      pongTimeout: 5000,
      heartbeatInterval: 60000
    }
  }
});

const wsServer = new WsServer(app, wsConfig);
wsServer.Start(() => {
  console.log('WebSocket服务器已启动: ws://127.0.0.1:8080');
});
```

## 🏗️ 架构设计

### BaseServer模板方法模式

所有协议服务器都继承自`BaseServer`抽象类，实现统一的生命周期管理：

```typescript
abstract class BaseServer<T extends BaseServerOptions> {
  // 模板方法：定义服务器初始化流程
  protected initializeServer(): void {
    this.initializeConnectionPool();
    this.createProtocolServer();
    this.configureServerOptions();
    this.performProtocolSpecificInitialization();
  }
  
  // 模板方法：定义配置更新流程
  async updateConfig(newConfig: Partial<T>): Promise<void> {
    const analysis = this.analyzeConfigChanges(changedKeys, oldConfig, newConfig);
    if (analysis.requiresRestart) {
      await this.gracefulRestart(newConfig);
    } else {
      this.applyConfigChanges(changedKeys, newConfig);
    }
  }
  
  // 模板方法：定义优雅关闭流程
  async gracefulShutdown(options?: ShutdownOptions): Promise<void> {
    // 五步式关闭流程
    await this.stopAcceptingNewConnections(traceId);
    await this.waitDrainDelay(options.drainDelay, traceId);
    await this.waitForConnectionCompletion(timeout, traceId);
    await this.forceCloseRemainingConnections(traceId);
    this.stopMonitoringAndCleanup(traceId);
  }
  
  // 抽象方法：子类必须实现
  protected abstract initializeConnectionPool(): void;
  protected abstract createProtocolServer(): void;
  protected abstract configureServerOptions(): void;
}
```

### 统一配置管理

`ConfigHelper`提供了统一的配置创建接口：

```typescript
export class ConfigHelper {
  // HTTP配置
  static createHttpConfig(options: HttpConfigOptions): HttpServerOptions;
  
  // HTTPS配置  
  static createHttpsConfig(options: HttpsConfigOptions): HttpsServerOptions;
  
  // HTTP/2配置
  static createHttp2Config(options: Http2ConfigOptions): Http2ServerOptions;
  
  // gRPC配置
  static createGrpcConfig(options: GrpcConfigOptions): GrpcServerOptions;
  
  // WebSocket配置
  static createWebSocketConfig(options: WebSocketConfigOptions): WebSocketServerOptions;
}
```

### 连接池架构

每种协议都有专门优化的连接池管理器：

```typescript
// HTTP连接池
class HttpConnectionPoolManager extends ConnectionPoolManager<Socket> {
  // HTTP特定的连接管理
}

// gRPC连接池  
class GrpcConnectionPoolManager extends ConnectionPoolManager<GrpcConnection> {
  // gRPC特定的连接管理
  async addGrpcConnection(peer: string, metadata: any): Promise<boolean>;
}

// WebSocket连接池
class WebSocketConnectionPoolManager extends ConnectionPoolManager<WebSocket> {
  // WebSocket特定的连接管理
  async addWebSocketConnection(ws: WebSocket, request: IncomingMessage): Promise<boolean>;
}
```

## 🔧 配置管理

### 配置类型系统

```typescript
// 监听选项（用于传递配置）
interface ListeningOptions {
  hostname: string;
  port: number;
  protocol: string;
  trace?: boolean;
  ext?: {                        // 扩展配置字段
    ssl?: BaseSSLConfig;         // SSL 配置
    protoFile?: string;          // gRPC proto 文件
    schemaFile?: string;         // GraphQL schema 文件
    [key: string]: any;          // 其他扩展配置
  };
  connectionPool?: ConnectionPoolConfig;
}

// 基础服务器选项（不包含 ext）
interface BaseServerOptions {
  hostname: string;
  port: number;
  protocol: string;
  trace?: boolean;
  connectionPool?: ConnectionPoolConfig;
}

// SSL配置层次
interface BaseSSLConfig {
  enabled?: boolean;
  key?: string;                  // 私钥路径或内容
  cert?: string;                 // 证书路径或内容
  ca?: string;                   // CA证书路径或内容
  passphrase?: string;           // 私钥密码
  ciphers?: string;              // 加密套件
  honorCipherOrder?: boolean;    // 遵循加密套件顺序
  secureProtocol?: string;       // SSL/TLS 协议版本
}

// gRPC 和 WebSocket 使用的简单 SSL 配置
interface SSLConfig extends BaseSSLConfig {
  clientCertRequired?: boolean;  // 是否需要客户端证书
}

// HTTPS 使用的高级 SSL 配置
interface SSL1Config extends BaseSSLConfig {
  mode: 'auto' | 'manual' | 'mutual_tls';  // SSL 模式
  requestCert?: boolean;                    // 请求客户端证书
  rejectUnauthorized?: boolean;             // 拒绝未授权连接
  // 扩展配置选项
  handshakeTimeout?: number;                // TLS 握手超时
  sessionTimeout?: number;                  // TLS 会话超时
  SNICallback?: Function;                   // SNI 回调
  sessionIdContext?: string;                // 会话 ID 上下文
  ticketKeys?: Buffer;                      // TLS 会话票据密钥
  ALPNProtocols?: string[];                 // ALPN 协议
}

// HTTP/2 使用的 SSL 配置（支持 HTTP/1.1 降级）
interface SSL2Config extends SSL1Config {
  allowHTTP1?: boolean;                     // 允许 HTTP/1.1 回退
}

// HTTP/3 使用的 SSL 配置（基于 QUIC，必须使用 TLS 1.3）
interface SSL3Config extends BaseSSLConfig {
  mode: 'auto' | 'manual' | 'mutual_tls';
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
  // QUIC 特定配置
  alpnProtocols?: string[];                 // ALPN 协议（默认: ['h3']）
  maxIdleTimeout?: number;                  // 最大空闲超时
  initialMaxStreamsBidi?: number;           // 初始最大双向流数量
  initialMaxStreamsUni?: number;            // 初始最大单向流数量
}
```

### 配置方式

koatty_serve 支持两种 SSL 配置方式（向后兼容）：

#### 方式一：直接配置（推荐）

```typescript
const httpsConfig = ConfigHelper.createHttpsConfig({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {                        // 直接在顶层配置 SSL
    mode: 'auto',
    key: './ssl/server.key',
    cert: './ssl/server.crt'
  }
});
```

#### 方式二：通过 ext 配置（向后兼容）

```typescript
const httpsConfig = ConfigHelper.createHttpsConfig({
  hostname: '0.0.0.0',
  port: 443,
  ext: {
    ssl: {                      // 通过 ext 配置 SSL
      mode: 'auto',
      key: './ssl/server.key',
      cert: './ssl/server.crt'
    }
  }
});
```

### 配置热重载

```typescript
// 智能配置更新
const result = await server.updateConfig({
  connectionPool: {
    maxConnections: 2000,      // 运行时更新
    connectionTimeout: 60000   // 运行时更新
  }
});

// 关键配置变更（自动重启）
await server.updateConfig({
  hostname: '0.0.0.0',  // 触发优雅重启
  port: 8080,           // 触发优雅重启
  ssl: {                // 触发优雅重启
    mode: 'mutual_tls'
  }
});
```

## 🏊‍♂️ 连接池管理

### 统一连接池配置

```typescript
interface ConnectionPoolConfig {
  maxConnections?: number;        // 最大连接数
  connectionTimeout?: number;     // 连接超时
  keepAliveTimeout?: number;      // Keep-Alive超时
  requestTimeout?: number;        // 请求超时
  headersTimeout?: number;        // 头部超时
  
  // 协议特定配置
  protocolSpecific?: {
    // HTTP/2特定
    maxSessionMemory?: number;
    maxHeaderListSize?: number;
    
    // gRPC特定
    keepAliveTime?: number;
    maxReceiveMessageLength?: number;
    maxSendMessageLength?: number;
    
    // WebSocket特定
    pingInterval?: number;
    pongTimeout?: number;
    heartbeatInterval?: number;
  };
}
```

### 连接池监控

```typescript
// 获取连接池统计
const stats = server.connectionPool.getMetrics();
console.log('连接池统计:', {
  activeConnections: stats.activeConnections,
  totalConnections: stats.totalConnections,
  connectionsPerSecond: stats.connectionsPerSecond,
  averageLatency: stats.averageLatency,
  errorRate: stats.errorRate
});

// 获取连接池健康状态
const health = server.connectionPool.getHealth();
console.log('连接池健康:', health.status); // 'healthy' | 'degraded' | 'overloaded'
```

## 🛡️ 优雅关闭

### 五步式关闭流程

```typescript
interface ShutdownOptions {
  timeout?: number;           // 总超时时间 (默认30秒)
  drainDelay?: number;        // 排空延迟 (默认5秒)
  stepTimeout?: number;       // 单步超时 (默认6秒)
  skipSteps?: string[];       // 跳过的步骤
}

// 执行优雅关闭
await server.gracefulShutdown({
  timeout: 45000,
  drainDelay: 10000,
  stepTimeout: 8000
});
```

**关闭步骤详解**：

1. **停止接受新连接**: 关闭服务器监听，拒绝新连接
2. **等待排空延迟**: 给负载均衡器时间发现服务下线
3. **等待连接完成**: 等待现有连接的请求处理完毕
4. **强制关闭连接**: 终止超时的连接
5. **清理资源**: 停止监控任务，清理连接池

### 信号处理

terminus模块会自动处理进程信号（SIGTERM、SIGINT等），并调用`server.Stop()`方法执行优雅关闭流程。

`server.Stop()`方法内部会自动调用`gracefulShutdown()`，无需应用层手动处理：


## 🔐 SSL/TLS配置

### HTTPS SSL配置

#### 基础配置

```typescript
const httpsConfig = ConfigHelper.createHttpsConfig({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'auto',               // auto | manual | mutual_tls
    key: './ssl/server.key',    // 私钥路径或内容
    cert: './ssl/server.crt'    // 证书路径或内容
  }
});
```

#### 高级配置（双向TLS + 扩展选项）

```typescript
const httpsConfig = ConfigHelper.createHttpsConfig({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'mutual_tls',                    // 双向 TLS 认证
    key: './ssl/server.key',
    cert: './ssl/server.crt',
    ca: './ssl/ca.crt',                    // CA 证书
    passphrase: 'your-passphrase',         // 私钥密码
    ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:!RC4:!LOW:!MD5:!aNULL',
    honorCipherOrder: true,
    secureProtocol: 'TLSv1_2_method',
    requestCert: true,
    rejectUnauthorized: true,
    // 扩展配置选项
    handshakeTimeout: 10000,               // TLS 握手超时（毫秒）
    sessionTimeout: 300000,                // TLS 会话超时（毫秒）
    sessionIdContext: 'koatty-https',      // 会话 ID 上下文
    ALPNProtocols: ['http/1.1', 'h2']     // ALPN 协议列表
  }
});
```

### HTTP/2 SSL配置

```typescript
const http2Config = ConfigHelper.createHttp2Config({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'auto',
    key: './ssl/server.key',
    cert: './ssl/server.crt',
    allowHTTP1: true,                      // 允许回退到 HTTP/1.1
    ALPNProtocols: ['h2', 'http/1.1']     // HTTP/2 优先
  }
});
```

### HTTP/3 SSL配置（QUIC）

```typescript
const http3Config = ConfigHelper.createHttp3Config({
  hostname: '0.0.0.0',
  port: 443,
  ssl: {
    mode: 'auto',
    key: './ssl/server.key',
    cert: './ssl/server.crt',
    alpnProtocols: ['h3'],                 // HTTP/3 ALPN
    maxIdleTimeout: 30000,                 // QUIC 最大空闲超时
    initialMaxStreamsBidi: 100,            // 初始最大双向流
    initialMaxStreamsUni: 100              // 初始最大单向流
  }
});
```

### gRPC SSL配置

```typescript
const grpcConfig = ConfigHelper.createGrpcConfig({
  hostname: '0.0.0.0',
  port: 50051,
  ssl: {
    enabled: true,
    key: './certs/server.key',
    cert: './certs/server.crt',
    ca: './certs/ca.crt',
    clientCertRequired: true               // 需要客户端证书
  }
});
```

### WebSocket SSL配置（WSS）

```typescript
const wssConfig = ConfigHelper.createWebSocketConfig({
  hostname: '0.0.0.0',
  port: 8443,
  protocol: 'wss',                         // WebSocket Secure
  ssl: {
    enabled: true,
    key: './ssl/server.key',
    cert: './ssl/server.crt'
  }
});
```

## 📚 API参考

### 服务器类

- `HttpServer` - HTTP服务器实现
- `HttpsServer` - HTTPS服务器实现  
- `Http2Server` - HTTP/2服务器实现
- `Http3Server` - HTTP/3服务器实现（基于QUIC）
- `WsServer` - WebSocket服务器实现
- `GrpcServer` - gRPC服务器实现

### 配置类

- `ConfigHelper` - 统一配置创建器
- `ConnectionPoolConfig` - 连接池配置接口
- `BaseServerOptions` - 基础服务器选项
- `SSLConfig`, `SSL1Config`, `SSL2Config`, `SSL3Config` - SSL配置接口

### 连接池类

- `HttpConnectionPoolManager` - HTTP连接池
- `HttpsConnectionPoolManager` - HTTPS连接池
- `Http2ConnectionPoolManager` - HTTP/2连接池
- `Http3ConnectionPoolManager` - HTTP/3连接池（QUIC）
- `WebSocketConnectionPoolManager` - WebSocket连接池
- `GrpcConnectionPoolManager` - gRPC连接池

## 🤝 贡献

欢迎提交Issue和Pull Request！