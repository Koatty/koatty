# 统一抽象连接池管理系统设计

## 概述

本设计实现了一个统一的抽象连接池管理系统，为koatty_serve的各个协议（HTTP、HTTPS、HTTP/2、gRPC、WebSocket）提供一致的连接池管理接口，同时允许各协议实现自己的特定逻辑。

## 架构设计

### 核心抽象层

#### 1. ConnectionPoolManager<T> 抽象基类

```typescript
export abstract class ConnectionPoolManager<T = any> {
  // 抽象方法 - 各协议必须实现
  abstract addConnection(connection: T, metadata?: any): Promise<boolean>;
  abstract removeConnection(connection: T, reason?: string): Promise<void>;
  abstract getActiveConnectionCount(): number;
  abstract isConnectionHealthy(connection: T): boolean;
  abstract closeAllConnections(timeout?: number): Promise<void>;
  
  // 协议特定的保护方法
  protected abstract validateConnection(connection: T): boolean;
  protected abstract cleanupConnection(connection: T): Promise<void>;
  
  // 统一的公共方法
  canAcceptConnection(): boolean;
  updateHealthStatus(): void;
  getHealth(): ConnectionPoolHealth;
  getMetrics(): ConnectionPoolMetrics;
  updateConfig(newConfig: Partial<ConnectionPoolConfig>): Promise<boolean>;
}
```

#### 2. 统一配置接口

```typescript
export interface ConnectionPoolConfig {
  maxConnections?: number;
  connectionTimeout?: number;
  keepAliveTimeout?: number;
  requestTimeout?: number;
  headersTimeout?: number;
  
  // 协议特定配置
  protocolSpecific?: {
    // HTTP/2 特定
    maxSessionMemory?: number;
    maxHeaderListSize?: number;
    
    // gRPC 特定
    maxReceiveMessageLength?: number;
    maxSendMessageLength?: number;
    keepAliveTime?: number;
    
    // WebSocket 特定
    pingInterval?: number;
    pongTimeout?: number;
  };
}
```

#### 3. 连接池健康监控

```typescript
export interface ConnectionPoolHealth {
  status: ConnectionPoolStatus;
  utilizationRatio: number;
  activeConnections: number;
  maxConnections: number;
  rejectedConnections: number;
  averageResponseTime: number;
  errorRate: number;
  message: string;
}

export enum ConnectionPoolStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  OVERLOADED = 'overloaded',
  UNAVAILABLE = 'unavailable'
}
```

#### 4. 事件系统

```typescript
export enum ConnectionPoolEvent {
  CONNECTION_ADDED = 'connection_added',
  CONNECTION_REMOVED = 'connection_removed',
  CONNECTION_TIMEOUT = 'connection_timeout',
  CONNECTION_ERROR = 'connection_error',
  POOL_LIMIT_REACHED = 'pool_limit_reached',
  HEALTH_STATUS_CHANGED = 'health_status_changed'
}
```

### 协议特定实现

#### 1. HTTP连接池管理器

```typescript
export class HttpConnectionPoolManager extends ConnectionPoolManager<Socket> {
  private connections = new Map<Socket, HttpConnectionMetadata>();
  private connectionTimeouts = new WeakMap<Socket, NodeJS.Timeout>();

  // 实现HTTP特定的连接管理逻辑
  async addConnection(socket: Socket, metadata: any = {}): Promise<boolean> {
    // HTTP连接验证和添加逻辑
    // 连接超时设置
    // 事件监听器设置
  }
  
  // HTTP特定的连接健康检查
  isConnectionHealthy(socket: Socket): boolean {
    return socket.readyState === 'open' && !socket.destroyed;
  }
  
  // HTTP特定的连接清理
  protected async cleanupConnection(socket: Socket): Promise<void> {
    socket.removeAllListeners();
    if (!socket.destroyed) socket.destroy();
  }
}
```

#### 2. gRPC连接池管理器

```typescript
export class GrpcConnectionPoolManager extends ConnectionPoolManager<string> {
  private connections = new Map<string, GrpcConnectionData>();
  
  // 实现gRPC特定的连接管理逻辑
  async addConnection(connectionId: string, metadata: any = {}): Promise<boolean> {
    // gRPC连接验证和添加逻辑
    // Keep-alive机制设置
    // 消息大小限制验证
  }
  
  // gRPC特定的连接健康检查
  isConnectionHealthy(connectionId: string): boolean {
    // 检查gRPC连接状态和Keep-alive
  }
}
```

#### 3. WebSocket连接池管理器

```typescript
export class WebSocketConnectionPoolManager extends ConnectionPoolManager<WebSocket> {
  private connections = new Map<WebSocket, WebSocketConnectionData>();
  
  // 实现WebSocket特定的连接管理逻辑
  async addConnection(ws: WebSocket, metadata: any = {}): Promise<boolean> {
    // WebSocket连接验证和添加逻辑
    // Ping/Pong心跳机制
    // 连接标识符生成
  }
  
  // WebSocket特定的连接健康检查
  isConnectionHealthy(ws: WebSocket): boolean {
    return ws.readyState === WebSocket.OPEN;
  }
}
```

### 工厂模式管理

