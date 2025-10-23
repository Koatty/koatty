/*
 * @Description: HTTP Server implementation using template method pattern
 * @Usage: HTTP协议服务器实现
 * @Author: richen
 * @Date: 2021-06-28 15:06:13
 * @LastEditTime: 2024-11-27 23:00:00
 */
import { createServer, Server } from "http";
import { KoattyApplication, NativeServer } from "koatty_core";
import { generateTraceId } from "../utils/logger";
import { CreateTerminus } from "../utils/terminus";
import { BaseServer, ConfigChangeAnalysis } from "./base";
import { HttpConnectionPoolManager } from "../pools/http";
import { ConfigHelper, HttpServerOptions, ListeningOptions } from "../config/config";


/**
 * HTTP Server implementation using template method pattern
 * 继承BaseServer，只实现HTTP特定的逻辑
 */
export class HttpServer extends BaseServer<HttpServerOptions> {
  readonly server: Server;
  protected connectionPool: HttpConnectionPoolManager;

  constructor(app: KoattyApplication, options: HttpServerOptions) {
    super(app, options);
    this.options = ConfigHelper.createHttpConfig(options);
    CreateTerminus(app, this);
  }

  /**
   * 初始化HTTP连接池
   */
  protected initializeConnectionPool(): void {
    this.connectionPool = new HttpConnectionPoolManager(this.options.connectionPool);

    // Connection pool initialized with configuration
  }

  /**
   * 创建HTTP服务器实例
   */
  protected createProtocolServer(): void {
    (this as any).server = createServer((req, res) => {
      this.app.callback()(req, res);

      // 记录请求指标
      res.on('finish', () => {
        if (req.socket) {
          this.connectionPool.handleRequestComplete(
            req.socket,
            res.getHeaders()['content-length'] as number || 0
          ).catch(() => {
            // Request completion error handled silently
          });
        }
      });
    });

    // HTTP server instance created
  }

  /**
   * 配置HTTP服务器选项
   */
  protected configureServerOptions(): void {
    this.configureConnectionPoolSettings();
    this.setupConnectionTracking();
  }

