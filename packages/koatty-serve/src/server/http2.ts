/*
 * @Description: HTTP/2 Server implementation using template method pattern
 * @Usage: HTTP/2协议服务器实现
 * @Author: richen
 * @Date: 2021-06-28 15:06:13
 * @LastEditTime: 2024-11-27 23:30:00
 */
import { createSecureServer, Http2SecureServer, SecureServerOptions } from "http2";
import { KoattyApplication, NativeServer } from "koatty_core";
import { BaseServer, ConfigChangeAnalysis } from "./base";
import { generateTraceId } from "../utils/logger";
import { CreateTerminus } from "../utils/terminus";
import { loadCertificate } from "../utils/cert-loader";
import { Http2ConnectionPoolManager } from "../pools/http2";
import { ConfigHelper, Http2ServerOptions, ListeningOptions, SSL2Config } from "../config/config";

/**
 * HTTP/2 Server implementation using template method pattern
 * 继承BaseServer，只实现HTTP/2特定的逻辑
 */
export class Http2Server extends BaseServer<Http2ServerOptions> {
  readonly server: Http2SecureServer;
  protected connectionPool!: Http2ConnectionPoolManager;

  constructor(app: KoattyApplication, options: Http2ServerOptions) {
    super(app, options);
    this.options = ConfigHelper.createHttp2Config(options);
    CreateTerminus(app, this);
  }

  /**
   * 初始化HTTP/2连接池
   */
  protected initializeConnectionPool(): void {
    this.connectionPool = new Http2ConnectionPoolManager(this.options.connectionPool);
    
    // HTTP/2 connection pool initialized with configuration
  }

  /**
   * 创建HTTP/2服务器实例
   */
  protected createProtocolServer(): void {
    const http2Options = this.createHTTP2Options();
    
    (this as any).server = createSecureServer(http2Options, (req, res) => {
      this.app.callback()(req, res);
      
      // 请求指标由连接池自动处理
    });
    
    // HTTP/2 server instance created
  }

  /**
   * 配置HTTP/2服务器选项
   */
  protected configureServerOptions(): void {
    this.setupSessionHandling();
  }