```typescript
export class ConnectionPoolFactory {
  private static instances = new Map<string, ConnectionPoolManager>();

  static getOrCreate<T extends ConnectionPoolManager>(
    protocol: string,
    config: ConnectionPoolConfig,
    factory: () => T
  ): T {
    // 单例模式管理连接池实例
  }
  
  static getAllMetrics(): Record<string, ConnectionPoolMetrics> {
    // 获取所有连接池的统计信息
  }
}
```

## 服务器集成

### BaseServer增强

```typescript
export abstract class BaseServer<T extends ListeningOptions = ListeningOptions> {
  protected connectionPool?: ConnectionPoolManager;
  
  protected initializeConnectionPool(): void {
    // 初始化协议特定的连接池管理器
    const config = this.extractConnectionPoolConfig();
    this.connectionPool = this.createConnectionPoolManager(config);
    
    // 设置连接池事件监听
    this.setupConnectionPoolEventListeners();
  }
  
  protected abstract createConnectionPoolManager(config: ConnectionPoolConfig): ConnectionPoolManager;
  protected abstract extractConnectionPoolConfig(): ConnectionPoolConfig;
}
```

### 协议服务器实现示例

```typescript
export class HttpServer extends BaseServer<HttpServerOptions> {
  protected createConnectionPoolManager(config: ConnectionPoolConfig): ConnectionPoolManager {
    return new HttpConnectionPoolManager(config);
  }
  
  protected extractConnectionPoolConfig(): ConnectionPoolConfig {
    return {
      maxConnections: this.options.connectionPool?.maxConnections,
      connectionTimeout: this.options.connectionPool?.connectionTimeout,
      keepAliveTimeout: this.options.connectionPool?.keepAliveTimeout,
      requestTimeout: this.options.connectionPool?.requestTimeout,
      headersTimeout: this.options.connectionPool?.headersTimeout
    };
  }
  
  // 在连接事件中使用连接池
  constructor(app: KoattyApplication, options: HttpServerOptions) {
    super(app, options);
    this.initializeConnectionPool();
    
    this.server.on('connection', (socket) => {
      // 使用统一的连接池管理
      this.connectionPool?.addConnection(socket, {
        remoteAddress: socket.remoteAddress,
        userAgent: 'http-client'
      });
    });
  }
}
```

## 优势特性

### 1. 统一接口
- 所有协议使用相同的连接池管理接口
- 一致的配置、监控和事件系统
- 标准化的健康检查和指标收集

### 2. 协议特化
- 每个协议可以实现自己的特定逻辑
- 支持协议特定的配置选项
- 保留各协议的优化特性

### 3. 实时监控
- 统一的健康状态监控
- 详细的连接池指标
- 事件驱动的状态变化通知

### 4. 配置管理
- 热重载配置支持
- 配置验证和规范化
- 协议特定配置隔离

### 5. 性能优化
- 连接复用和超时管理
- 自动清理过期连接
- 智能负载平衡

## 使用示例

### 基础配置

```typescript
const httpServer = new HttpServer(app, {
  hostname: 'localhost',
  port: 3000,
  protocol: 'http',
  connectionPool: {
    maxConnections: 1000,
    connectionTimeout: 30000,
    keepAliveTimeout: 5000,
    requestTimeout: 30000,
    headersTimeout: 10000
  }
});
```

### 高级监控

```typescript
// 获取连接池健康状态
const health = httpServer.connectionPool.getHealth();
console.log(`Connection pool status: ${health.status}`);
console.log(`Utilization: ${(health.utilizationRatio * 100).toFixed(1)}%`);

// 监听连接池事件
httpServer.connectionPool.on(ConnectionPoolEvent.POOL_LIMIT_REACHED, (data) => {
  console.warn('Connection pool limit reached!', data);
});

// 获取详细指标
const metrics = httpServer.connectionPool.getMetrics();
console.log('Performance metrics:', metrics.performance);
```

### 动态配置更新

```typescript
// 运行时更新连接池配置
await httpServer.connectionPool.updateConfig({
  maxConnections: 2000,
  connectionTimeout: 60000
});
```

## 实现状态

### 已完成
✅ **抽象连接池管理器基类**
- 统一接口定义
- 配置管理系统
- 健康监控系统
- 事件系统

✅ **HTTP连接池管理器**
- Socket连接管理
- 超时处理
- 连接健康检查
- 事件监听

✅ **工厂模式管理**
- 实例生命周期管理
- 统一指标收集

### 进行中
🔄 **服务器集成**
- BaseServer连接池集成
- HTTP服务器连接池集成

### 待实现
📋 **其他协议连接池管理器**
- HTTPS连接池管理器
- HTTP/2连接池管理器  
- gRPC连接池管理器优化
- WebSocket连接池管理器优化

📋 **高级特性**
- 连接预热
- 智能负载平衡
- 自适应连接池大小
- 性能基准测试

## 结论

统一抽象连接池管理系统为koatty_serve提供了：

1. **架构一致性**: 所有协议使用相同的连接池管理模式
2. **可扩展性**: 新协议可以轻松实现自己的连接池管理器
3. **可维护性**: 统一的接口和配置降低了维护复杂度
4. **可观测性**: 全面的监控和指标收集
5. **性能优化**: 协议特定的优化与统一管理相结合

这个设计使得koatty_serve能够在保持各协议特性的同时，提供企业级的连接池管理能力。 