  /**
   * HTTP特定的额外初始化
   */
  protected performProtocolSpecificInitialization(): void {
    this.logger.info('HTTP server initialization completed', {}, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      serverId: this.serverId
    });
  }

  // ============= HTTP特定的私有方法 =============

  /**
   * 配置连接池设置
   */
  private configureConnectionPoolSettings(): void {
    const poolConfig = this.options.connectionPool;

    if (!poolConfig) {
      // Using default connection pool configuration
      return;
    }

    // 应用Keep-Alive超时
    if (poolConfig.keepAliveTimeout !== undefined) {
      this.server.keepAliveTimeout = poolConfig.keepAliveTimeout;
    }

    // 应用请求头超时
    if (poolConfig.headersTimeout !== undefined) {
      this.server.headersTimeout = poolConfig.headersTimeout;
    }

    // 应用请求超时
    if (poolConfig.requestTimeout !== undefined) {
      this.server.requestTimeout = poolConfig.requestTimeout;
    }

    this.logger.info('HTTP connection pool configured successfully', {}, {
      maxConnections: poolConfig.maxConnections || 'unlimited',
      keepAliveTimeout: poolConfig.keepAliveTimeout || this.server.keepAliveTimeout,
      headersTimeout: poolConfig.headersTimeout || this.server.headersTimeout,
      requestTimeout: poolConfig.requestTimeout || this.server.requestTimeout
    });
  }

  /**
   * 设置连接跟踪
   */
  private setupConnectionTracking(): void {
    // 增强的连接跟踪，集成连接池管理
    this.server.on('connection', (socket) => {
      // 使用连接池管理连接
      this.connectionPool.addHttpConnection(socket).catch(error => {
        this.logger.error('Failed to add connection to pool', {}, error);
        socket.destroy();
      });
    });
  }

  // ============= 实现配置管理抽象方法 =============

  protected analyzeConfigChanges(
    changedKeys: (keyof HttpServerOptions)[],
    oldConfig: HttpServerOptions,
    newConfig: HttpServerOptions
  ): ConfigChangeAnalysis {
    // 关键配置变更需要重启
    const criticalKeys: (keyof ListeningOptions)[] = ['hostname', 'port', 'protocol'];

    if (changedKeys.some(key => criticalKeys.includes(key as keyof ListeningOptions))) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'Critical network configuration changed',
        canApplyRuntime: false
      };
    }

    // 连接池配置变更
    if (this.hasConnectionPoolChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'Connection pool configuration changed',
        canApplyRuntime: false
      };
    }

    return {
      requiresRestart: false,
      changedKeys: changedKeys as string[],
      canApplyRuntime: true
    };
  }

  protected onRuntimeConfigChange(
    analysis: ConfigChangeAnalysis,
    newConfig: Partial<HttpServerOptions>,
    traceId: string
  ): void {
    // 处理HTTP特定的运行时配置变更
    const httpConfig = newConfig as Partial<HttpServerOptions>;

    // 更新连接池限制（如果支持）
    if (httpConfig.connectionPool?.maxConnections) {
      this.logger.info('Updating connection pool limits', { traceId }, {
        oldLimit: 'current',
        newLimit: httpConfig.connectionPool.maxConnections
      });
      // 注意：这需要额外的实现来实际执行限制
    }

    // Runtime configuration changes applied
  }

  protected extractRelevantConfig(config: HttpServerOptions) {
    return {
      hostname: config.hostname,
      port: config.port,
      protocol: config.protocol,
      connectionPool: config.connectionPool ? {
        maxConnections: config.connectionPool.maxConnections,
        keepAliveTimeout: config.connectionPool.keepAliveTimeout,
        headersTimeout: config.connectionPool.headersTimeout,
        requestTimeout: config.connectionPool.requestTimeout
      } : null
    };
  }

  /**
   * 检查连接池配置是否变更
   */
  private hasConnectionPoolChanged(oldConfig: HttpServerOptions, newConfig: HttpServerOptions): boolean {
    const oldPool = oldConfig.connectionPool;
    const newPool = newConfig.connectionPool;

    if (!oldPool && !newPool) return false;
    if (!oldPool || !newPool) return true;

    return (
      oldPool.maxConnections !== newPool.maxConnections ||
      oldPool.keepAliveTimeout !== newPool.keepAliveTimeout ||
      oldPool.headersTimeout !== newPool.headersTimeout ||
      oldPool.requestTimeout !== newPool.requestTimeout
    );
  }

  // ============= 实现优雅关闭抽象方法 =============

  protected async stopAcceptingNewConnections(traceId: string): Promise<void> {
    this.logger.info('Step 1: Stopping acceptance of new HTTP connections', { traceId });

    // HTTP服务器停止监听新连接
    if (this.server.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    this.logger.debug('New HTTP connection acceptance stopped', { traceId });
  }

  protected async waitForConnectionCompletion(timeout: number, traceId: string): Promise<void> {
    this.logger.info('Step 3: Waiting for existing HTTP connections to complete', { traceId }, {
      activeConnections: this.getActiveConnectionCount(),
      timeout: timeout
    });

    const startTime = Date.now();

    while (this.getActiveConnectionCount() > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeout) {
        this.logger.warn('HTTP connection completion timeout reached', { traceId }, {
          remainingConnections: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Connection completion wait finished
  }

  protected async forceCloseRemainingConnections(traceId: string): Promise<void> {
    const remainingConnections = this.getActiveConnectionCount();

    if (remainingConnections > 0) {
      this.logger.info('Step 4: Force closing remaining HTTP connections', { traceId }, {
        remainingConnections
      });

      // 使用连接池强制关闭所有连接
      await this.connectionPool.closeAllConnections(5000);

      this.logger.warn('Forced closure of remaining HTTP connections', { traceId }, {
        forcedConnections: remainingConnections
      });
    } else {
      this.logger.debug('Step 4: No remaining HTTP connections to close', { traceId });
    }
  }

  protected forceShutdown(traceId: string): void {
    this.logger.warn('Force HTTP server shutdown initiated', { traceId });

    // 强制关闭HTTP服务器
    this.server.close();

    // 停止监控和清理
    this.stopMonitoringAndCleanup(traceId);
  }

  // ============= 实现KoattyServer接口 =============

  Start(listenCallback?: () => void): NativeServer {
    const traceId = generateTraceId();
    this.logger.info('Server starting', { traceId }, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol
    });

    const finalCallback = listenCallback || this.listenCallback;

    // 添加错误事件监听器，必须在 listen 之前注册
    const errorHandler = (error: Error) => {
      this.logger.error('Server startup error', { traceId }, error);
      // 使用 setImmediate 而不是 nextTick，确保错误处理在当前事件循环完成后执行
      setImmediate(() => {
        throw error;
      });
    };

    // 检查server是否支持once方法（避免测试中的mock对象问题）
    if (typeof this.server.once === 'function') {
      this.server.once('error', errorHandler);
    }

    this.server.listen(this.options.port, this.options.hostname, () => {
      // 启动成功，移除启动阶段的错误处理器
      if (typeof this.server.removeListener === 'function') {
        this.server.removeListener('error', errorHandler);
      }
      
      // 添加运行时错误处理器
      if (typeof this.server.on === 'function') {
        this.server.on('error', (error: Error) => {
          this.logger.error('Server runtime error', { traceId }, error);
          // 运行时错误不退出进程
        });
      }

      // Record start time
      this.startTime = Date.now();

      const protocolUpper = this.options.protocol.toUpperCase();
      const underlyingProtocol = this.options.ext?._underlyingProtocol;
      // For URL, always use the underlying protocol (http/https), not graphql
      const urlProtocol = underlyingProtocol ? underlyingProtocol.toLowerCase() : this.options.protocol.toLowerCase();

      const serverUrl = `${urlProtocol}://${this.options.hostname || '127.0.0.1'}:${this.options.port}/`;

      // 输出 Koatty 格式的启动日志
      this.logger.info(`Server: ${protocolUpper} running at ${serverUrl}`, { traceId });

      this.logger.info('Server started', { traceId }, {
        address: `${this.options.hostname}:${this.options.port}`,
        hostname: this.options.hostname,
        port: this.options.port,
        protocol: this.options.protocol,
        connectionPoolEnabled: !!this.connectionPool,
        serverId: this.serverId
      });

      // 启动连接池监控
      this.startConnectionPoolMonitoring();

      if (finalCallback) {
        finalCallback();
      }
    });

    return this.server;
  }

  getStatus(): number {
    return this.status;
  }

  getNativeServer(): NativeServer {
    return this.server;
  }

  // ============= HTTP特定的方法 =============

  /**
   * 启动连接池监控
   */
  private startConnectionPoolMonitoring(): void {
    // Connection pool monitoring enabled (statistics collected silently)
    this.timerManager.addTimer('http_connection_monitoring', () => {
      this.getConnectionStats(); // Collect stats but don't log
    }, 30000); // 每30秒
  }

  /**
   * 获取HTTP连接统计信息
   */
  getHttpConnectionStats() {
    return this.connectionPool ? this.connectionPool.getConnectionStats() : null;
  }

  /**
   * 销毁服务器
   */
  async destroy(): Promise<void> {
    const traceId = generateTraceId();
    this.logger.info('Destroying HTTP server', { traceId });

    try {
      await this.gracefulShutdown();
      this.logger.info('HTTP server destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying HTTP server', { traceId }, error);
      throw error;
    }
  }
}
