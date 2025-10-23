/*
 * @Description: HTTP/3 Server implementation using template method pattern
 * @Usage: HTTP/3协议服务器实现（基于QUIC）
 * @Author: richen
 * @Date: 2025-01-12 10:30:00
 * @LastEditTime: 2025-01-12 10:30:00
 */

/**
 * HTTP/3 服务器实现说明：
 * 
 * HTTP/3 基于 QUIC 协议（RFC 9114），运行在 UDP 之上。
 * 
 * 关键特性：
 * 1. 必须使用 TLS 1.3 加密
 * 2. 多路复用无队头阻塞
 * 3. 连接迁移支持
 * 4. 0-RTT 连接建立
 * 
 * Node.js 原生尚未完全支持 HTTP/3，需要使用第三方库。
 * 本实现提供了完整的架构框架，具体的 QUIC 库集成说明：
 * 
 * 集成步骤：
 * 1. 选择并安装 QUIC/HTTP3 库，例如：
 *    npm install @napi-rs/quic  (推荐，基于Rust)
 *    或 npm install quiche-native
 * 
 * 2. 在 createProtocolServer() 方法中初始化 QUIC 服务器
 * 3. 实现请求处理逻辑，适配 Koatty 的 callback 接口
 * 4. 设置会话和流的事件监听
 * 
 * 参考文档：
 * - RFC 9114: https://datatracker.ietf.org/doc/html/rfc9114
 * - QUIC Protocol: https://datatracker.ietf.org/doc/html/rfc9000
 */

import { KoattyApplication, NativeServer } from "koatty_core";
import { BaseServer, ConfigChangeAnalysis } from "./base";
import { generateTraceId } from "../utils/logger";
import { CreateTerminus } from "../utils/terminus";
import { loadCertificate, isCertificateContent } from "../utils/cert-loader";
import { Http3ConnectionPoolManager, Http3Session } from "../pools/http3";
import { ConfigHelper, Http3ServerOptions, ListeningOptions, SSL3Config } from "../config/config";
import { Http3ServerAdapter, Http3ServerConfig, getHttp3Version, hasNativeHttp3Support } from "../adapters/http3-matrixai";

/**
 * HTTP/3 Server implementation using template method pattern
 * 继承BaseServer，只实现HTTP/3特定的逻辑
 */
export class Http3Server extends BaseServer<Http3ServerOptions> {
  readonly server: any;  // QUIC 服务器实例（类型取决于使用的库）
  protected connectionPool!: Http3ConnectionPoolManager;

  constructor(app: KoattyApplication, options: Http3ServerOptions) {
    super(app, options);
    this.options = ConfigHelper.createHttp3Config(options);
    CreateTerminus(app, this);
  }

  /**
   * 初始化HTTP/3连接池
   */
  protected initializeConnectionPool(): void {
    this.connectionPool = new Http3ConnectionPoolManager(this.options.connectionPool);
    
    this.logger.info('HTTP/3 connection pool initialized', {}, {
      maxConnections: this.options.connectionPool.maxConnections,
      maxIdleTimeout: this.options.connectionPool.protocolSpecific?.maxIdleTimeout
    });
  }

