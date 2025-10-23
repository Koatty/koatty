/*
 * @Description: gRPC Server implementation using template method pattern
 * @Usage: 
 * @Author: richen
 * @Date: 2021-11-09 17:03:50
 * @LastEditTime: 2025-01-14
 * 
 * Note: gRPC's graceful shutdown uses tryShutdown() which:
 * 1. Stops accepting new connections immediately
 * 2. Waits for all active RPCs to complete
 * 3. Cannot be interrupted once started
 * 
 * This means the graceful shutdown process is mostly handled by gRPC itself.
 */
import {
  ChannelOptions, Server, ServerCredentials,
  ServiceDefinition, UntypedHandleCall
} from "@grpc/grpc-js";
import { KoattyApplication, NativeServer } from "koatty_core";
import { BaseServer, ConfigChangeAnalysis, ConnectionStats } from "./base";
import { generateTraceId } from "../utils/logger";
import { CreateTerminus } from "../utils/terminus";
import { loadCertificate } from "../utils/cert-loader";
import { HealthStatus } from "./base";
import { ConfigHelper, GrpcServerOptions, ListeningOptions } from "../config/config";
import { GrpcConnectionPoolManager } from "../pools/factory";

/**
 * ServiceImplementation
 *
 * @interface ServiceImplementation
 */
interface ServiceImplementation {
  service: ServiceDefinition;
  implementation: Implementation;
}

/**
 * Implementation
 *
 * @interface Implementation
 */
interface Implementation {
  [methodName: string]: UntypedHandleCall;
}

export class GrpcServer extends BaseServer<GrpcServerOptions> {
  readonly server: Server;
  protected connectionPool: GrpcConnectionPoolManager;
  options: GrpcServerOptions;

  constructor(app: KoattyApplication, options: GrpcServerOptions) {
    super(app, options);
    this.options = ConfigHelper.createGrpcConfig(options);
    CreateTerminus(app, this);
  }


  /**
   * 初始化gRPC连接池
   */
  protected initializeConnectionPool(): void {
    this.connectionPool = new GrpcConnectionPoolManager(this.options.connectionPool);
  }

  /**
   * 创建gRPC服务器实例
   */
  protected createProtocolServer(): void {
    const opts = this.options as GrpcServerOptions;
    
    // Enhanced channel options with connection pooling
    const channelOptions: ChannelOptions = {
      ...opts.channelOptions,
      // Connection pool configuration
      'grpc.keepalive_time_ms': opts.connectionPool?.protocolSpecific?.keepAliveTime || 30000,
      'grpc.keepalive_timeout_ms': opts.connectionPool?.keepAliveTimeout || 5000,
      'grpc.keepalive_permit_without_calls': 1,
      'grpc.max_receive_message_length': opts.connectionPool?.protocolSpecific?.maxReceiveMessageLength || 4 * 1024 * 1024,
      'grpc.max_send_message_length': opts.connectionPool?.protocolSpecific?.maxSendMessageLength || 4 * 1024 * 1024,
      'grpc.max_connection_idle_ms': 300000, // 5 minutes
      'grpc.max_connection_age_ms': 3600000, // 1 hour
      'grpc.max_connection_age_grace_ms': 30000, // 30 seconds
    };
    
    (this as any).server = new Server(channelOptions);
  }

  /**
   * 配置gRPC服务器选项
   */
  protected configureServerOptions(): void {
    // gRPC服务器配置在createProtocolServer中完成
  }

