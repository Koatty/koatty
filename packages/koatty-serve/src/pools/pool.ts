/*
 * @Description: 统一连接池管理接口
 * @Usage: 为各协议提供统一的连接池管理接口
 * @Author: richen
 * @Date: 2024-11-27 20:30:00
 * @LastEditTime: 2024-11-27 20:30:00
 */

import { createLogger, generateTraceId } from "../utils/logger";
import { ConnectionPoolConfig } from "../config/pool";
import { RingBuffer } from "../utils/ring_buffer";

/**
 * 连接统计信息接口
 */
export interface ConnectionStats {
  activeConnections: number;        // 当前活跃连接数
  totalConnections: number;         // 总连接数
  connectionsPerSecond: number;     // 每秒连接数
  averageLatency: number;           // 平均延迟(ms)
  errorRate: number;                // 错误率 (0-1)
}

/**
 * 连接池状态枚举
 */
export enum ConnectionPoolStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  OVERLOADED = 'overloaded',
  UNAVAILABLE = 'unavailable'
}

/**
 * 连接池健康状态
 */
export interface ConnectionPoolHealth {
  status: ConnectionPoolStatus;
  utilizationRatio: number;         // 利用率 (0-1)
  activeConnections: number;        // 活跃连接数
  maxConnections: number;           // 最大连接数
  rejectedConnections: number;      // 被拒绝的连接数
  averageResponseTime: number;      // 平均响应时间
  errorRate: number;                // 错误率
  message: string;                  // 状态描述
  lastUpdated: number;              // 最后更新时间
}

/**
 * 连接池指标
 */
export interface ConnectionPoolMetrics extends ConnectionStats {
  protocol: string;
  poolConfig: ConnectionPoolConfig;
  health: ConnectionPoolHealth;
  performance: {
    throughput: number;             // Throughput (requests/second)
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
    memoryUsage: number;            // Memory usage (bytes)
    cpuUsage: number;               // CPU usage (percent)
  };
  uptime: number;                   // Uptime (milliseconds)
}

/**
 * Connection pool event types
 */
export enum ConnectionPoolEvent {
  CONNECTION_ADDED = 'connection_added',
  CONNECTION_REMOVED = 'connection_removed',
  CONNECTION_TIMEOUT = 'connection_timeout',
  CONNECTION_ERROR = 'connection_error',
  POOL_LIMIT_REACHED = 'pool_limit_reached',
  HEALTH_STATUS_CHANGED = 'health_status_changed'
}

/**
 * 连接申请选项
 */
export interface ConnectionRequestOptions {
  timeout?: number;                 // 申请超时时间
  priority?: 'low' | 'normal' | 'high'; // 优先级
  metadata?: Record<string, any>;   // 元数据
}

/**
 * 连接申请结果
 */
export interface ConnectionRequestResult<T> {
  connection: T | null;
  success: boolean;
  error?: Error;
  waitTime: number;                 // 等待时间
  connectionId?: string;            // 连接ID
}

/**
 * Abstract connection pool manager
 */
export abstract class ConnectionPoolManager<T = any> {
  protected readonly logger = createLogger({ module: 'connection_pool' });
  protected readonly config: ConnectionPoolConfig;
  protected readonly protocol: string;
  protected readonly startTime = Date.now();
  protected eventListeners = new Map<ConnectionPoolEvent, Set<Function>>();
  private eventListenerErrors = new Map<ConnectionPoolEvent, number>();
  
  // 连接池核心数据
  protected connections = new Map<string, T>();           // 活跃连接
  protected connectionMetadata = new Map<string, any>();  // 连接元数据
  protected waitingQueue: Array<{
    resolve: (result: ConnectionRequestResult<T>) => void;
    reject: (error: Error) => void;
    options: ConnectionRequestOptions;
    timestamp: number;
  }> = [];

