/*
 * @Description: HTTPS Server implementation using template method pattern
 * @Usage: HTTPS协议服务器实现
 * @Author: richen
 * @Date: 2021-11-12 11:48:01
 * @LastEditTime: 2024-11-27 23:30:00
 */
import { createServer, Server, ServerOptions } from "https";
import { TLSSocket } from "tls";
import { KoattyApplication, NativeServer } from "koatty_core";
import { BaseServer, ConfigChangeAnalysis } from "./base";
import { generateTraceId } from "../utils/logger";
import { CreateTerminus } from "../utils/terminus";
import { loadCertificate } from "../utils/cert-loader";
import { HttpsConnectionPoolManager } from "../pools/https";
import { ConfigHelper, HttpsServerOptions, ListeningOptions, SSL1Config } from "../config/config";

/**
 * HTTPS Server implementation using template method pattern
 * 继承BaseServer，只实现HTTPS特定的逻辑
 */
export class HttpsServer extends BaseServer<HttpsServerOptions> {
  readonly server: Server;
  protected connectionPool: HttpsConnectionPoolManager;

  constructor(app: KoattyApplication, options: HttpsServerOptions) {
    super(app, options);
    this.options = ConfigHelper.createHttpsConfig(options);
    CreateTerminus(app, this);
  }

  /**
   * 初始化HTTPS连接池
   */
  protected initializeConnectionPool(): void {
    this.connectionPool = new HttpsConnectionPoolManager(this.options.connectionPool);
    
    // HTTPS connection pool initialized with configuration
  }