  /**
   * gRPC特定的额外初始化
   */
  protected performProtocolSpecificInitialization(): void {
    this.logger.debug('gRPC server initialization completed', {}, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol,
      serverId: this.serverId,
      sslEnabled: this.options.ssl?.enabled || false,
      maxConnections: this.options.connectionPool?.maxConnections
    });
  }

  // ============= 实现 BaseServer 抽象方法 =============

  protected analyzeConfigChanges(
    changedKeys: (keyof GrpcServerOptions)[],
    oldConfig: GrpcServerOptions,
    newConfig: GrpcServerOptions
  ): ConfigChangeAnalysis {
    // Critical changes that require restart
    const criticalKeys: (keyof GrpcServerOptions)[] = ['hostname', 'port', 'protocol'];
    
    if (changedKeys.some(key => criticalKeys.includes(key))) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'Critical network configuration changed',
        canApplyRuntime: false
      };
    }

    // SSL configuration changes
    if (this.hasSSLConfigChanged(oldConfig, newConfig)) {
      return {
        requiresRestart: true,
        changedKeys: changedKeys as string[],
        restartReason: 'SSL/TLS configuration changed',
        canApplyRuntime: false
      };
    }

    // Channel options changes (affects gRPC server creation)
    if (this.hasChannelOptionsChanged(oldConfig, newConfig)) {
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

  protected applyConfigChanges(
    changedKeys: (keyof GrpcServerOptions)[],
    newConfig: Partial<GrpcServerOptions>
  ): void {
    // This is now handled by the base class's restart logic
    this.options = { ...this.options, ...newConfig };
  }

  protected onRuntimeConfigChange(
    analysis: ConfigChangeAnalysis,
    newConfig: Partial<ListeningOptions>,
    traceId: string
  ): void {
    // Handle gRPC-specific runtime changes
    const grpcConfig = newConfig as Partial<GrpcServerOptions>;
    if (grpcConfig.connectionPool?.maxConnections) {
      this.logger.info('Updating connection pool limits', { traceId }, {
        oldLimit: 'current',
        newLimit: grpcConfig.connectionPool.maxConnections
      });
      // Note: This would require additional implementation to actually enforce limits
    }

    // Runtime configuration changes applied
  }

  protected extractRelevantConfig(config: GrpcServerOptions) {
    return {
      hostname: config.hostname,
      port: config.port,
      protocol: config.protocol,
      sslEnabled: config.ssl?.enabled || false,
      connectionPool: config.connectionPool ? {
        maxConnections: config.connectionPool.maxConnections,
        keepAliveTime: config.connectionPool.protocolSpecific?.keepAliveTime,
        keepAliveTimeout: config.connectionPool.keepAliveTimeout
      } : null
    };
  }

  protected async stopAcceptingNewConnections(traceId: string): Promise<void> {
    this.logger.info('Step 1: Initiating gRPC graceful shutdown', { traceId });
    
    // gRPC 使用 tryShutdown 实现优雅关闭
    // tryShutdown 会:
    // 1. 停止接受新连接
    // 2. 等待现有 RPC 调用完成
    // 注意: 这会在这一步就等待所有连接完成,所以后续步骤会很快
    await new Promise<void>((resolve, reject) => {
      this.server.tryShutdown((err) => {
        if (err) {
          this.logger.error('gRPC tryShutdown failed', { traceId }, err);
          reject(err);
        } else {
          this.logger.info('gRPC tryShutdown completed', { traceId });
          resolve();
        }
      });
    });
    
    this.logger.debug('gRPC server graceful shutdown initiated', { traceId });
  }

  protected async waitForConnectionCompletion(timeout: number, traceId: string): Promise<void> {
    this.logger.info('Step 3: Checking for remaining connections', { traceId }, {
      activeConnections: this.connectionPool.getActiveConnectionCount(),
      timeout: timeout,
      note: 'tryShutdown should have already waited for connections'
    });

    const startTime = Date.now();
    
    while (this.connectionPool.getActiveConnectionCount() > 0) {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= timeout) {
        this.logger.warn('Connection completion timeout reached (unexpected)', { traceId }, {
          remainingConnections: this.connectionPool.getActiveConnectionCount(),
          elapsed: elapsed
        });
        break;
      }
      
      // Log progress every 5 seconds
      if (elapsed % 5000 < 100) {
        this.logger.debug('Waiting for connections to complete', { traceId }, {
          remainingConnections: this.connectionPool.getActiveConnectionCount(),
          elapsed: elapsed
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.debug('Connection completion wait finished', { traceId }, {
      remainingConnections: this.connectionPool.getActiveConnectionCount()
    });
  }

  protected async forceCloseRemainingConnections(traceId: string): Promise<void> {
    const remainingConnections = this.connectionPool.getActiveConnectionCount();
    
    if (remainingConnections > 0) {
      this.logger.info('Step 4: Force closing remaining connections', { traceId }, {
        remainingConnections
      });
      
      // Use connection pool to close all connections
      await this.connectionPool.closeAllConnections(5000);
      
      this.logger.warn('Forced closure of remaining connections', { traceId }, {
        forcedConnections: remainingConnections
      });
    } else {
      this.logger.debug('Step 4: No remaining connections to close', { traceId });
    }
  }

  protected stopMonitoringAndCleanup(traceId: string): void {
    this.logger.info('Step 5: Stopping monitoring and cleanup', { traceId });
    
    // Stop all timers using TimerManager
    this.timerManager.destroy();
    
    // Log final connection statistics
    const finalStats = this.connectionPool.getMetrics();
    this.logger.info('Final connection statistics', { traceId }, finalStats);
    
    this.logger.debug('Monitoring stopped and cleanup completed', { traceId });
  }

  protected forceShutdown(traceId: string): void {
    this.logger.warn('Force shutdown initiated', { traceId });
    this.server.forceShutdown();
    this.stopMonitoringAndCleanup(traceId);
  }

  protected getActiveConnectionCount(): number {
    return this.connectionPool.getActiveConnectionCount();
  }

  // ============= 实现健康检查和指标收集 =============

  protected async performProtocolHealthChecks(): Promise<Record<string, any>> {
    const checks: Record<string, any> = {};
    
    // gRPC server specific health checks
    checks.server = {
      status: HealthStatus.HEALTHY,
      message: 'gRPC server is running',
      details: {
        serverId: this.serverId,
        protocol: this.options.protocol
      }
    };

    // Connection pool health check
    const poolHealth = this.connectionPool.getHealth();
    checks.connectionPool = {
      status: poolHealth.status === 'healthy' 
        ? HealthStatus.HEALTHY 
        : poolHealth.status === 'degraded' 
          ? HealthStatus.DEGRADED 
          : HealthStatus.OVERLOADED,
      message: poolHealth.message,
      details: poolHealth
    };

    // SSL configuration health check
    if (this.options.ssl?.enabled) {
      checks.ssl = {
        status: HealthStatus.HEALTHY,
        message: 'SSL/TLS is enabled',
        details: {
          keyFile: !!this.options.ssl.key,
          certFile: !!this.options.ssl.cert,
          caFile: !!this.options.ssl.ca,
          clientCertRequired: this.options.ssl.clientCertRequired
        }
      };
    }

    // Channel options health check
    const channelOptions = this.options.channelOptions;
    if (channelOptions) {
      checks.channelOptions = {
        status: HealthStatus.HEALTHY,
        message: 'Channel options configured',
        details: {
          keepAliveTime: channelOptions['grpc.keepalive_time_ms'],
          keepAliveTimeout: channelOptions['grpc.keepalive_timeout_ms'],
          maxReceiveMessageLength: channelOptions['grpc.max_receive_message_length'],
          maxSendMessageLength: channelOptions['grpc.max_send_message_length']
        }
      };
    }
    
    return checks;
  }

  protected collectProtocolMetrics(): Record<string, any> {
    const poolMetrics = this.connectionPool.getMetrics();
    const poolConfig = this.options.connectionPool;
    
    return {
      protocol: 'grpc',
      server: {
        serverId: this.serverId,
        ssl: this.options.ssl?.enabled || false
      },
      connectionPool: {
        enabled: !!poolConfig,
        ...poolMetrics,
        configuration: poolConfig
      },
      channelOptions: this.options.channelOptions || {}
    };
  }

  // ============= gRPC 特有的辅助方法 =============

  private hasSSLConfigChanged(oldConfig: GrpcServerOptions, newConfig: GrpcServerOptions): boolean {
    const oldSSL = oldConfig.ssl;
    const newSSL = newConfig.ssl;

    if (!oldSSL && !newSSL) return false;
    if (!oldSSL || !newSSL) return true;

    return (
      oldSSL.enabled !== newSSL.enabled ||
      oldSSL.key !== newSSL.key ||
      oldSSL.cert !== newSSL.cert ||
      oldSSL.ca !== newSSL.ca ||
      oldSSL.clientCertRequired !== newSSL.clientCertRequired
    );
  }

  private hasChannelOptionsChanged(oldConfig: GrpcServerOptions, newConfig: GrpcServerOptions): boolean {
    const oldPool = oldConfig.connectionPool;
    const newPool = newConfig.connectionPool;

    if (!oldPool && !newPool) return false;
    if (!oldPool || !newPool) return true;

    return (
      oldPool.protocolSpecific?.keepAliveTime !== newPool.protocolSpecific?.keepAliveTime ||
      oldPool.protocolSpecific?.maxReceiveMessageLength !== newPool.protocolSpecific?.maxReceiveMessageLength ||
      oldPool.protocolSpecific?.maxSendMessageLength !== newPool.protocolSpecific?.maxSendMessageLength
    );
  }

  // ============= 原有的 gRPC 功能方法 =============

  /**
   * Create SSL credentials from configuration
   * @private
   */
  private createSSLCredentials(): ServerCredentials {
    const traceId = generateTraceId();
    const opts = this.options as GrpcServerOptions;
    
    // 如果没有SSL配置、SSL被显式禁用、或SSL配置为空对象,使用不安全凭证
    const hasSSLConfig = opts.ssl && (opts.ssl.key || opts.ssl.cert || opts.ssl.ca || opts.ssl.enabled === true);
    
    if (!hasSSLConfig) {
      if (!opts.ssl || Object.keys(opts.ssl).length === 0) {
        this.logger.info('No SSL configuration provided, using insecure credentials', { traceId });
      } else {
        this.logger.warn('SSL explicitly disabled, using insecure credentials', { traceId });
      }
      return ServerCredentials.createInsecure();
    }

    // 如果 SSL 配置存在但未显式禁用,尝试加载证书
    try {
      let rootCerts: Buffer | null = null;
      const keyCertPairs: Array<{ private_key: Buffer; cert_chain: Buffer }> = [];

      // Load CA certificate if provided
      if (opts.ssl?.ca) {
        const caContent = loadCertificate(opts.ssl.ca, 'CA certificate', traceId);
        rootCerts = Buffer.from(caContent, 'utf8');
        this.logger.info('CA certificate loaded successfully', { traceId });
      }

      // Load server key and certificate
      const keyPath = opts.ssl?.key;
      const certPath = opts.ssl?.cert;

      if (!keyPath || !certPath) {
        const error = new Error('SSL enabled but key or cert file path not provided');
        this.logger.error('SSL configuration incomplete', { traceId }, {
          hasKey: !!keyPath,
          hasCert: !!certPath
        });
        throw error;
      }

      const keyContent = loadCertificate(keyPath, 'private key', traceId);
      const certContent = loadCertificate(certPath, 'certificate', traceId);

      const privateKey = Buffer.from(keyContent, 'utf8');
      const certChain = Buffer.from(certContent, 'utf8');

      keyCertPairs.push({
        private_key: privateKey,
        cert_chain: certChain
      });

      this.logger.info('SSL certificates loaded successfully', { traceId }, {
        clientCertRequired: opts.ssl.clientCertRequired || false
      });

      const checkClientCertificate = opts.ssl.clientCertRequired ? true : false;

      return ServerCredentials.createSsl(
        rootCerts,
        keyCertPairs,
        checkClientCertificate
      );

    } catch (error) {
      // 不再降级到不安全模式,直接抛出错误
      this.logger.error('Failed to create SSL credentials', { traceId }, error);
      throw new Error(
        `SSL credentials creation failed: ${(error as Error).message}. ` +
        `To use insecure mode, explicitly set ssl.enabled = false`
      );
    }
  }

  /**
   * Start Server with enhanced connection management
   */
  Start(listenCallback?: () => void): NativeServer {
    const traceId = generateTraceId();
    this.logger.info('Server starting', { traceId }, {
      hostname: this.options.hostname,
      port: this.options.port,
      protocol: this.options.protocol
    });

    const finalCallback = listenCallback || this.listenCallback;
    const credentials = this.createSSLCredentials();
    
    const bindAddress = `${this.options.hostname}:${this.options.port}`;
    
    this.server.bindAsync(bindAddress, credentials, (err, port) => {
      if (err) {
        this.logger.error('Server startup error', { traceId }, err);
        // 使用 setImmediate 而不是 nextTick，确保错误处理在当前事件循环完成后执行
        setImmediate(() => {
          throw err;
        });
        return;
      }
      
      // 添加运行时错误监听器（gRPC服务器启动成功后）
      // gRPC Server 内部继承自 EventEmitter，使用类型断言
      if (typeof (this.server as any).on === 'function') {
        (this.server as any).on('error', (error: Error) => {
          this.logger.error('Server runtime error', { traceId }, error);
          // Don't exit on runtime errors
        });
      }
      
      // Record start time
      this.startTime = Date.now();
      
      const protocolUpper = this.options.protocol.toUpperCase();
      const urlProtocol = this.options.protocol.toLowerCase();
      const serverUrl = `${urlProtocol}://${this.options.hostname || '127.0.0.1'}:${port}/`;
      
      // 输出 Koatty 格式的启动日志
      this.logger.info(`Server: ${protocolUpper} running at ${serverUrl}`, { traceId });
      
      this.logger.info('Server started', { traceId }, {
        address: bindAddress,
        actualPort: port,
        hostname: this.options.hostname,
        port: this.options.port,
        protocol: this.options.protocol,
        sslEnabled: (this.options as GrpcServerOptions).ssl?.enabled || false,
        connectionPoolEnabled: true
      });
      
      // Start connection monitoring
      this.startConnectionMonitoring();
      
      if (finalCallback) {
        finalCallback();
      }
    });

    return this.server;
  }

  /**
   * Start connection monitoring and statistics collection
   * @private
   */
  private startConnectionMonitoring() {
    // Connection pool monitoring enabled (statistics collected silently)
    this.timerManager.addTimer('grpc_connection_monitoring', () => {
      this.connectionPool.getMetrics(); // Collect stats but don't log
    }, 30000); // Every 30 seconds
  }

  /**
   * Register Service with enhanced logging and monitoring
   */
  RegisterService(impl: ServiceImplementation) {
    const traceId = generateTraceId();
    this.logger.debug('Registering gRPC service', { traceId }, {
      serviceName: impl.service.serviceName || 'Unknown',
      methods: Object.keys(impl.implementation)
    });
    
    // Wrap implementation methods for monitoring
    const wrappedImplementation: Implementation = {};
    
    this.logger.debug('[GRPC_SERVER] Building wrapped implementation', { traceId }, {
      methodCount: Object.keys(impl.implementation).length,
      methods: Object.keys(impl.implementation)
    });
    
    for (const [methodName, handler] of Object.entries(impl.implementation)) {
      this.logger.debug('[GRPC_SERVER] Wrapping method', { traceId }, {
        methodName,
        hasHandler: !!handler,
        handlerType: typeof handler
      });
      
      wrappedImplementation[methodName] = async (call: any, callback: any) => {
        this.logger.debug('[GRPC_SERVER] ⚡ Wrapped method called!', {}, {
          methodName,
          hasPeer: !!(call && call.getPeer)
        });
        
        const connectionId = `grpc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const methodTraceId = generateTraceId();
        const startTime = Date.now();

        // Add connection to manager using the new API
        const peer = call.getPeer ? call.getPeer() : 'unknown';
        const callMetadata = {
          connectionId,
          serviceName: impl.service.serviceName,
          methodName,
          peer
        };
        
        this.connectionPool.addGrpcConnection(peer, callMetadata).catch((error: any) => {
          this.logger.error('Failed to add gRPC connection to pool', {}, error);
        });

        // Log method call start
        this.logger.debug('gRPC method call started', { traceId: methodTraceId, connectionId }, {
          serviceName: impl.service.serviceName,
          methodName,
          peer
        });

        // Wrap callback for monitoring with duplicate call protection
        let callbackCalled = false;
        let timeoutId: NodeJS.Timeout | null = null;

        const wrappedCallback = (err: any, response: any) => {
          if (callbackCalled) {
            this.logger.warn('Callback called multiple times (ignored)', { 
              traceId: methodTraceId, 
              connectionId 
            }, {
              serviceName: impl.service.serviceName,
              methodName
            });
            return;
          }
          callbackCalled = true;

          // Clear timeout if exists
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          const duration = Date.now() - startTime;

          if (err) {
            this.logger.error('gRPC method error', { traceId: methodTraceId, connectionId }, {
              serviceName: impl.service.serviceName,
              methodName,
              duration,
              errorCode: err.code,
              errorMessage: err.message || String(err),
              error: err
            });
            
            // Ensure error follows gRPC format
            const grpcError = typeof err === 'object' && err !== null && 'code' in err 
              ? err 
              : {
                  code: 13, // INTERNAL
                  message: err instanceof Error ? err.message : String(err),
                  details: err
                };
            
            if (callback) callback(grpcError, null);
          } else {
            // Validate response
            const hasResponse = response !== undefined && response !== null;
            const responseInfo: any = {
              serviceName: impl.service.serviceName,
              methodName,
              duration,
              hasResponse,
              responseType: typeof response
            };

            if (hasResponse && typeof response === 'object') {
              responseInfo.responseKeys = Object.keys(response);
            }

            this.logger.debug('gRPC method success', { traceId: methodTraceId, connectionId }, responseInfo);
            
            // Note: Connection cleanup is handled automatically by the pool
            
            if (callback) callback(null, response);
          }
        };

        // Set timeout to detect callback not being called
        const timeoutMs = 30000; // 30 seconds
        this.logger.debug('[GRPC_SERVER] Setting up timeout', { traceId: methodTraceId, connectionId }, {
          timeoutMs
        });
        
        timeoutId = setTimeout(() => {
          if (!callbackCalled) {
            callbackCalled = true;
            const duration = Date.now() - startTime;
            
            this.logger.error('gRPC method timeout - callback not called', {
              traceId: methodTraceId,
              connectionId
            }, {
              serviceName: impl.service.serviceName,
              methodName,
              duration,
              timeout: timeoutMs
            });
            
            // Return timeout error
            if (callback) {
              callback({
                code: 4, // DEADLINE_EXCEEDED
                message: `Method execution timeout after ${timeoutMs}ms`
              }, null);
            }
          }
        }, timeoutMs);

        this.logger.debug('[GRPC_SERVER] About to call app.callback("grpc")', { traceId: methodTraceId, connectionId });
        
        // Get the grpc middleware handler from app.callback
        // This creates context and executes middleware chain (including gRPC router middleware)
        // app.callback returns a function: (req, res) => {...}
        // For gRPC: req = call, res = wrappedCallback
        const grpcMiddlewareHandler = this.app.callback("grpc");
        
        // Execute the middleware handler
        try {
          this.logger.debug('[GRPC_SERVER] Calling app.callback("grpc") middleware handler', { traceId: methodTraceId, connectionId }, {
            methodName
          });
          
          // Execute middleware chain
          // The gRPC router middleware will:
          // 1. Check ctx.protocol === 'grpc'
          // 2. Find matching controller based on ctx.rpc (call object)
          // 3. Execute controller method
          // 4. Set result to ctx.body
          // 5. wrappedCallback will be called automatically with ctx.body
          await grpcMiddlewareHandler(call, wrappedCallback);
          
          this.logger.debug('[GRPC_SERVER] app.callback middleware handler completed', { traceId: methodTraceId, connectionId });
        } catch (error) {
          // Clear timeout on immediate error
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          const duration = Date.now() - startTime;
          
          this.logger.error('gRPC method handler error (exception)', { 
            traceId: methodTraceId, 
            connectionId 
          }, {
            serviceName: impl.service.serviceName,
            methodName,
            duration,
            error
          });
          
          // Note: Connection error handling is managed by the pool
          
          // Ensure callback is called with proper gRPC error format
          if (!callbackCalled) {
            callbackCalled = true;
            const grpcError = {
              code: 13, // INTERNAL
              message: error instanceof Error ? error.message : 'Internal server error',
              details: error
            };
            if (callback) callback(grpcError, null);
          }
        }
      };
    }
    
    this.logger.debug('[GRPC_SERVER] About to call server.addService', { traceId }, {
      serviceName: impl.service.serviceName,
      wrappedMethodCount: Object.keys(wrappedImplementation).length,
      wrappedMethods: Object.keys(wrappedImplementation),
      serviceType: typeof impl.service,
      hasServiceDefinition: !!impl.service
    });
    
    this.server.addService(impl.service, wrappedImplementation);
    
    this.logger.debug('gRPC service registered successfully', { traceId }, {
      serviceName: impl.service.serviceName || 'Unknown'
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
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
   * Get connection pool health
   */
  getConnectionPoolHealth() {
    return this.connectionPool.getHealth();
  }

  /**
   * Get connection pool metrics
   */
  getConnectionPoolMetrics() {
    return this.connectionPool.getMetrics();
  }

  /**
   * Get status
   */
  getStatus(): number {
    return this.status;
  }

  /**
   * Get native server
   */
  getNativeServer(): NativeServer {
    return this.server;
  }

  // ============= gRPC特定的私有方法 =============

  /**
   * 销毁服务器
   */
  async destroy(): Promise<void> {
    const traceId = generateTraceId();
    this.logger.info('Destroying gRPC server', { traceId });

    try {
      await this.gracefulShutdown();
      this.logger.info('gRPC server destroyed successfully', { traceId });
    } catch (error) {
      this.logger.error('Error destroying gRPC server', { traceId }, error);
      throw error;
    }
  }
}
