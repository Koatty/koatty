/* 
 * @Description: Base server class with template method pattern for protocol servers
 * @Usage: 模板方法模式的基类，定义服务器生命周期的公共逻辑
 * @Author: richen
 * @Date: 2025-04-08 10:45:00
 * @LastEditTime: 2024-11-27 23:00:00
 * @License: BSD (3-Clause)
 */

import { KoattyApplication, KoattyServer, NativeServer } from "koatty_core";
import { createLogger, generateTraceId } from "../utils/logger";
import { deepEqual, generateServerId } from "../utils/helper";
import { TimerManager } from "../utils/timer-manager";
import {
  ConnectionStats,
  ConnectionPoolStatus as HealthStatus,
  ConnectionPoolManager,
  ConnectionPoolEvent
} from "../pools/pool";
import { ListeningOptions } from "../config/config";
// 优雅关闭相关类型定义
export interface GracefulShutdownOptions {
  timeout?: number;        // 总超时时间
  drainDelay?: number;     // 排空延迟
  stepTimeout?: number;    // 单步超时
}

export interface ShutdownResult {
  status: 'completed' | 'failed' | 'forced';
  totalTime: number;
  completedSteps: string[];
  failedSteps: Array<{
    step: string;
    error: string;
    timestamp: number;
  }>;
}

/**
 * Configuration change detection result
 */
export interface ConfigChangeAnalysis {
  requiresRestart: boolean;
  changedKeys: string[];
  restartReason?: string;
  canApplyRuntime?: boolean;
}

/**
 * Base server class with template method pattern
 * 模板方法模式：定义算法骨架，子类实现具体步骤
 */