  /**
   * 创建HTTPS服务器实例
   */
  protected createProtocolServer(): void {
    const sslOptions = this.createSSLOptions();
    
    (this as any).server = createServer(sslOptions, (req, res) => {
      const startTime = Date.now();
      this.app.callback()(req, res);
      
      // 记录请求指标
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode < 400;
        this.recordRequest(success, responseTime);
        
        // 记录HTTPS连接池请求完成
        if ((req as any).socket) {
          this.connectionPool.handleRequestComplete(
            (req as any).socket as TLSSocket, 
            res.getHeaders()['content-length'] as number || 0
          ).catch(() => {
            // HTTPS request completion error handled silently
          });
        }
      });
    });
    
    // HTTPS server instance created
  }

  /**
   * 配置HTTPS服务器选项
   */
  protected configureServerOptions(): void {
    this.setupConnectionHandling();
  }

  /**
   * HTTPS特定的额外初始化
   */
  protected performProtocolSpecificInitialization(): void {
    this.logger.info('HTTPS server initialization completed', {}, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      serverId: this.serverId,
      sslMode: this.options.ssl?.mode || 'auto',
      maxConnections: this.options.connectionPool?.maxConnections
    });
  }

  /**
   * 创建SSL选项
   */
  private createSSLOptions(): ServerOptions {
    const sslConfig = this.options.ssl || { mode: 'auto' };

    switch (sslConfig.mode) {
      case 'manual':
        return this.createManualSSLOptions(sslConfig);
      case 'mutual_tls':
        return this.createMutualTLSOptions(sslConfig);
      case 'auto':
      default:
        return this.createAutoSSLOptions(sslConfig);
    }
  }

  /**
   * 自动SSL配置
   */
  private createAutoSSLOptions(sslConfig: SSL1Config): ServerOptions {
    const keyPath = sslConfig.key;
    const certPath = sslConfig.cert;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for HTTPS');
    }
    
    const options: ServerOptions = {
      key: loadCertificate(keyPath, 'private key'),
      cert: loadCertificate(certPath, 'certificate')
    };
    
    // 在auto模式下也处理扩展配置选项
    // 连接超时设置
    if (sslConfig.handshakeTimeout !== undefined && sslConfig.handshakeTimeout !== null) {
      options.handshakeTimeout = sslConfig.handshakeTimeout;
    }
    if (sslConfig.sessionTimeout !== undefined && sslConfig.sessionTimeout !== null) {
      options.sessionTimeout = sslConfig.sessionTimeout;
    }
    
    // SNI支持
    if (sslConfig.SNICallback !== undefined && sslConfig.SNICallback !== null) {
      options.SNICallback = sslConfig.SNICallback;
    }
    
    // 会话恢复
    if (sslConfig.sessionIdContext !== undefined && sslConfig.sessionIdContext !== null) {
      options.sessionIdContext = sslConfig.sessionIdContext;
    }
    if (sslConfig.ticketKeys !== undefined && sslConfig.ticketKeys !== null) {
      options.ticketKeys = sslConfig.ticketKeys;
    }
    
    // HTTP/2 兼容性
    if (sslConfig.ALPNProtocols !== undefined && sslConfig.ALPNProtocols !== null) {
      options.ALPNProtocols = sslConfig.ALPNProtocols;
    }
    
    return options;
  }

  /**
   * 手动SSL配置
   */
  private createManualSSLOptions(sslConfig: SSL1Config): ServerOptions {
    const keyPath = sslConfig.key;
    const certPath = sslConfig.cert;
    const caPath = sslConfig.ca;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for manual SSL mode');
    }
    
    const options: ServerOptions = {
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
    
    // 添加扩展配置选项
    // 连接超时设置
    if (sslConfig.handshakeTimeout !== undefined) {
      options.handshakeTimeout = sslConfig.handshakeTimeout;
    }
    if (sslConfig.sessionTimeout !== undefined) {
      options.sessionTimeout = sslConfig.sessionTimeout;
    }
    
    // SNI支持
    if (sslConfig.SNICallback) {
      options.SNICallback = sslConfig.SNICallback;
    }
    
    // 会话恢复
    if (sslConfig.sessionIdContext) {
      options.sessionIdContext = sslConfig.sessionIdContext;
    }
    if (sslConfig.ticketKeys) {
      options.ticketKeys = sslConfig.ticketKeys;
    }
    
    // HTTP/2 兼容性
    if (sslConfig.ALPNProtocols) {
      options.ALPNProtocols = sslConfig.ALPNProtocols;
    }
    
    return options;
  }

  /**
   * 双向TLS配置
   */
  private createMutualTLSOptions(sslConfig: SSL1Config): ServerOptions {
    const manualOptions = this.createManualSSLOptions(sslConfig);
    
    return {
      ...manualOptions,
      requestCert: sslConfig.requestCert !== false,
      rejectUnauthorized: sslConfig.rejectUnauthorized !== false
    };
  }

  /**
   * 设置连接处理
   */
  private setupConnectionHandling(): void {
    // Enhanced connection tracking with connection pool management
    this.server.on('secureConnection', (tlsSocket: TLSSocket) => {
      // 使用连接池管理连接
      this.connectionPool.addHttpsConnection(tlsSocket).catch((error: Error) => {
        this.logger.error('Failed to add HTTPS connection to pool', {}, error);
        tlsSocket.destroy();
      });

      this.logger.debug('Secure connection established', {}, {
        authorized: tlsSocket.authorized,
        protocol: tlsSocket.getProtocol(),
        cipher: tlsSocket.getCipher()?.name,
        remoteAddress: tlsSocket.remoteAddress
      });
    });

    this.server.on('tlsClientError', (err: Error, tlsSocket?: TLSSocket) => {
      this.logger.warn('TLS client error', {}, {
        error: err.message,
        remoteAddress: tlsSocket?.remoteAddress
      });
    });
  }

  /**
   * 记录请求 TODO
   */
  private recordRequest(_success: boolean, _responseTime: number): void {
    // 这里可以记录请求统计信息
    // 连接池会自动处理连接级别的统计
  }


  // ============= 实现配置管理抽象方法 =============

  protected analyzeConfigChanges(
    changedKeys: (keyof HttpsServerOptions)[],
    oldConfig: HttpsServerOptions,
    newConfig: HttpsServerOptions
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
    newConfig: Partial<HttpsServerOptions>,
    traceId: string
  ): void {
    // 处理HTTPS特定的运行时配置变更
    const httpsConfig = newConfig as Partial<HttpsServerOptions>;
    
    // 更新连接池配置
    if (httpsConfig.connectionPool) {
      this.logger.info('Updating HTTPS connection pool configuration', { traceId }, {
        oldConfig: this.options.connectionPool,
        newConfig: httpsConfig.connectionPool
      });
      
      this.connectionPool.updateConfig(httpsConfig.connectionPool);
    }

    // Runtime configuration changes applied
  }

  protected extractRelevantConfig(config: HttpsServerOptions) {
    return {
      hostname: config.hostname,
      port: config.port,
      protocol: config.protocol,
      sslMode: config.ssl?.mode || 'auto',
      connectionPool: config.connectionPool ? {
        maxConnections: config.connectionPool.maxConnections,
        keepAliveTimeout: config.connectionPool.keepAliveTimeout,
        headersTimeout: config.connectionPool.headersTimeout,
        requestTimeout: config.connectionPool.requestTimeout
      } : null
    };
  }

  /**
   * 检查SSL配置是否变更
   */
  private hasSSLConfigChanged(oldConfig: HttpsServerOptions, newConfig: HttpsServerOptions): boolean {
    const oldSSL = oldConfig.ssl;
    const newSSL = newConfig.ssl;

    if (!oldSSL && !newSSL) return false;
    if (!oldSSL || !newSSL) return true;

    return (
      oldSSL.mode !== newSSL.mode ||
      oldSSL.key !== newSSL.key ||
      oldSSL.cert !== newSSL.cert ||
      oldSSL.ca !== newSSL.ca ||
      oldSSL.ciphers !== newSSL.ciphers ||
      oldSSL.secureProtocol !== newSSL.secureProtocol ||
      oldSSL.honorCipherOrder !== newSSL.honorCipherOrder ||
      oldSSL.requestCert !== newSSL.requestCert ||
      oldSSL.rejectUnauthorized !== newSSL.rejectUnauthorized
    );
  }

  /**
   * 检查连接池配置是否变更
   */
  private hasConnectionPoolChanged(oldConfig: HttpsServerOptions, newConfig: HttpsServerOptions): boolean {
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
    this.logger.info('Step 1: Stopping acceptance of new HTTPS connections', { traceId });
    
    // 检查服务器是否真的在监听（对测试环境友好）
    if (this.server.listening) {
      // 停止HTTPS服务器监听
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } else {
      this.logger.debug('HTTPS server is not listening, skip close', { traceId });
    }
    
    this.logger.debug('New HTTPS connection acceptance stopped', { traceId });
  }

  protected async waitForConnectionCompletion(timeout: number, traceId: string): Promise<void> {
    this.logger.info('Step 3: Waiting for existing HTTPS connections to complete', { traceId }, {
      activeConnections: this.getActiveConnectionCount(),
      timeout: timeout
    });

    const startTime = Date.now();
    
    while (this.getActiveConnectionCount() > 0) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        this.logger.warn('HTTPS connection completion timeout reached', { traceId }, {
          remainingConnections: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
        break;
      }
      
      // 每5秒记录一次进度
      if (elapsed % 5000 < 100) {
        this.logger.debug('Waiting for HTTPS connections to complete', { traceId }, {
          remainingConnections: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.debug('HTTPS connection completion wait finished', { traceId }, {
      remainingConnections: this.getActiveConnectionCount()
    });
  }

  protected async forceCloseRemainingConnections(traceId: string): Promise<void> {
    const remainingConnections = this.getActiveConnectionCount();
    
    if (remainingConnections > 0) {
      this.logger.info('Step 4: Force closing remaining HTTPS connections', { traceId }, {
        remainingConnections
      });
      
      // 使用连接池强制关闭所有连接
      await this.connectionPool.closeAllConnections(5000);
      
      this.logger.warn('Forced closure of remaining HTTPS connections', { traceId }, {
        forcedConnections: remainingConnections
      });
    } else {
      this.logger.debug('Step 4: No remaining HTTPS connections to close', { traceId });
    }
  }

  protected forceShutdown(traceId: string): void {
    this.logger.warn('Force HTTPS server shutdown initiated', { traceId });
    
    // 强制关闭HTTPS服务器
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
      const urlProtocol = this.options.protocol.toLowerCase();
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
        sslMode: this.options.ssl?.mode || 'auto'
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

  // ============= HTTPS特定的方法 =============

  /**
   * 启动连接池监控
   */
  private startConnectionPoolMonitoring(): void {
    // Connection pool monitoring enabled (statistics collected silently)
    this.timerManager.addTimer('https_connection_monitoring', () => {
      this.getConnectionStats(); // Collect stats but don't log
    }, 30000); // 每30秒
  }

  /**
   * 获取安全统计信息
   */
  getSecurityMetrics() {
    return {
      sslMode: this.options.ssl?.mode || 'auto',
      ciphers: this.options.ssl?.ciphers,
      secureProtocol: this.options.ssl?.secureProtocol,
      mutualTLS: this.options.ssl?.mode === 'mutual_tls'
    };
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
    this.logger.info('Destroying HTTPS server', { traceId });

    try {
      await this.gracefulShutdown();
      this.logger.info('HTTPS server destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying HTTPS server', { traceId }, error);
      throw error;
    }
  }
} 