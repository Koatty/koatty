/*
 * @Description: 连接池配置助手
 * @Usage: 提供各协议的连接池配置生成器
 * @Author: richen
 * @Date: 2024-11-27 22:30:00
 * @LastEditTime: 2024-11-27 22:30:00
 */

/**
 * 统一连接池配置接口
 */
export interface ConnectionPoolConfig {
  connectionTimeout?: number;      // 连接超时时间 (毫秒)
  maxConnections?: number;      // 最大连接数限制
  maxSessionMemory?: number;    // 最大会话内存
  maxHeaderListSize?: number;   // 最大头部列表大小
  keepAliveTimeout?: number;    // Keep-Alive 超时
  headersTimeout?: number;      // 头部超时
  requestTimeout?: number;      // 请求超时

  pingInterval?: number;        // Ping间隔时间
  pongTimeout?: number;         // Pong超时时间
  heartbeatInterval?: number;   // 心跳间隔时间

  // 协议特定配置
  protocolSpecific?: {
    // HTTP/2 特定
    maxSessionMemory?: number;
    maxHeaderListSize?: number;

    // HTTP/3 (QUIC) 特定
    maxIdleTimeout?: number;
    maxUdpPayloadSize?: number;
    initialMaxStreamsBidi?: number;
    initialMaxStreamsUni?: number;

    // gRPC 特定
    maxReceiveMessageLength?: number;
    maxSendMessageLength?: number;
    keepAliveTime?: number;

    // WebSocket 特定
    pingInterval?: number;
    pongTimeout?: number;
    heartbeatInterval?: number;
  };
}

/**
 * 连接池配置助手类
 */
export class PoolConfigHelper {
  /**
   * 创建HTTP连接池配置
   */
  static createHttpConfig(options: {
    maxConnections?: number;
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
    connectionTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      keepAliveTimeout: options.keepAliveTimeout || 5000,
      requestTimeout: options.requestTimeout || 30000,
      headersTimeout: options.headersTimeout || 10000
    };
  }

  /**
   * 创建HTTPS连接池配置
   */
  static createHttpsConfig(options: {
    maxConnections?: number;
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
    connectionTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      keepAliveTimeout: options.keepAliveTimeout || 5000,
      requestTimeout: options.requestTimeout || 30000,
      headersTimeout: options.headersTimeout || 10000
    };
  }

  /**
   * 创建WebSocket连接池配置
   */
  static createWebSocketConfig(options: {
    maxConnections?: number;
    pingInterval?: number;
    pongTimeout?: number;
    heartbeatInterval?: number;
    connectionTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      protocolSpecific: {
        pingInterval: options.pingInterval || 30000,
        pongTimeout: options.pongTimeout || 5000,
        heartbeatInterval: options.heartbeatInterval || 60000
      }
    };
  }

  /**
   * 创建HTTP/2连接池配置
   */
  static createHttp2Config(options: {
    maxConnections?: number;
    maxSessionMemory?: number;
    maxHeaderListSize?: number;
    keepAliveTime?: number;
    connectionTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      protocolSpecific: {
        maxSessionMemory: options.maxSessionMemory || 10 * 1024 * 1024, // 10MB
        maxHeaderListSize: options.maxHeaderListSize || 8192,
        keepAliveTime: options.keepAliveTime || 30000
      }
    };
  }

  /**
   * 创建HTTP/3连接池配置
   */
  static createHttp3Config(options: {
    maxConnections?: number;
    maxIdleTimeout?: number;
    maxUdpPayloadSize?: number;
    initialMaxStreamsBidi?: number;
    initialMaxStreamsUni?: number;
    connectionTimeout?: number;
    keepAliveTimeout?: number;
    requestTimeout?: number;
    headersTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      keepAliveTimeout: options.keepAliveTimeout,
      requestTimeout: options.requestTimeout,
      headersTimeout: options.headersTimeout,
      protocolSpecific: {
        maxIdleTimeout: options.maxIdleTimeout || 30000,
        maxUdpPayloadSize: options.maxUdpPayloadSize || 65527,
        initialMaxStreamsBidi: options.initialMaxStreamsBidi || 100,
        initialMaxStreamsUni: options.initialMaxStreamsUni || 100
      }
    };
  }

