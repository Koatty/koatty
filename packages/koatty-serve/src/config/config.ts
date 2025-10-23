/*
 * @Description: configuration
 * @Usage: configuration
 * @Author: richen
 * @Date: 2024-11-27 21:30:00
 * @LastEditTime: 2024-11-27 21:30:00
 */
import * as WS from 'ws';
import { ChannelOptions } from "@grpc/grpc-js";
import { ConnectionPoolConfig, PoolConfigHelper } from "./pool";
import { createLogger } from '../utils/logger';
import fs from 'fs';

// KoattyProtocol
export type KoattyProtocol = 'http' | "https" | 'http2' | 'http3' | 'grpc' | 'ws' | 'wss';

/**
 * 基础SSL配置
 */
export interface BaseSSLConfig {
  enabled?: boolean;
  key?: string;                             // Private key path
  cert?: string;                            // Certificate path
  ca?: string;                              // CA certificate path
  passphrase?: string;                      // Private key passphrase
  ciphers?: string;                         // Allowed cipher suites
  honorCipherOrder?: boolean;               // Honor cipher order
  secureProtocol?: string;                  // SSL/TLS protocol version
}

/**
 * gRPC和WebSocket使用的简单SSL配置
 */
export interface SSLConfig extends BaseSSLConfig {
  clientCertRequired?: boolean;
}

/**
 * HTTPS使用的高级SSL配置
 */
export interface SSL1Config extends BaseSSLConfig {
  mode: 'auto' | 'manual' | 'mutual_tls';  // SSL mode
  requestCert?: boolean;                    // Request client certificate
  rejectUnauthorized?: boolean;             // Reject unauthorized connections
  // 扩展配置选项
  handshakeTimeout?: number;                // TLS handshake timeout
  sessionTimeout?: number;                  // TLS session timeout
  SNICallback?: (servername: string, cb: (err: Error | null, ctx?: any) => void) => void;  // SNI callback
  sessionIdContext?: string;                // Session ID context
  ticketKeys?: Buffer;                      // TLS session ticket keys
  ALPNProtocols?: string[];                 // ALPN protocols
}

/**
 * HTTP/2使用的SSL配置（支持HTTP/1.1降级）
 */
export interface SSL2Config extends SSL1Config {
  allowHTTP1?: boolean;                     // Allow HTTP/1.1 fallback
}

/**
 * HTTP/3使用的SSL配置（基于QUIC，必须使用TLS 1.3）
 */
export interface SSL3Config extends BaseSSLConfig {
  mode: 'auto' | 'manual' | 'mutual_tls';  // SSL mode
  requestCert?: boolean;                    // Request client certificate
  rejectUnauthorized?: boolean;             // Reject unauthorized connections
  // QUIC特定配置
  alpnProtocols?: string[];                 // ALPN protocols (default: ['h3'])
  maxIdleTimeout?: number;                  // Max idle timeout in milliseconds
  initialMaxStreamsBidi?: number;           // Initial max bidirectional streams
  initialMaxStreamsUni?: number;            // Initial max unidirectional streams
}

/**
 * listening options
 *
 * @interface ListeningOptions
 */
export interface ListeningOptions {
  hostname: string;
  port: number;
  protocol: string;
  trace?: boolean; // Full stack debug & trace, default: false
  ssl?: { [key: string]: any; } & BaseSSLConfig;  // SSL配置 (推荐)
  ext?: {    
    protoFile?: string;
    schemaFile?: string;
    [key: string]: any;  // 扩展配置字段（包括内部使用的 _underlyingProtocol、_actualProtocol 等）
  };
  connectionPool?: ConnectionPoolConfig;
}

/**
 * Base Server Options
 *
 * @export
 * @interface BaseServerOptions
 */
export interface BaseServerOptions {
  hostname: string;
  port: number;
  protocol: string;
  trace?: boolean; // Full stack debug & trace, default: false
  connectionPool?: ConnectionPoolConfig;
  ext?: {
    [key: string]: any;  // 扩展配置字段（包括内部使用的 _underlyingProtocol、_actualProtocol 等）
  };
}

/**
 * HTTP Server Options extending base options
 */