export abstract class BaseServer<T extends ListeningOptions = ListeningOptions>
  implements KoattyServer {
  options: T;
  readonly server: any;
  readonly protocol: string;
  status: number;
  listenCallback?: () => void;
  
  // Server start time for uptime calculation
  protected startTime: number = 0;

  // 公共状态管理
  protected configVersion = 0;
  protected logger = createLogger({ module: 'base' });
  protected serverId: string;
  protected shutdownTimeout = 30000;
  protected drainDelay = 5000;
  protected connectionPool?: ConnectionPoolManager<any>;
  protected timerManager: TimerManager;
  private isShuttingDown = false;

  constructor(protected app: KoattyApplication, options: T) {
    // 深拷贝 options，确保 ext 对象也被正确复制
    this.options = { 
      ...options,
      ext: options.ext ? { ...options.ext } : undefined
    };
    this.protocol = options.protocol;
    this.status = 0;
    this.serverId = generateServerId(options.protocol);

    // 初始化定时器管理器
    this.timerManager = new TimerManager();

    // 设置日志上下文
    // 对于 GraphQL，使用底层协议作为 module，保持 protocol 为 graphql
    const actualModule = options.ext?._underlyingProtocol || options.protocol;
    this.logger = createLogger({
      module: actualModule,
      protocol: options.protocol,
      serverId: this.serverId
    });

    this.logger.debug(`${options.protocol} server constructed`, {}, {
      protocol: options.protocol,
      hostname: options.hostname,
      port: options.port,
      serverId: this.serverId
    });

    // 模板方法：初始化服务器（定义好执行顺序）
    this.initializeServer();
  }

  /**
   * 模板方法：服务器初始化流程
   * 定义了所有协议服务器的通用初始化步骤
   */
  protected initializeServer(): void {
    this.logger.info('Initializing server', {}, {
      protocol: this.protocol,
      serverId: this.serverId
    });

    try {
      // Step 1: 初始化连接池（各协议自定义）
      this.initializeConnectionPool();

      // Step 2: 创建协议特定的服务器实例（各协议自定义）
      this.createProtocolServer();

      // Step 3: 配置服务器选项（各协议自定义）
      this.configureServerOptions();

      // Step 4: 设置连接池事件监听（公共逻辑）
      this.setupConnectionPoolEventListeners();

      // Step 5: 设置定期清理任务（公共逻辑）
      this.setupPeriodicCleanup();

      // Step 6: 协议特定的额外初始化（各协议自定义）
      this.performProtocolSpecificInitialization();

      this.logger.debug('Server initialized successfully');

    } catch (error) {
      this.logger.error('Server initialization failed', {}, error);
      throw error;
    }
  }

  /**
   * 模板方法：配置热更新流程
   */
  async updateConfig(newConfig: Partial<T>): Promise<boolean> {
    const traceId = generateTraceId();
    const oldConfig = { ...this.options };
    const mergedConfig = { ...this.options, ...newConfig };

    // Step 1: 检测变更的配置项（公共逻辑）
    const changedKeys = this.detectConfigurationChanges(oldConfig, newConfig);

    if (changedKeys.length === 0) {
      this.logger.debug('No configuration changes detected', { traceId });
      return false;
    }

    this.logger.info('Configuration update initiated', { traceId }, {
      changedKeys: changedKeys.map(String),
      oldConfig: this.extractRelevantConfig(oldConfig),
      newConfig: this.extractRelevantConfig(mergedConfig)
    });

    // Step 2: 分析配置变更影响（各协议自定义）
    const analysis = this.analyzeConfigChanges(changedKeys, oldConfig, mergedConfig);

    this.logger.info('Configuration change analysis completed', { traceId }, analysis);

    try {
      if (analysis.requiresRestart) {
        // Step 3a: 需要重启的关键配置变更
        return await this.handleRestartRequiredChanges(mergedConfig, traceId);
      } else if (analysis.canApplyRuntime) {
        // Step 3b: 可以运行时应用的配置变更
        return await this.handleRuntimeChanges(analysis, newConfig, mergedConfig, traceId);
      }

      return true;

    } catch (error) {
      this.logger.error('Configuration update failed', { traceId }, error);
      return false;
    }
  }

  /**
   * 模板方法：优雅关闭流程
   * 简化实现，直接执行关闭步骤
   */
  async gracefulShutdown(options: GracefulShutdownOptions = {}): Promise<ShutdownResult> {
    if (this.isShuttingDown) {
      this.logger.warn('Graceful shutdown already in progress');
      throw new Error('Graceful shutdown already in progress');
    }

    this.isShuttingDown = true;
    const traceId = generateTraceId();
    const startTime = Date.now();
    const completedSteps: string[] = [];
    const failedSteps: Array<{ step: string; error: string; timestamp: number }> = [];

    this.logger.info('Starting graceful shutdown', { traceId });

    try {
      // 步骤 1: 停止接受新连接
      try {
        await this.executeWithTimeout(
          () => this.stopAcceptingNewConnections(traceId),
          options.stepTimeout || 5000,
          'stop_accepting_connections'
        );
        completedSteps.push('stop_accepting_connections');
        this.logger.debug('Stopped accepting new connections', { traceId });
      } catch (error) {
        failedSteps.push({
          step: 'stop_accepting_connections',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
        this.logger.error('Failed to stop accepting connections', { traceId }, error);
      }

      // 步骤 2: 等待现有连接完成
      try {
        const waitTimeout = options.stepTimeout || 15000;
        await this.executeWithTimeout(
          () => this.waitForConnectionCompletion(waitTimeout, traceId),
          waitTimeout + 1000,
          'wait_connections_completion'
        );
        completedSteps.push('wait_connections_completion');
        this.logger.debug('Waited for connections completion', { traceId });
      } catch (error) {
        failedSteps.push({
          step: 'wait_connections_completion',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
        this.logger.error('Failed to wait for connections', { traceId }, error);
      }

      // 步骤 3: 强制关闭剩余连接
      try {
        await this.executeWithTimeout(
          () => this.forceCloseRemainingConnections(traceId),
          options.stepTimeout || 5000,
          'force_close_connections'
        );
        completedSteps.push('force_close_connections');
        this.logger.debug('Force closed remaining connections', { traceId });
      } catch (error) {
        failedSteps.push({
          step: 'force_close_connections',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
        this.logger.error('Failed to force close connections', { traceId }, error);
      }

      // 步骤 4: 停止监控和清理
      try {
        await this.executeWithTimeout(
          async () => { this.stopMonitoringAndCleanup(traceId); },
          3000,
          'stop_monitoring_cleanup'
        );
        completedSteps.push('stop_monitoring_cleanup');
        this.logger.debug('Stopped monitoring and cleanup', { traceId });
      } catch (error) {
        failedSteps.push({
          step: 'stop_monitoring_cleanup',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        });
        this.logger.error('Failed to stop monitoring', { traceId }, error);
      }

      const totalTime = Date.now() - startTime;
      const status = failedSteps.length > 0 ? 'failed' : 'completed';

      this.logger.info('Graceful shutdown completed', { traceId }, {
        status,
        totalTime,
        completedSteps: completedSteps.length,
        failedSteps: failedSteps.length
      });

      return {
        status: status as 'completed' | 'failed',
        totalTime,
        completedSteps,
        failedSteps
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.logger.error('Graceful shutdown error', { traceId }, error);
      
      return {
        status: 'failed',
        totalTime,
        completedSteps,
        failedSteps: [...failedSteps, {
          step: 'global',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now()
        }]
      };
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * 执行带超时的异步操作
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    stepName: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step '${stepName}' timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 检测配置变更
   */
  protected detectConfigurationChanges(oldConfig: T, newConfig: Partial<T>): (keyof T)[] {
    return Object.keys(newConfig).filter(key =>
      !deepEqual(oldConfig[key as keyof T], newConfig[key as keyof T])
    ) as (keyof T)[];
  }

  /**
   * 设置连接池事件监听（公共逻辑）
   */
  protected setupConnectionPoolEventListeners(): void {
    if (!this.connectionPool) return;

    this.connectionPool.on(ConnectionPoolEvent.POOL_LIMIT_REACHED, (data: any) => {
      this.logger.warn(`${this.protocol.toUpperCase()} connection pool limit reached`, {}, data);
    });

    this.connectionPool.on(ConnectionPoolEvent.HEALTH_STATUS_CHANGED, (data: any) => {
      this.logger.info(`${this.protocol.toUpperCase()} connection pool health status changed`, {}, data);
    });

    this.connectionPool.on(ConnectionPoolEvent.CONNECTION_ERROR, (data: any) => {
      this.logger.warn(`${this.protocol.toUpperCase()} connection pool error`, {}, {
        error: data.error?.message,
        connectionId: data.connectionId
      });
    });

    this.connectionPool.on(ConnectionPoolEvent.CONNECTION_TIMEOUT, (data: any) => {
      this.logger.warn(`${this.protocol.toUpperCase()} connection timeout`, {}, data);
    });

    this.connectionPool.on(ConnectionPoolEvent.CONNECTION_REMOVED, (data: any) => {
      this.logger.debug(`${this.protocol.toUpperCase()} connection removed from pool`, {}, {
        connectionId: data.connectionId,
        reason: data.reason
      });
    });
  }

  /**
   * 设置定期清理（公共逻辑）
   */
  protected setupPeriodicCleanup(): void {
    if (!this.connectionPool) return;

    this.timerManager.addTimer('base_cleanup', () => {
      const metrics = this.connectionPool!.getMetrics();
      if (metrics.activeConnections === 0 && metrics.totalConnections > 0) {
        this.logger.debug(`No active ${this.protocol.toUpperCase()} connections in pool`);
      }
    }, 30000); // 每30秒检查一次
  }

  /**
   * 处理需要重启的配置变更
   */
  protected async handleRestartRequiredChanges(mergedConfig: T, traceId: string): Promise<boolean> {
    this.logger.info('Performing graceful restart due to critical configuration changes', { traceId });

    // 执行优雅关闭
    const shutdownResult = await this.gracefulShutdown({
      timeout: this.shutdownTimeout,
      drainDelay: this.drainDelay
    });

    // 检查关闭是否成功
    if (shutdownResult.status === 'failed' || shutdownResult.status === 'forced') {
      this.logger.warn('Graceful shutdown was not clean during restart', { traceId }, {
        status: shutdownResult.status,
        failedSteps: shutdownResult.failedSteps.map(f => f.step)
      });
    }

    // 应用新配置
    this.options = mergedConfig;
    this.configVersion++;

    // 重新启动服务器
    this.Start();

    this.logger.info('Graceful restart completed successfully', { traceId }, {
      configVersion: this.configVersion
    });

    return true;
  }

  /**
   * 处理运行时配置变更
   */
  protected async handleRuntimeChanges(
    analysis: ConfigChangeAnalysis,
    newConfig: Partial<T>,
    mergedConfig: T,
    traceId: string
  ): Promise<boolean> {
    this.options = mergedConfig;
    this.configVersion++;

    this.onRuntimeConfigChange(analysis, newConfig, traceId);

    this.logger.info('Runtime configuration changes applied successfully', { traceId }, {
      configVersion: this.configVersion
    });

    return true;
  }

  /**
   * 停止监控和清理（公共逻辑）
   */
  protected stopMonitoringAndCleanup(traceId: string): void {
    this.logger.info('Step 5: Stopping monitoring and cleanup', { traceId });

    // 清理定期任务
    this.timerManager.destroy();

    // 记录最终连接统计
    if (this.connectionPool) {
      const finalStats = this.connectionPool.getMetrics();
      this.logger.info('Final connection statistics', { traceId }, finalStats);
    }

    this.logger.debug('Monitoring stopped and cleanup completed', { traceId });
  }

  /**
   * 获取活跃连接数（公共逻辑）
   */
  protected getActiveConnectionCount(): number {
    return this.connectionPool ? this.connectionPool.getActiveConnectionCount() : 0;
  }

  /**
   * 获取连接统计信息（公共接口）
   */
  getConnectionStats(): ConnectionStats {
    if (!this.connectionPool) {
      return {
        activeConnections: 0,
        totalConnections: 0,
        connectionsPerSecond: 0,
        averageLatency: 0,
        errorRate: 0
      };
    }

    const poolMetrics = this.connectionPool.getMetrics();
    return {
      activeConnections: poolMetrics.activeConnections,
      totalConnections: poolMetrics.totalConnections,
      connectionsPerSecond: poolMetrics.connectionsPerSecond,
      averageLatency: poolMetrics.averageLatency,
      errorRate: poolMetrics.errorRate
    };
  }

  /**
   * 获取连接池健康状态（公共接口）
   */
  getConnectionPoolHealth() {
    return this.connectionPool ? this.connectionPool.getHealth() : null;
  }

  /**
   * 获取连接池指标（公共接口）
   */
  getConnectionPoolMetrics() {
    return this.connectionPool ? this.connectionPool.getMetrics() : null;
  }

  // ============= 需要子类实现的抽象方法（模板方法的钩子） =============

  /**
   * 初始化连接池（各协议自定义）
   */
  protected abstract initializeConnectionPool(): void;

  /**
   * 创建协议特定的服务器实例（各协议自定义）
   */
  protected abstract createProtocolServer(): void;

  /**
   * 配置服务器选项（各协议自定义）
   */
  protected abstract configureServerOptions(): void;

  /**
   * 协议特定的额外初始化（各协议自定义，可选实现）
   */
  protected performProtocolSpecificInitialization(): void {
    // 默认空实现，子类可以选择性重写
  }

  /**
   * 分析配置变更影响（各协议自定义）
   */
  protected abstract analyzeConfigChanges(
    changedKeys: (keyof T)[],
    oldConfig: T,
    newConfig: T
  ): ConfigChangeAnalysis;

  /**
   * 运行时配置变更处理（各协议自定义）
   */
  protected abstract onRuntimeConfigChange(
    analysis: ConfigChangeAnalysis,
    newConfig: Partial<T>,
    traceId: string
  ): void;

  /**
   * 提取相关配置用于日志（各协议自定义）
   */
  protected abstract extractRelevantConfig(config: T): any;

  /**
   * 停止接受新连接（各协议自定义）
   */
  protected abstract stopAcceptingNewConnections(traceId: string): Promise<void>;

  /**
   * 等待现有连接完成（各协议自定义）
   */
  protected abstract waitForConnectionCompletion(timeout: number, traceId: string): Promise<void>;

  /**
   * 强制关闭剩余连接（各协议自定义）
   */
  protected abstract forceCloseRemainingConnections(traceId: string): Promise<void>;

  /**
   * 强制关闭（各协议自定义）
   */
  protected abstract forceShutdown(traceId: string): void;

  // ============= 原有的抽象方法保持不变 =============

  /**
   * 启动服务器
   */
  abstract Start(listenCallback?: () => void): any;

  /**
   * 获取服务器状态
   */
  abstract getStatus(): number;

  /**
   * 获取原生服务器实例
   */
  abstract getNativeServer(): NativeServer;

  /**
   * 销毁服务器（抽象方法，各协议实现）
   * 内部应该调用 gracefulShutdown 进行优雅关闭
   */
  abstract destroy(): Promise<void>;

  /**
   * 停止服务器（向后兼容）
   */
  Stop(callback?: (err?: Error) => void): void {
    const traceId = generateTraceId();
    this.logger.info('Server stopping', { traceId });

    this.destroy()
      .then(() => {
        this.logger.info('Server stopped', { traceId }, {
          gracefulShutdown: true,
          finalConnectionCount: this.getActiveConnectionCount()
        });
        if (callback) callback();
      })
      .catch((err: Error) => {
        this.logger.error('Server stop failed', { traceId }, err);
        this.forceShutdown(traceId);

        this.logger.info('Server stopped', { traceId }, {
          forcedShutdown: true,
          finalConnectionCount: this.getActiveConnectionCount()
        });

        if (callback) callback(err);
      });
  }
}

// 导出健康状态枚举
export { HealthStatus, ConnectionStats };