  /**
   * 创建gRPC连接池配置
   */
  static createGrpcConfig(options: {
    maxConnections?: number;
    maxReceiveMessageLength?: number;
    maxSendMessageLength?: number;
    keepAliveTime?: number;
    connectionTimeout?: number;
    callTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      requestTimeout: options.callTimeout || 30000,
      protocolSpecific: {
        maxReceiveMessageLength: options.maxReceiveMessageLength || 4 * 1024 * 1024, // 4MB
        maxSendMessageLength: options.maxSendMessageLength || 4 * 1024 * 1024, // 4MB
        keepAliveTime: options.keepAliveTime || 30000
      }
    };
  }

  /**
   * 创建基础配置（通用）
   */
  static createBaseConfig(options: {
    maxConnections?: number;
    connectionTimeout?: number;
    requestTimeout?: number;
    keepAliveTimeout?: number;
  } = {}): ConnectionPoolConfig {
    return {
      maxConnections: options.maxConnections || 1000,
      connectionTimeout: options.connectionTimeout || 30000,
      requestTimeout: options.requestTimeout || 30000,
      keepAliveTimeout: options.keepAliveTimeout || 5000
    };
  }

  /**
   * 验证配置参数
   */
  static validateConfig(config: ConnectionPoolConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.maxConnections !== undefined && config.maxConnections <= 0) {
      errors.push('maxConnections must be positive');
    }

    if (config.connectionTimeout !== undefined && config.connectionTimeout <= 0) {
      errors.push('connectionTimeout must be positive');
    }

    if (config.requestTimeout !== undefined && config.requestTimeout <= 0) {
      errors.push('requestTimeout must be positive');
    }

    if (config.keepAliveTimeout !== undefined && config.keepAliveTimeout <= 0) {
      errors.push('keepAliveTimeout must be positive');
    }

    if (config.headersTimeout !== undefined && config.headersTimeout <= 0) {
      errors.push('headersTimeout must be positive');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 合并配置
   */
  static mergeConfigs(base: ConnectionPoolConfig, override: Partial<ConnectionPoolConfig>): ConnectionPoolConfig {
    return {
      ...base,
      ...override,
      protocolSpecific: {
        ...base.protocolSpecific,
        ...override.protocolSpecific
      }
    };
  }

  /**
   * 根据协议名称创建默认配置
   */
  static createDefaultConfig(protocol: string): ConnectionPoolConfig {
    switch (protocol.toLowerCase()) {
      case 'http':
        return this.createHttpConfig();
      case 'https':
        return this.createHttpsConfig();
      case 'websocket':
      case 'ws':
      case 'wss':
        return this.createWebSocketConfig();
      case 'http2':
        return this.createHttp2Config();
      case 'http3':
        return this.createHttp3Config();
      case 'grpc':
        return this.createGrpcConfig();
      default:
        return this.createBaseConfig();
    }
  }

  /**
   * 获取协议特定的配置键
   */
  static getProtocolSpecificKeys(protocol: string): string[] {
    switch (protocol.toLowerCase()) {
      case 'http':
      case 'https':
        return ['keepAliveTimeout', 'headersTimeout', 'requestTimeout'];
      case 'websocket':
      case 'ws':
      case 'wss':
        return ['pingInterval', 'pongTimeout', 'heartbeatInterval'];
      case 'http2':
        return ['maxSessionMemory', 'maxHeaderListSize', 'keepAliveTime'];
      case 'grpc':
        return ['maxReceiveMessageLength', 'maxSendMessageLength', 'keepAliveTime'];
      default:
        return [];
    }
  }
} 