export interface HttpServerOptions extends BaseServerOptions {
  connectionPool?: ConnectionPoolConfig;
}

/**
 * Enhanced HTTPS Server Options
 */
export interface HttpsServerOptions extends BaseServerOptions {
  ssl?: SSL1Config;
  connectionPool?: ConnectionPoolConfig;
}

/**
 * Enhanced HTTP/2 Server Options
 */
export interface Http2ServerOptions extends BaseServerOptions {
  ssl?: SSL2Config;
  http2?: {
    maxHeaderListSize?: number;
    maxSessionMemory?: number;
    settings?: {
      headerTableSize?: number;
      enablePush?: boolean;
      maxConcurrentStreams?: number;
      initialWindowSize?: number;
      maxFrameSize?: number;
      maxHeaderListSize?: number;
    };
  };
  connectionPool?: ConnectionPoolConfig;
}

/**
 * HTTP/3 Server Options (QUIC-based)
 */
export interface Http3ServerOptions extends BaseServerOptions {
  ssl?: SSL3Config;  // HTTP/3应该使用TLS（可选以支持配置灵活性）
  http3?: {
    maxHeaderListSize?: number;
    maxFieldSectionSize?: number;
    qpackMaxTableCapacity?: number;
    qpackBlockedStreams?: number;
    settings?: {
      maxHeaderListSize?: number;
      qpackMaxTableCapacity?: number;
      qpackBlockedStreams?: number;
    };
  };
  quic?: {
    maxIdleTimeout?: number;
    maxUdpPayloadSize?: number;
    initialMaxData?: number;
    initialMaxStreamDataBidiLocal?: number;
    initialMaxStreamDataBidiRemote?: number;
    initialMaxStreamDataUni?: number;
    initialMaxStreamsBidi?: number;
    initialMaxStreamsUni?: number;
    ackDelayExponent?: number;
    maxAckDelay?: number;
    disableActiveMigration?: boolean;
  };
  connectionPool?: ConnectionPoolConfig;
}

/**
 * WebSocket Server Options extending base options
 */
export interface WebSocketServerOptions extends BaseServerOptions {
  wsOptions?: WS.ServerOptions;
  ssl?: SSLConfig;
  connectionPool?: ConnectionPoolConfig;
}

/**
 * gRPC Server Options with enhanced configuration
 */
export interface GrpcServerOptions extends BaseServerOptions {
  channelOptions?: ChannelOptions;
  ssl?: SSLConfig;
  connectionPool?: ConnectionPoolConfig;
}

export class ConfigHelper {
  private static logger = createLogger({ module: 'config' });

  static configureSSLForProtocol(protocolType: string,
   options: ListeningOptions, traceId?: string): void {
    const secureProtocols = new Set(["https", "http2", "http3", "wss", "graphql"]);
    if (!secureProtocols.has(protocolType)) {
      return;
    }
    try {
      // 确保 ssl 配置存在
      if (!options.ssl) {
        options.ssl = {};
      }
      
      // 从 ext 配置中读取证书路径(如果存在)
      if (options.ext) {
        if (!options.ssl.key && (options.ext as any).keyFile) {
          options.ssl.key = (options.ext as any).keyFile;
        }
        if (!options.ssl.cert && (options.ext as any).crtFile) {
          options.ssl.cert = (options.ext as any).crtFile;
        }
      }
      
      const keyPath = options.ssl.key || "";
      const crtPath = options.ssl.cert || "";

      // 初始化为禁用
      options.ssl.enabled = false;
      
      if (!keyPath || !crtPath || (!fs.existsSync(keyPath) || !fs.existsSync(crtPath))) {
        options.ssl.enabled = false;
        if (protocolType !== "graphql") {
          const error = new Error(`SSL certificate files not configured for ${protocolType} protocol`);
          this.logger.error('SSL configuration missing', {
            traceId,
            protocol: protocolType
          }, error);
          throw error;
        }
      } else {
        options.ssl.enabled = true;
      }
      
      this.logger.info('SSL certificates loaded successfully', {
        traceId,
        protocol: protocolType
      });
    } catch (error) {
      this.logger.error('Failed to load SSL certificates', {
        traceId,
        protocol: protocolType
      }, error);
      throw error; // Re-throw to prevent server startup with invalid SSL config
    }
  }