  /**
   * 创建HTTP/3服务器实例（使用 @matrixai/quic）
   */
  protected createProtocolServer(): void {
    const http3Version = getHttp3Version();
    const hasSupport = hasNativeHttp3Support();
    
    this.logger.info('Initializing HTTP/3 server', {}, { 
      version: http3Version,
      library: '@matrixai/quic',
      available: hasSupport
    });
    
    if (!hasSupport) {
      this.logger.error('@matrixai/quic not available', {}, {
        note: 'Install with: pnpm add @matrixai/quic',
        required: true
      });
      throw new Error('@matrixai/quic is required for HTTP/3 support');
    }
    
    try {
      const http3Config: Http3ServerConfig = {
        hostname: this.options.hostname,
        port: this.options.port,
        certFile: this.resolveFilePath(this.options.ssl?.cert || ''),
        keyFile: this.resolveFilePath(this.options.ssl?.key || ''),
        caFile: this.options.ssl?.ca ? this.resolveFilePath(this.options.ssl.ca) : undefined,
        maxIdleTimeout: this.options.quic?.maxIdleTimeout,
        maxUdpPayloadSize: this.options.quic?.maxUdpPayloadSize,
        initialMaxData: this.options.quic?.initialMaxData,
        initialMaxStreamDataBidiLocal: this.options.quic?.initialMaxStreamDataBidiLocal,
        initialMaxStreamDataBidiRemote: this.options.quic?.initialMaxStreamDataBidiRemote,
        initialMaxStreamDataUni: this.options.quic?.initialMaxStreamDataUni,
        initialMaxStreamsBidi: this.options.quic?.initialMaxStreamsBidi,
        initialMaxStreamsUni: this.options.quic?.initialMaxStreamsUni,
        maxHeaderListSize: this.options.http3?.maxHeaderListSize,
        qpackMaxTableCapacity: this.options.http3?.qpackMaxTableCapacity,
        qpackBlockedStreams: this.options.http3?.qpackBlockedStreams,
      };
      
      (this as any).server = new Http3ServerAdapter(http3Config);
      
      // 设置请求处理器
      this.setupHttp3Handlers();
      
      this.logger.info('HTTP/3 server instance created successfully', {}, {
        implementation: '@matrixai/quic'
      });
      
    } catch (error) {
      this.logger.error('Failed to create HTTP/3 server', {}, error);
      throw error;
    }
  }

  /**
   * 设置 HTTP/3 服务器的事件处理器
   */
  private setupHttp3Handlers(): void {
    const server = this.server;
    
    // 处理 HTTP/3 请求
    server.on('request', (req: any, res: any) => {
      try {
        // 直接将请求传递给 Koatty 应用处理器
        // @yoursunny/http3 已经提供了兼容的 req/res 对象
        this.app.callback()(req, res);
        
      } catch (error) {
        this.logger.error('Error handling HTTP/3 request', {}, error);
        
        // 发送错误响应
        try {
          res.writeHead(500, { 'content-type': 'text/plain' });
          res.end('Internal Server Error');
        } catch {
          // 忽略响应发送失败
          this.logger.error('Error sending HTTP/3 response', {}, error);
        }
      }
    });
    
    // 处理会话
    server.on('session', (session: any) => {
      this.logger.debug('New HTTP/3 session', {}, {
        remoteAddress: session.remoteAddress,
        remotePort: session.remotePort
      });
      
      // 添加到连接池
      this.connectionPool.addHttp3Session(session).catch((error: Error) => {
        this.logger.error('Failed to add HTTP/3 session to pool', {}, error);
        try {
          session.close(1, 'Internal error');
        } catch {
          // Session close error handled silently
          this.logger.error('Error closing HTTP/3 session', {}, error);
        }
      });
    });
    
    // 处理错误
    server.on('error', (error: Error) => {
      this.logger.error('HTTP/3 server error', {}, error);
    });
    
    // 处理监听事件
    server.on('listening', () => {
      this.logger.info('HTTP/3 server listening event fired');
    });
  }

  /**
   * 解析文件路径
   * HTTP/3 adapter 需要文件路径,如果是证书内容则需要写入临时文件
   */
  private resolveFilePath(path: string): string {
    if (!path) {
      throw new Error('Certificate file path is required');
    }
    
    // 使用统一的证书内容检测
    if (isCertificateContent(path)) {
      // 这是证书内容,直接返回(adapter会处理)
      return path;
    }
    
    // 否则是文件路径
    return path;
  }

  /**
   * 配置HTTP/3服务器选项
   */
  protected configureServerOptions(): void {
    this.setupSessionHandling();
    this.setupStreamHandling();
  }