  // 统计和健康状态
  protected metrics: ConnectionPoolMetrics;
  protected currentHealth: ConnectionPoolHealth;
  
  // 性能监控 - 使用环形缓冲区提高性能
  private latencyBuffer: RingBuffer<number>;
  private lastMetricsUpdate = Date.now();

  constructor(protocol: string, config: ConnectionPoolConfig = {}) {
    this.protocol = protocol;
    this.config = this.validateAndNormalizeConfig(config);
    
    this.logger = createLogger({ 
      module: 'connection_pool', 
      protocol: this.protocol 
    });

    // 初始化延迟环形缓冲区 (默认存储1000个样本)
    this.latencyBuffer = new RingBuffer<number>(1000);

    // 初始化指标
    this.metrics = this.initializeMetrics();
    this.currentHealth = this.initializeHealth();

    this.logger.info('Connection pool manager initialized', {}, {
      protocol: this.protocol,
      config: this.config
    });

    // 启动定期清理和监控
    this.startPeriodicTasks();
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): ConnectionPoolMetrics {
    return {
      protocol: this.protocol,
      activeConnections: 0,
      totalConnections: 0,
      connectionsPerSecond: 0,
      averageLatency: 0,
      errorRate: 0,
      poolConfig: this.config,
      health: this.currentHealth,
      performance: {
        throughput: 0,
        latency: {
          p50: 0,
          p95: 0,
          p99: 0
        },
        memoryUsage: 0,
        cpuUsage: 0
      },
      uptime: 0
    };
  }

  /**
   * 初始化健康状态
   */
  private initializeHealth(): ConnectionPoolHealth {
    return {
      status: ConnectionPoolStatus.HEALTHY,
      utilizationRatio: 0,
      activeConnections: 0,
      maxConnections: this.config.maxConnections || 1000,
      rejectedConnections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      message: 'Connection pool is healthy',
      lastUpdated: Date.now()
    };
  }

  /**
   * Validate and normalize configuration
   */
  protected validateAndNormalizeConfig(config: ConnectionPoolConfig): ConnectionPoolConfig {
    const normalized: ConnectionPoolConfig = {
      maxConnections: config.maxConnections || 1000,
      connectionTimeout: config.connectionTimeout || 30000,
      keepAliveTimeout: config.keepAliveTimeout || 5000,
      requestTimeout: config.requestTimeout || 30000,
      headersTimeout: config.headersTimeout || 10000,
      ...config
    };

    // Validate configuration
    if (normalized.maxConnections && normalized.maxConnections <= 0) {
      throw new Error('maxConnections must be positive');
    }
    if (normalized.connectionTimeout && normalized.connectionTimeout <= 0) {
      throw new Error('connectionTimeout must be positive');
    }

    return normalized;
  }