  static createHttpConfig(options: ListeningOptions = {
    hostname: 'localhost',
    port: 3000,
    protocol: 'http',
    trace: false,
    ext: {},
    connectionPool: {}
  }): HttpServerOptions {
    if (!options.ext) {
      options.ext = {};
    }
    
    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createHttpConfig();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});
    
    // Preserve all original options including custom fields like _underlyingProtocol
    return {
      ...options,  // Preserve all incoming fields
      connectionPool: poolConfig,
      hostname: options.hostname || 'localhost',
      port: options.port || 3000,
      protocol: options.protocol || 'http',
      trace: options.trace || false
    } as HttpServerOptions;
  }

  static createHttpsConfig(options: any = {
    hostname: 'localhost',
    port: 443,
    protocol: 'https',
    trace: false,
    ext: {},
    connectionPool: {}
  }): HttpsServerOptions {
    if (!options.ext) {
      options.ext = {};
    }
    
    // 向后兼容: 自动迁移 ext.ssl 到 ssl
    if (options.ext.ssl && !options.ssl) {
      this.logger.warn('options.ext.ssl is deprecated, please use options.ssl instead', {
        migration: 'Automatically migrated to options.ssl'
      });
      options.ssl = options.ext.ssl;
    }
    
    // 如果两者都存在, 优先使用 options.ssl
    if (options.ext.ssl && options.ssl) {
      this.logger.warn('Both options.ssl and options.ext.ssl are set, using options.ssl', {
        note: 'options.ext.ssl is ignored'
      });
    }
    
    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createHttpsConfig();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});
    
    // 只使用 options.ssl
    const sslConfig = options.ssl || {};
    
    // Preserve all original options including custom fields
    const config = {
      ...options,  // Preserve all incoming fields
      connectionPool: poolConfig,
      ssl: sslConfig,
      hostname: options.hostname || 'localhost',
      port: options.port || 443,
      protocol: options.protocol || 'https',
      trace: options.trace || false
    }
    if (config.port === 80) {
      config.port = 443;
    }
    return config;
  }

  static createHttp2Config(options: any = {
    hostname: 'localhost',
    port: 443,
    protocol: 'http2',
    trace: false,
    ext: {},
    connectionPool: {}
  }): Http2ServerOptions {
    if (!options.ext) {
      options.ext = {};
    }

    // 向后兼容: 自动迁移 ext.ssl 到 ssl
    if (options.ext.ssl && !options.ssl) {
      this.logger.warn('options.ext.ssl is deprecated, please use options.ssl instead', {
        migration: 'Automatically migrated to options.ssl'
      });
      options.ssl = options.ext.ssl;
    }
    
    // 如果两者都存在, 优先使用 options.ssl
    if (options.ext.ssl && options.ssl) {
      this.logger.warn('Both options.ssl and options.ext.ssl are set, using options.ssl', {
        note: 'options.ext.ssl is ignored'
      });
    }

    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createHttp2Config();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});

    // 只使用 options.ssl
    const sslConfig = options.ssl || {};

    // Preserve all original options including custom fields like _underlyingProtocol
    const config =  {
      ...options,  // Preserve all incoming fields
      connectionPool: poolConfig,
      ssl: sslConfig,
      http2: options.http2 || options.ext.http2 || {},
      hostname: options.hostname || 'localhost',
      port: options.port || 443,
      protocol: options.protocol || 'http2',
      trace: options.trace || false
    }
    if (config.port === 80) {
      config.port = 443;
    }
    return config;
  }

  static createGrpcConfig(options: any = {
    hostname: 'localhost',
    port: 50051,
    protocol: 'grpc',
    trace: false,
    ext: {},
    connectionPool: {}
  }): GrpcServerOptions {
    if (!options.ext) {
      options.ext = {};
    }

    // 向后兼容: 自动迁移 ext.ssl 到 ssl
    if (options.ext.ssl && !options.ssl) {
      this.logger.warn('options.ext.ssl is deprecated, please use options.ssl instead', {
        migration: 'Automatically migrated to options.ssl'
      });
      options.ssl = options.ext.ssl;
    }
    
    // 如果两者都存在, 优先使用 options.ssl
    if (options.ext.ssl && options.ssl) {
      this.logger.warn('Both options.ssl and options.ext.ssl are set, using options.ssl', {
        note: 'options.ext.ssl is ignored'
      });
    }

    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createGrpcConfig();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});

    // 只使用 options.ssl
    const sslConfig = options.ssl || {};

    // Preserve all original options including custom fields
    return {
      ...options,  // Preserve all incoming fields
      channelOptions: options.connectionPool || {},
      ssl: sslConfig,
      connectionPool: poolConfig,
      hostname: options.hostname || 'localhost',
      port: options.port || 50051,
      protocol: options.protocol || 'grpc',
      trace: options.trace || false,
    } as GrpcServerOptions;
  }

  static createHttp3Config(options: any = {
    hostname: 'localhost',
    port: 443,
    protocol: 'http3',
    trace: false,
    ext: {},
    connectionPool: {}
  }): Http3ServerOptions {
    if (!options.ext) {
      options.ext = {};
    }
    
    // 向后兼容: 自动迁移 ext.ssl 到 ssl
    if (options.ext.ssl && !options.ssl) {
      this.logger.warn('options.ext.ssl is deprecated, please use options.ssl instead', {
        migration: 'Automatically migrated to options.ssl'
      });
      options.ssl = options.ext.ssl;
    }
    
    // 如果两者都存在, 优先使用 options.ssl
    if (options.ext.ssl && options.ssl) {
      this.logger.warn('Both options.ssl and options.ext.ssl are set, using options.ssl', {
        note: 'options.ext.ssl is ignored'
      });
    }
    
    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createHttp3Config();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});
    
    // 只使用 options.ssl
    const sslConfig = options.ssl || {};
    
    // Preserve all original options including custom fields
    const config =  {
      ...options,  // Preserve all incoming fields
      connectionPool: poolConfig,
      ssl: sslConfig,
      http3: options.http3 || options.ext.http3 || {},
      quic: options.quic || options.ext.quic || {},
      hostname: options.hostname || 'localhost',
      port: options.port || 443,
      protocol: options.protocol || 'http3',
      trace: options.trace || false
    }
    if (config.port === 80) {
      config.port = 443;
    }
    return config;
  }

  static createWebSocketConfig(options: any = {
    hostname: 'localhost',
    port: 8080,
    protocol: 'ws',
    trace: false,
    ext: {},
    connectionPool: {}
  }): WebSocketServerOptions {
    if (!options.ext) {
      options.ext = {};
    }
    
    // 向后兼容: 自动迁移 ext.ssl 到 ssl
    if (options.ext.ssl && !options.ssl) {
      this.logger.warn('options.ext.ssl is deprecated, please use options.ssl instead', {
        migration: 'Automatically migrated to options.ssl'
      });
      options.ssl = options.ext.ssl;
    }
    
    // 如果两者都存在, 优先使用 options.ssl
    if (options.ext.ssl && options.ssl) {
      this.logger.warn('Both options.ssl and options.ext.ssl are set, using options.ssl', {
        note: 'options.ext.ssl is ignored'
      });
    }
    
    // 使用 PoolConfigHelper 创建默认连接池配置
    const defaultPoolConfig = PoolConfigHelper.createWebSocketConfig();
    const poolConfig = PoolConfigHelper.mergeConfigs(defaultPoolConfig, options.connectionPool || {});
    
    // 只使用 options.ssl
    const sslConfig = options.ssl || {};
    
    // Preserve all original options including custom fields
    return {
      ...options,  // Preserve all incoming fields
      wsOptions: options.wsOptions || options.ext.wsOptions || {},
      ssl: sslConfig,
      connectionPool: poolConfig,
      hostname: options.hostname || 'localhost',
      port: options.port || 8080,
      protocol: options.protocol || 'ws',
      trace: options.trace || false
    } as WebSocketServerOptions;
  }
}