  /**
   * HTTP/2特定的额外初始化
   */
  protected performProtocolSpecificInitialization(): void {
    this.logger.info('HTTP/2 server initialization completed', {}, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      serverId: this.serverId,
      sslMode: this.options.ssl?.mode || 'auto',
      allowHTTP1: this.options.ssl?.allowHTTP1 !== false,
      maxConnections: this.options.connectionPool?.maxConnections
    });
  }

  /**
   * 创建HTTP/2选项
   */
  private createHTTP2Options(): SecureServerOptions {
    const sslConfig = this.options.ssl;
    const http2Config = this.options.http2;

    let sslOptions: SecureServerOptions = {};
    
    if (sslConfig) {
      sslOptions = this.createSSLOptions(sslConfig, {});
    }

    // HTTP/2 specific options
    const http2Options: SecureServerOptions = {
      ...sslOptions,
      allowHTTP1: sslConfig?.allowHTTP1 !== false, // 默认允许HTTP/1.1回退
    };

    // 添加HTTP/2设置
    if (http2Config?.settings) {
      http2Options.settings = http2Config.settings;
    }

    return http2Options;
  }

  /**
   * 创建SSL选项
   */
  private createSSLOptions(sslConfig: SSL2Config, extConfig: any): SecureServerOptions {
    switch (sslConfig.mode) {
      case 'manual':
        return this.createManualSSLOptions(sslConfig, extConfig);
      case 'mutual_tls':
        return this.createMutualTLSOptions(sslConfig, extConfig);
      case 'auto':
      default:
        return this.createAutoSSLOptions(sslConfig, extConfig);
    }
  }

  /**
   * 自动SSL配置
   */
  private createAutoSSLOptions(sslConfig: SSL2Config, extConfig: any): SecureServerOptions {
    const keyPath = sslConfig.key || extConfig?.key;
    const certPath = sslConfig.cert || extConfig?.cert;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for HTTP/2');
    }
    
    return {
      key: loadCertificate(keyPath, 'private key'),
      cert: loadCertificate(certPath, 'certificate')
    };
  }

  /**
   * 手动SSL配置
   */
  private createManualSSLOptions(sslConfig: SSL2Config, extConfig: any): SecureServerOptions {
    const keyPath = sslConfig.key || extConfig?.key;
    const certPath = sslConfig.cert || extConfig?.cert;
    const caPath = sslConfig.ca || extConfig?.ca;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for manual SSL mode');
    }
    
    const options: SecureServerOptions = {
      key: loadCertificate(keyPath, 'private key'),
      cert: loadCertificate(certPath, 'certificate'),
      passphrase: sslConfig.passphrase,
      ciphers: sslConfig.ciphers,
      honorCipherOrder: sslConfig.honorCipherOrder,
      secureProtocol: sslConfig.secureProtocol
    };
    
    if (caPath) {
      options.ca = loadCertificate(caPath, 'CA certificate');
    }
    
    return options;
  }

  /**
   * 双向TLS配置
   */
  private createMutualTLSOptions(sslConfig: SSL2Config, extConfig: any): SecureServerOptions {
    const manualOptions = this.createManualSSLOptions(sslConfig, extConfig);
    
    return {
      ...manualOptions,
      requestCert: sslConfig.requestCert !== false,
      rejectUnauthorized: sslConfig.rejectUnauthorized !== false
    };
  }

  /**
   * 设置会话处理
   */
  private setupSessionHandling(): void {
    // HTTP/2 session management through connection pool
    this.server.on('session', (session) => {
      this.connectionPool.addHttp2Session(session).catch((error: Error) => {
        this.logger.error('Failed to add HTTP/2 session to pool', {}, error);
        try {
          session.close();
        } catch {
          // Session close error handled silently
        }
      });
    });

    this.server.on('sessionError', (error: Error, session: any) => {
      this.logger.warn('HTTP/2 session error', {}, {
        error: error.message,
        sessionId: session.id
      });
    });
  }

  protected analyzeConfigChanges(
    changedKeys: (keyof Http2ServerOptions)[],
    oldConfig: Http2ServerOptions,
    newConfig: Http2ServerOptions
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

    // SSL配置变更
    if (this.hasSSLConfigChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'SSL/TLS configuration changed',
        canApplyRuntime: false
      };
    }

    // HTTP/2配置变更
    if (this.hasHTTP2ConfigChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'HTTP/2 protocol configuration changed',
        canApplyRuntime: false
      };
    }

    // 连接池配置变更
    if (this.hasConnectionPoolChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: false,
        changedKeys: changedKeys as string[],
        canApplyRuntime: true
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
    newConfig: Partial<Http2ServerOptions>,
    traceId: string
  ): void {
    // 处理HTTP/2特定的运行时配置变更
    const http2Config = newConfig as Partial<Http2ServerOptions>;
    
    // 更新连接池配置
    if (http2Config.connectionPool) {
      this.logger.info('Updating HTTP/2 connection pool configuration', { traceId }, {
        oldConfig: this.options.connectionPool,
        newConfig: http2Config.connectionPool
      });
      
      this.connectionPool.updateConfig(http2Config.connectionPool);
    }

    this.logger.debug('HTTP/2 runtime configuration changes applied', { traceId });
  }

  protected extractRelevantConfig(config: Http2ServerOptions) {
    return {
      hostname: config.hostname,
      port: config.port,
      protocol: config.protocol,
      sslMode: config.ssl?.mode || 'auto',
      allowHTTP1: config.ssl?.allowHTTP1 !== false,
      connectionPool: config.connectionPool ? {
        maxConnections: config.connectionPool.maxConnections,
        maxSessionMemory: config.connectionPool.maxSessionMemory,
        maxHeaderListSize: config.connectionPool.maxHeaderListSize
      } : null,
      http2Settings: config.http2?.settings
    };
  }

  /**
   * 检查SSL配置是否变更
   */
  private hasSSLConfigChanged(oldConfig: Http2ServerOptions, newConfig: Http2ServerOptions): boolean {
    const oldSSL = oldConfig.ssl;
    const newSSL = newConfig.ssl;

    if (!oldSSL && !newSSL) return false;
    if (!oldSSL || !newSSL) return true;

    return (
      oldSSL.mode !== newSSL.mode ||
      oldSSL.key !== newSSL.key ||
      oldSSL.cert !== newSSL.cert ||
      oldSSL.ca !== newSSL.ca ||
      oldSSL.allowHTTP1 !== newSSL.allowHTTP1
    );
  }

  /**
   * 检查HTTP/2配置是否变更
   */
  private hasHTTP2ConfigChanged(oldConfig: Http2ServerOptions, newConfig: Http2ServerOptions): boolean {
    const oldHttp2 = oldConfig.http2;
    const newHttp2 = newConfig.http2;

    if (!oldHttp2 && !newHttp2) return false;
    if (!oldHttp2 || !newHttp2) return true;

    return (
      oldHttp2.maxHeaderListSize !== newHttp2.maxHeaderListSize ||
      oldHttp2.maxSessionMemory !== newHttp2.maxSessionMemory ||
      JSON.stringify(oldHttp2.settings) !== JSON.stringify(newHttp2.settings)
    );
  }

  /**
   * 检查连接池配置是否变更
   */
  private hasConnectionPoolChanged(oldConfig: Http2ServerOptions, newConfig: Http2ServerOptions): boolean {
    const oldPool = oldConfig.connectionPool;
    const newPool = newConfig.connectionPool;

    if (!oldPool && !newPool) return false;
    if (!oldPool || !newPool) return true;

    return (
      oldPool.maxConnections !== newPool.maxConnections ||
      oldPool.maxSessionMemory !== newPool.maxSessionMemory ||
      oldPool.maxHeaderListSize !== newPool.maxHeaderListSize ||
      oldPool.keepAliveTimeout !== newPool.keepAliveTimeout
    );
  }

  // ============= 实现优雅关闭抽象方法 =============

  protected async stopAcceptingNewConnections(traceId: string): Promise<void> {
    this.logger.info('Step 1: Stopping acceptance of new HTTP/2 connections', { traceId });
    
    // 停止HTTP/2服务器监听
    if (this.server.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    this.logger.debug('New HTTP/2 connection acceptance stopped', { traceId });
  }

  protected async waitForConnectionCompletion(timeout: number, traceId: string): Promise<void> {
    this.logger.info('Step 3: Waiting for existing HTTP/2 sessions to complete', { traceId }, {
      activeSessions: this.getActiveConnectionCount(),
      timeout: timeout
    });

    const startTime = Date.now();
    
    while (this.getActiveConnectionCount() > 0) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        this.logger.warn('HTTP/2 session completion timeout reached', { traceId }, {
          remainingSessions: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
        break;
      }
      
      // 每5秒记录一次进度
      if (elapsed % 5000 < 100) {
        this.logger.debug('Waiting for HTTP/2 sessions to complete', { traceId }, {
          remainingSessions: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.debug('HTTP/2 session completion wait finished', { traceId }, {
      remainingSessions: this.getActiveConnectionCount()
    });
  }

  protected async forceCloseRemainingConnections(traceId: string): Promise<void> {
    const remainingConnections = this.getActiveConnectionCount();
    
    if (remainingConnections > 0) {
      this.logger.info('Step 4: Force closing remaining HTTP/2 sessions', { traceId }, {
        remainingSessions: remainingConnections
      });
      
      // 使用连接池强制关闭所有会话
      await this.connectionPool.closeAllConnections(5000);
      
      this.logger.warn('Forced closure of remaining HTTP/2 sessions', { traceId }, {
        forcedSessions: remainingConnections
      });
    } else {
      this.logger.debug('Step 4: No remaining HTTP/2 sessions to close', { traceId });
    }
  }

  protected forceShutdown(traceId: string): void {
    this.logger.warn('Force HTTP/2 server shutdown initiated', { traceId });
    
    // 强制关闭HTTP/2服务器
    this.server.close();
    
    // 停止监控和清理
    this.stopMonitoringAndCleanup(traceId);
  }

  /**
   * 重写停止监控和清理方法以处理HTTP/2特定的监控间隔
   */
  protected stopMonitoringAndCleanup(traceId: string): void {
    this.logger.info('Step 5: Stopping monitoring and cleanup', { traceId });

    // 调用父类的清理方法（会清理所有TimerManager的定时器）
    super.stopMonitoringAndCleanup(traceId);
  }

  // ============= 实现KoattyServer接口 =============

  Start(listenCallback?: () => void): NativeServer {
    const traceId = generateTraceId();
    this.logger.info('Server starting', { traceId }, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol
    });

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
      // For URL, always use the underlying protocol (http2/https), not graphql
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
        serverId: this.serverId,
        sslMode: this.options.ssl?.mode || 'auto',
        allowHTTP1: this.options.ssl?.allowHTTP1 !== false
      });
      
      // 启动连接池监控
      this.startConnectionPoolMonitoring();
      
      if (listenCallback) {
        listenCallback();
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

  // ============= HTTP/2特定的方法 =============

  /**
   * 启动连接池监控
   */
  private startConnectionPoolMonitoring(): void {
    // Connection pool monitoring enabled (statistics collected silently)
    this.timerManager.addTimer('http2_connection_monitoring', () => {
      this.getConnectionStats(); // Collect stats but don't log
    }, 30000); // 每30秒
  }

  /**
   * 获取HTTP/2统计信息
   */
  getHttp2Stats() {
    return this.connectionPool ? this.connectionPool.getConnectionStats() : null;
  }

  /**
   * 获取当前连接状态
   */
  getConnectionsStatus(): { current: number; max: number } {
    const poolConfig = this.connectionPool?.getConfig();
    return {
      current: this.getActiveConnectionCount(),
      max: poolConfig?.maxConnections || 0
    };
  }

  /**
   * 销毁服务器
   */
  async destroy(): Promise<void> {
    const traceId = generateTraceId();
    this.logger.info('Destroying HTTP/2 server', { traceId });

    try {
      await this.gracefulShutdown();
      this.logger.info('HTTP/2 server destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying HTTP/2 server', { traceId }, error);
      throw error;
    }
  }
}