  /**
   * 申请连接
   */
  async requestConnection(options: ConnectionRequestOptions = {}): Promise<ConnectionRequestResult<T>> {
    const startTime = Date.now();
    const timeout = options.timeout || this.config.connectionTimeout || 30000;
    
    try {
      // 检查连接池是否可用
      if (!this.canAcceptConnection()) {
        this.currentHealth.rejectedConnections++;
        this.emitEvent(ConnectionPoolEvent.POOL_LIMIT_REACHED, {
          currentConnections: this.getActiveConnectionCount(),
          maxConnections: this.config.maxConnections
        });
        
        return {
          connection: null,
          success: false,
          error: new Error('Connection pool limit reached'),
          waitTime: Date.now() - startTime
        };
      }

      // 尝试获取现有可用连接
      const availableConnection = await this.getAvailableConnection();
      if (availableConnection) {
        return {
          connection: availableConnection.connection,
          success: true,
          waitTime: Date.now() - startTime,
          connectionId: availableConnection.id
        };
      }

      // 创建新连接
      const newConnection = await this.createNewConnection(options);
      if (newConnection) {
        await this.addConnection(newConnection.connection, newConnection.metadata);
        return {
          connection: newConnection.connection,
          success: true,
          waitTime: Date.now() - startTime,
          connectionId: newConnection.id
        };
      }

      // 如果无法立即获取连接，加入等待队列
      return new Promise((resolve, reject) => {
        const timeoutHandle = setTimeout(() => {
          // 从等待队列中移除
          const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
          if (index >= 0) {
            this.waitingQueue.splice(index, 1);
          }
          resolve({
            connection: null,
            success: false,
            error: new Error('Connection request timeout'),
            waitTime: Date.now() - startTime
          });
        }, timeout);

        this.waitingQueue.push({
          resolve: (result) => {
            clearTimeout(timeoutHandle);
            resolve(result);
          },
          reject: (error) => {
            clearTimeout(timeoutHandle);
            reject(error);
          },
          options,
          timestamp: startTime
        });

        // 按优先级排序等待队列
        this.waitingQueue.sort((a, b) => {
          const priorityWeight = { low: 1, normal: 2, high: 3 };
          const aPriority = priorityWeight[a.options.priority || 'normal'];
          const bPriority = priorityWeight[b.options.priority || 'normal'];
          return bPriority - aPriority;
        });
      });

    } catch (error) {
      this.recordConnectionEvent('error', { error });
      return {
        connection: null,
        success: false,
        error: error as Error,
        waitTime: Date.now() - startTime
      };
    }
  }

  /**
   * 释放连接
   */
  async releaseConnection(connection: T, options: { destroy?: boolean; error?: Error } = {}): Promise<boolean> {
    const traceId = generateTraceId();
    
    try {
      // 查找连接ID
      const connectionId = this.findConnectionId(connection);
      if (!connectionId) {
        this.logger.warn('Attempting to release unknown connection', { traceId });
        return false;
      }

      if (options.destroy || options.error) {
        // 销毁连接
        await this.removeConnection(connection, options.error?.message || 'Explicitly destroyed');
        this.logger.debug('Connection destroyed', { traceId }, { connectionId });
      } else {
        // 标记连接为可用状态，可以被其他请求复用
        this.markConnectionAvailable(connectionId);
        this.logger.debug('Connection released and marked available', { traceId }, { connectionId });
      }

      // 处理等待队列
      await this.processWaitingQueue();
      
      return true;
    } catch (error) {
      this.logger.error('Failed to release connection', { traceId }, error);
      return false;
    }
  }