  /**
   * HTTP/3特定的额外初始化
   */
  protected performProtocolSpecificInitialization(): void {
    this.logger.info('HTTP/3 server initialization completed', {}, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      serverId: this.serverId,
      sslMode: this.options.ssl?.mode || 'auto',
      alpnProtocols: this.options.ssl?.alpnProtocols || ['h3'],
      maxIdleTimeout: this.options.quic?.maxIdleTimeout || 30000,
      maxConnections: this.options.connectionPool?.maxConnections
    });
  }

  /**
   * 创建SSL选项
   */
  private createSSLOptions(sslConfig: SSL3Config, extConfig: any): any {
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
  private createAutoSSLOptions(sslConfig: SSL3Config, extConfig: any): any {
    const keyPath = sslConfig.key || extConfig?.key;
    const certPath = sslConfig.cert || extConfig?.cert;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for HTTP/3');
    }
    
    return {
      key: loadCertificate(keyPath, 'private key'),
      cert: loadCertificate(certPath, 'certificate')
    };
  }

  /**
   * 手动SSL配置
   */
  private createManualSSLOptions(sslConfig: SSL3Config, extConfig: any): any {
    const keyPath = sslConfig.key || extConfig?.key;
    const certPath = sslConfig.cert || extConfig?.cert;
    const caPath = sslConfig.ca || extConfig?.ca;
    
    if (!keyPath || !certPath) {
      throw new Error('SSL key and cert are required for manual SSL mode');
    }
    
    const options: any = {
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
  private createMutualTLSOptions(sslConfig: SSL3Config, extConfig: any): any {
    const manualOptions = this.createManualSSLOptions(sslConfig, extConfig);
    
    return {
      ...manualOptions,
      requestCert: sslConfig.requestCert !== false,
      rejectUnauthorized: sslConfig.rejectUnauthorized !== false
    };
  }


  /**
   * 设置会话处理
   * 
   * 注意：实际实现取决于使用的 QUIC 库的 API
   */
  private setupSessionHandling(): void {
    // 当有新的 QUIC 连接（会话）建立时
    this.server.on('session', (session: Http3Session) => {
      this.connectionPool.addHttp3Session(session).catch((error: Error) => {
        this.logger.error('Failed to add HTTP/3 session to pool', {}, error);
        try {
          session.close(1, 'Internal error');
        } catch {
          // Session close error handled silently
        }
      });
    });

    // 处理会话错误
    this.server.on('sessionError', (error: Error, session: any) => {
      this.logger.warn('HTTP/3 session error', {}, {
        error: error.message,
        sessionId: session.id
      });
    });
  }

  /**
   * 设置流处理
   * 
   * 注意：HTTP/3 中每个请求对应一个双向流
   */
  private setupStreamHandling(): void {
    // 处理传入的 HTTP/3 请求
    // 具体实现取决于使用的 QUIC 库如何暴露 HTTP/3 请求
    
    // 示例：假设库提供 'request' 事件
    this.server.on('request', (req: any, res: any) => {
      // 将请求传递给 Koatty 应用处理
      this.app.callback()(req, res);
      
      // 请求指标由连接池自动处理
    });
  }

  protected analyzeConfigChanges(
    changedKeys: (keyof Http3ServerOptions)[],
    oldConfig: Http3ServerOptions,
    newConfig: Http3ServerOptions
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

    // QUIC配置变更
    if (this.hasQUICConfigChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'QUIC protocol configuration changed',
        canApplyRuntime: false
      };
    }

    // HTTP/3配置变更
    if (this.hasHTTP3ConfigChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'HTTP/3 protocol configuration changed',
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
    newConfig: Partial<Http3ServerOptions>,
    traceId: string
  ): void {
    // 处理HTTP/3特定的运行时配置变更
    const http3Config = newConfig as Partial<Http3ServerOptions>;
    
    // 更新连接池配置
    if (http3Config.connectionPool) {
      this.logger.info('Updating HTTP/3 connection pool configuration', { traceId }, {
        oldConfig: this.options.connectionPool,
        newConfig: http3Config.connectionPool
      });
      
      this.connectionPool.updateConfig(this.options.connectionPool);
    }

    this.logger.debug('HTTP/3 runtime configuration changes applied', { traceId });
  }

  protected extractRelevantConfig(config: Http3ServerOptions) {
    return {
      hostname: config.hostname,
      port: config.port,
      protocol: config.protocol,
      sslMode: config.ssl?.mode || 'auto',
      alpnProtocols: config.ssl?.alpnProtocols || ['h3'],
      connectionPool: config.connectionPool ? {
        maxConnections: config.connectionPool.maxConnections,
        maxIdleTimeout: config.connectionPool.protocolSpecific?.maxIdleTimeout,
      } : null,
      quicSettings: config.quic,
      http3Settings: config.http3
    };
  }

  /**
   * 检查SSL配置是否变更
   */
  private hasSSLConfigChanged(oldConfig: Http3ServerOptions, newConfig: Http3ServerOptions): boolean {
    const oldSSL = oldConfig.ssl;
    const newSSL = newConfig.ssl;

    if (!oldSSL && !newSSL) return false;
    if (!oldSSL || !newSSL) return true;

    return (
      oldSSL.mode !== newSSL.mode ||
      oldSSL.key !== newSSL.key ||
      oldSSL.cert !== newSSL.cert ||
      oldSSL.ca !== newSSL.ca ||
      JSON.stringify(oldSSL.alpnProtocols) !== JSON.stringify(newSSL.alpnProtocols)
    );
  }

  /**
   * 检查QUIC配置是否变更
   */
  private hasQUICConfigChanged(oldConfig: Http3ServerOptions, newConfig: Http3ServerOptions): boolean {
    const oldQuic = oldConfig.quic;
    const newQuic = newConfig.quic;

    if (!oldQuic && !newQuic) return false;
    if (!oldQuic || !newQuic) return true;

    return JSON.stringify(oldQuic) !== JSON.stringify(newQuic);
  }

  /**
   * 检查HTTP/3配置是否变更
   */
  private hasHTTP3ConfigChanged(oldConfig: Http3ServerOptions, newConfig: Http3ServerOptions): boolean {
    const oldHttp3 = oldConfig.http3;
    const newHttp3 = newConfig.http3;

    if (!oldHttp3 && !newHttp3) return false;
    if (!oldHttp3 || !newHttp3) return true;

    return JSON.stringify(oldHttp3) !== JSON.stringify(newHttp3);
  }

  /**
   * 检查连接池配置是否变更
   */
  private hasConnectionPoolChanged(oldConfig: Http3ServerOptions, newConfig: Http3ServerOptions): boolean {
    const oldPool = oldConfig.connectionPool;
    const newPool = newConfig.connectionPool;

    if (!oldPool && !newPool) return false;
    if (!oldPool || !newPool) return true;

    return (
      oldPool.maxConnections !== newPool.maxConnections ||
      oldPool.keepAliveTimeout !== newPool.keepAliveTimeout
    );
  }

  // ============= 实现优雅关闭抽象方法 =============

  protected async stopAcceptingNewConnections(traceId: string): Promise<void> {
    this.logger.info('Step 1: Stopping acceptance of new HTTP/3 connections', { traceId });
    
    // 停止QUIC服务器监听
    if (this.server.listening) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    this.logger.debug('New HTTP/3 connection acceptance stopped', { traceId });
  }

  protected async waitForConnectionCompletion(timeout: number, traceId: string): Promise<void> {
    this.logger.info('Step 3: Waiting for existing HTTP/3 sessions to complete', { traceId }, {
      activeSessions: this.getActiveConnectionCount(),
      timeout: timeout
    });

    const startTime = Date.now();
    
    while (this.getActiveConnectionCount() > 0) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        this.logger.warn('HTTP/3 session completion timeout reached', { traceId }, {
          remainingSessions: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
        break;
      }
      
      // 每5秒记录一次进度
      if (elapsed % 5000 < 100) {
        this.logger.debug('Waiting for HTTP/3 sessions to complete', { traceId }, {
          remainingSessions: this.getActiveConnectionCount(),
          elapsed: elapsed
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.debug('HTTP/3 session completion wait finished', { traceId }, {
      remainingSessions: this.getActiveConnectionCount()
    });
  }

  protected async forceCloseRemainingConnections(traceId: string): Promise<void> {
    const remainingConnections = this.getActiveConnectionCount();
    
    if (remainingConnections > 0) {
      this.logger.info('Step 4: Force closing remaining HTTP/3 sessions', { traceId }, {
        remainingSessions: remainingConnections
      });
      
      // 使用连接池强制关闭所有会话
      await this.connectionPool.closeAllConnections(5000);
      
      this.logger.warn('Forced closure of remaining HTTP/3 sessions', { traceId }, {
        forcedSessions: remainingConnections
      });
    } else {
      this.logger.debug('Step 4: No remaining HTTP/3 sessions to close', { traceId });
    }
  }

  protected forceShutdown(traceId: string): void {
    this.logger.warn('Force HTTP/3 server shutdown initiated', { traceId });
    
    // 强制关闭HTTP/3服务器
    this.server.close();
    
    // 停止监控和清理
    this.stopMonitoringAndCleanup(traceId);
  }

  /**
   * 重写停止监控和清理方法
   */
  protected stopMonitoringAndCleanup(traceId: string): void {
    this.logger.info('Step 5: Stopping monitoring and cleanup', { traceId });

    // 调用父类的清理方法（会清理所有TimerManager的定时器）
    super.stopMonitoringAndCleanup(traceId);
  }

  // ============= 实现KoattyServer接口 =============

  Start(listenCallback?: () => void): NativeServer {
    const traceId = generateTraceId();
    this.logger.info('HTTP/3 server starting', { traceId }, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      http3Version: getHttp3Version()
    });

    const startCallback = () => {
      // Remove the error handler added for listen errors
      if (typeof this.server.removeAllListeners === 'function') {
        this.server.removeAllListeners('error');
      }
      if (typeof this.server.on === 'function') {
        this.server.on('error', (error: Error) => {
          this.logger.error('Server runtime error', { traceId }, error);
          // Don't exit on runtime errors
        });
      }
      
      // Record start time
      this.startTime = Date.now();
      
      const protocolUpper = this.options.protocol.toUpperCase();
      const urlProtocol = this.options.protocol.toLowerCase();
      const serverUrl = `${urlProtocol}://${this.options.hostname || '127.0.0.1'}:${this.options.port}/`;
      
      // 输出 Koatty 格式的启动日志
      this.logger.info(`Server: ${protocolUpper} running at ${serverUrl}`, { traceId });
      
      this.logger.info('HTTP/3 server started successfully', { traceId }, {
        address: `${this.options.hostname}:${this.options.port}`,
        hostname: this.options.hostname,
        port: this.options.port,
        protocol: this.options.protocol,
        connectionPoolEnabled: !!this.connectionPool,
        serverId: this.serverId,
        sslMode: this.options.ssl?.mode || 'auto',
        alpnProtocols: this.options.ssl?.alpnProtocols || ['h3'],
        http3Version: getHttp3Version(),
        transport: 'UDP (QUIC)',
        implementation: '@matrixai/quic'
      });
      
      // 启动连接池监控
      this.startConnectionPoolMonitoring();
      
      if (listenCallback) {
        listenCallback();
      }
    };

    // Http3ServerAdapter API: listen(callback) - async
    this.server.listen(startCallback).catch((error: Error) => {
      this.logger.error('Failed to start HTTP/3 server', { traceId }, error);
      // 使用 setImmediate 而不是 nextTick，确保错误处理在当前事件循环完成后执行
      setImmediate(() => {
        throw error;
      });
    });

    return this.server;
  }

  getStatus(): number {
    return this.status;
  }

  getNativeServer(): NativeServer {
    return this.server;
  }

  // ============= HTTP/3特定的方法 =============

  /**
   * 启动连接池监控
   */
  private startConnectionPoolMonitoring(): void {
    this.timerManager.addTimer('http3_connection_monitoring', () => {
      this.getConnectionStats(); // Collect stats but don't log
    }, 30000); // 每30秒
  }

  /**
   * 获取HTTP/3统计信息
   */
  getHttp3Stats() {
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
    this.logger.info('Destroying HTTP/3 server', { traceId });

    try {
      await this.gracefulShutdown();
      this.logger.info('HTTP/3 server destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying HTTP/3 server', { traceId }, error);
      throw error;
    }
  }
}