  /**
   * Add connection to the pool
   */
  async addConnection(connection: T, metadata: any = {}): Promise<boolean> {
    const connectionId = this.generateConnectionId();
    
    try {
      if (!this.validateConnection(connection)) {
        throw new Error('Invalid connection');
      }

      this.connections.set(connectionId, connection);
      this.connectionMetadata.set(connectionId, {
        ...metadata,
        id: connectionId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        available: true
      });

      this.recordConnectionEvent('added', { connectionId, metadata });
      this.emitEvent(ConnectionPoolEvent.CONNECTION_ADDED, { connectionId, connection });
      
      this.logger.debug('Connection added to pool', {}, { connectionId });
      return true;
    } catch (error) {
      this.logger.error('Failed to add connection to pool', {}, error);
      return false;
    }
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(connection: T, reason?: string): Promise<void> {
    const connectionId = this.findConnectionId(connection);
    if (!connectionId) return;

    try {
      await this.cleanupConnection(connection);
      this.connections.delete(connectionId);
      this.connectionMetadata.delete(connectionId);

      this.recordConnectionEvent('removed', { connectionId, reason });
      this.emitEvent(ConnectionPoolEvent.CONNECTION_REMOVED, { connectionId, reason });
      
      this.logger.debug('Connection removed from pool', {}, { connectionId, reason });
    } catch (error) {
      this.logger.error('Error removing connection from pool', {}, error);
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if the connection is healthy
   */
  abstract isConnectionHealthy(connection: T): boolean;

  /**
   * Close all connections
   */
  async closeAllConnections(timeout: number = 5000): Promise<void> {
    const traceId = generateTraceId();
    this.logger.info('Closing all connections', { traceId }, { 
      activeConnections: this.connections.size 
    });

    const closePromises: Promise<void>[] = [];
    
    for (const [connectionId, connection] of this.connections) {
      closePromises.push(
        this.removeConnection(connection, 'Pool shutdown').catch(error => {
          this.logger.error('Error closing connection', { traceId }, { connectionId, error });
        })
      );
    }

    try {
      await Promise.race([
        Promise.all(closePromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Close timeout')), timeout)
        )
      ]);
    } catch (error) {
      this.logger.warn('Some connections failed to close gracefully', { traceId }, error);
    }

    this.connections.clear();
    this.connectionMetadata.clear();
    this.logger.info('All connections closed', { traceId });
  }

  /**
   * Protocol-specific connection validation
   */
  protected abstract validateConnection(connection: T): boolean;

  /**
   * Protocol-specific connection cleanup
   */
  protected abstract cleanupConnection(connection: T): Promise<void>;

  /**
   * 获取可用连接
   */
  protected abstract getAvailableConnection(): Promise<{ connection: T; id: string } | null>;

  /**
   * 创建新连接
   */
  protected async createNewConnection(options: ConnectionRequestOptions): Promise<{ connection: T; id: string; metadata?: any } | null> {
    const result = await this.createProtocolConnection(options);
    if (result) {
      return {
        connection: result.connection,
        id: this.generateConnectionId(),
        metadata: result.metadata
      };
    }
    return null;
  }

  /**
   * Check if new connections can be accepted
   */
  canAcceptConnection(): boolean {
    const maxConnections = this.config.maxConnections;
    if (!maxConnections) return true;
    
    const currentConnections = this.getActiveConnectionCount();
    return currentConnections < maxConnections;
  }

  /**
   * Update connection pool health status
   */
  updateHealthStatus(): void {
    const activeConnections = this.getActiveConnectionCount();
    const maxConnections = this.config.maxConnections || Infinity;
    const utilizationRatio = maxConnections === Infinity ? 0 : activeConnections / maxConnections;
    
    let status = ConnectionPoolStatus.HEALTHY;
    let message = 'Connection pool is healthy';

    if (utilizationRatio > 0.95) {
      status = ConnectionPoolStatus.OVERLOADED;
      message = 'Connection pool is overloaded';
    } else if (utilizationRatio > 0.8) {
      status = ConnectionPoolStatus.DEGRADED;
      message = 'Connection pool is under high load';
    }

    const oldStatus = this.currentHealth.status;
    this.currentHealth = {
      ...this.currentHealth,
      status,
      utilizationRatio,
      activeConnections,
      maxConnections: maxConnections === Infinity ? 0 : maxConnections,
      message,
      lastUpdated: Date.now()
    };

    // 更新指标
    this.metrics.health = this.currentHealth;

    // 如果状态改变，触发事件
    if (oldStatus !== status) {
      this.emitEvent(ConnectionPoolEvent.HEALTH_STATUS_CHANGED, {
        oldStatus,
        newStatus: status,
        health: this.currentHealth
      });
    }
  }

  /**
   * Get connection pool health status
   */
  getHealth(): ConnectionPoolHealth {
    this.updateHealthStatus();
    return { ...this.currentHealth };
  }

  /**
   * Get connection pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    const uptime = Date.now() - this.startTime;
    
    // Update performance metrics
    this.updatePerformanceMetrics();
    
    return {
      ...this.metrics,
      uptime,
      health: this.getHealth(),
      activeConnections: this.getActiveConnectionCount()
    };
  }

  /**
   * Get connection pool configuration
   */
  getConfig(): Readonly<ConnectionPoolConfig> {
    return { ...this.config };
  }

  /**
   * Update connection pool configuration
   */
  async updateConfig(newConfig: Partial<ConnectionPoolConfig>): Promise<boolean> {
    const traceId = generateTraceId();
    
    try {
      this.logger.info('Updating connection pool configuration', { traceId }, {
        oldConfig: this.config,
        newConfig
      });

      const updatedConfig = this.validateAndNormalizeConfig({
        ...this.config,
        ...newConfig
      });

      // Apply new configuration
      Object.assign(this.config, updatedConfig);
      
      // Update configuration in metrics
      this.metrics.poolConfig = this.config;

      this.logger.info('Connection pool configuration updated successfully', { traceId });
      return true;
    } catch (error) {
      this.logger.error('Failed to update connection pool configuration', { traceId }, error);
      return false;
    }
  }

  /**
   * Add event listener
   */
  on(event: ConnectionPoolEvent, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: ConnectionPoolEvent, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 辅助方法
   */
  protected generateConnectionId(): string {
    return `${this.protocol}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  protected findConnectionId(connection: T): string | null {
    for (const [id, conn] of this.connections) {
      if (conn === connection) return id;
    }
    return null;
  }

  private markConnectionAvailable(connectionId: string): void {
    const metadata = this.connectionMetadata.get(connectionId);
    if (metadata) {
      metadata.available = true;
      metadata.lastUsed = Date.now();
    }
  }

  private async processWaitingQueue(): Promise<void> {
    while (this.waitingQueue.length > 0 && this.canAcceptConnection()) {
      const waitingRequest = this.waitingQueue.shift();
      if (!waitingRequest) break;

      try {
        const result = await this.requestConnection(waitingRequest.options);
        waitingRequest.resolve(result);
      } catch (error) {
        waitingRequest.reject(error as Error);
      }
    }
  }

  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsUpdate) / 1000;
    
    if (timeDiff > 0) {
      this.metrics.connectionsPerSecond = this.metrics.totalConnections / ((now - this.startTime) / 1000);
      this.metrics.performance.throughput = this.metrics.totalConnections / timeDiff;
    }

    // 计算延迟百分位数 - 使用环形缓冲区的高效方法
    if (this.latencyBuffer.length > 0) {
      // 使用环形缓冲区的内置方法计算百分位数
      this.metrics.performance.latency.p50 = this.latencyBuffer.getPercentile(0.5) || 0;
      this.metrics.performance.latency.p95 = this.latencyBuffer.getPercentile(0.95) || 0;
      this.metrics.performance.latency.p99 = this.latencyBuffer.getPercentile(0.99) || 0;
      
      this.metrics.averageLatency = this.latencyBuffer.getAverage() || 0;
      
      // 环形缓冲区自动管理大小，无需手动清理
    }

    this.lastMetricsUpdate = now;
  }

  private startPeriodicTasks(): void {
    // 定期更新健康状态
    setInterval(() => {
      this.updateHealthStatus();
    }, 5000);

    // 定期清理过期连接
    setInterval(() => {
      this.cleanupExpiredConnections();
    }, 30000);
  }

  private cleanupExpiredConnections(): void {
    const now = Date.now();
    const timeout = this.config.connectionTimeout || 30000;
    const connectionsToRemove: Array<{ id: string; connection: T }> = [];

    for (const [id, metadata] of this.connectionMetadata) {
      if (metadata.available && (now - metadata.lastUsed) > timeout) {
        const connection = this.connections.get(id);
        if (connection) {
          connectionsToRemove.push({ id, connection });
        }
      }
    }

    // 异步清理过期连接
    connectionsToRemove.forEach(({ connection }) => {
      this.removeConnection(connection, 'Connection expired').catch(error => {
        this.logger.error('Error cleaning up expired connection', {}, error);
      });
    });

    if (connectionsToRemove.length > 0) {
      this.logger.debug('Cleaned up expired connections', {}, { 
        count: connectionsToRemove.length 
      });
    }
  }

  /**
   * Trigger event with enhanced error handling
   */
  protected emitEvent(event: ConnectionPoolEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const listenersToRemove: Function[] = [];

    listeners.forEach(listener => {
      try {
        listener(data);
        // Reset error count on success
        if (this.eventListenerErrors.has(event)) {
          this.eventListenerErrors.set(event, 0);
        }
      } catch (error) {
        // Record error count
        const errorCount = (this.eventListenerErrors.get(event) || 0) + 1;
        this.eventListenerErrors.set(event, errorCount);
        
        this.logger.error('Error in connection pool event listener', {}, {
          event: event,
          errorCount,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          protocol: this.protocol
        });
        
        // If listener fails repeatedly, mark for removal
        if (errorCount > 10) {
          this.logger.warn('Removing faulty event listener due to repeated failures', {}, {
            event: event,
            totalErrors: errorCount,
            protocol: this.protocol
          });
          listenersToRemove.push(listener);
          this.eventListenerErrors.delete(event);
        }
      }
    });

    // Remove faulty listeners
    listenersToRemove.forEach(listener => listeners.delete(listener));
  }

  /**
   * Record connection event for statistics
   */
  protected recordConnectionEvent(event: 'added' | 'removed' | 'error', _metadata?: any): void {
    const timestamp = Date.now();
    
    switch (event) {
      case 'added':
        this.metrics.totalConnections++;
        this.metrics.activeConnections = this.getActiveConnectionCount();
        break;
      case 'removed':
        this.metrics.activeConnections = this.getActiveConnectionCount();
        break;
      case 'error':
        this.metrics.errorRate = Math.min(this.metrics.errorRate + 0.01, 1);
        break;
    }

    // Calculate connections per second
    const timeDiff = (timestamp - this.startTime) / 1000;
    if (timeDiff > 0) {
      this.metrics.connectionsPerSecond = this.metrics.totalConnections / timeDiff;
    }
  }

  /**
   * Record request latency
   */
  protected recordLatency(latency: number): void {
    this.latencyBuffer.push(latency);
  }

  /**
   * Destroy connection pool manager
   */
  async destroy(): Promise<void> {
    const traceId = generateTraceId();
    
    this.logger.info('Destroying connection pool manager', { traceId });
    
    try {
      // 清理等待队列
      this.waitingQueue.forEach(item => {
        item.resolve({
          connection: null,
          success: false,
          error: new Error('Connection pool is being destroyed'),
          waitTime: Date.now() - item.timestamp
        });
      });
      this.waitingQueue = [];

      await this.closeAllConnections(5000);
      this.eventListeners.clear();
      
      this.logger.info('Connection pool manager destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying connection pool manager', { traceId }, error);
      throw error;
    }
  }

  /**
   * 统一的连接获取接口 - 对外提供统一API
   */
  async getConnection(options: ConnectionRequestOptions = {}): Promise<ConnectionRequestResult<T>> {
    return this.requestConnection(options);
  }

  /**
   * 统一的连接添加接口 - 协议无关的连接注册
   * 各协议通过此方法注册新连接到池中
   */
  async registerConnection(connection: T, metadata: any = {}): Promise<boolean> {
    if (!this.canAcceptConnection()) {
      return false;
    }

    const success = await this.addConnection(connection, metadata);
    if (success) {
      // 设置协议特定的连接处理
      await this.setupProtocolSpecificHandlers(connection);
    }
    
    return success;
  }

  /**
   * 协议特定的连接处理器设置 - 子类实现
   */
  protected abstract setupProtocolSpecificHandlers(connection: T): Promise<void>;

  /**
   * 协议特定的连接创建逻辑 - 子类实现
   */
  protected abstract createProtocolConnection(options: ConnectionRequestOptions): Promise<{ connection: T; metadata?: any } | null>;
} 