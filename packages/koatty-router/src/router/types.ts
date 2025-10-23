/*
 * @Description: Protocol-specific router configuration types
 * @Usage: Type definitions for ext parameters in RouterOptions
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

/**
 * WebSocket 协议特定配置
 */
export interface WebSocketExtConfig {
  /** 最大分帧大小(字节)，默认1MB */
  maxFrameSize?: number;
  /** 分帧处理超时(ms)，默认30秒 */
  frameTimeout?: number;
  /** 心跳检测间隔(ms)，默认15秒 */
  heartbeatInterval?: number;
  /** 心跳超时时间(ms)，默认30秒 */
  heartbeatTimeout?: number;
  /** 最大连接数，默认1000 */
  maxConnections?: number;
  /** 最大缓冲区大小(字节)，默认10MB */
  maxBufferSize?: number;
  /** 清理间隔(ms)，默认5分钟 */
  cleanupInterval?: number;
}

/**
 * gRPC 流配置
 */
export interface StreamConfig {
  /** 最大并发流数量，默认50 */
  maxConcurrentStreams?: number;
  /** 流超时时间(ms)，默认60秒 */
  streamTimeout?: number;
  /** 背压阈值(字节)，默认2048 */
  backpressureThreshold?: number;
  /** 流缓冲区大小，默认1024 */
  streamBufferSize?: number;
  /** 是否启用流压缩，默认false */
  enableCompression?: boolean;
}

/**
 * gRPC 协议特定配置
 */
export interface GrpcExtConfig {
  /** Protocol Buffer 文件路径 */
  protoFile: string;
  /** 连接池大小，默认10 */
  poolSize?: number;
  /** 批处理大小，默认10 */
  batchSize?: number;
  /** 流配置 */
  streamConfig?: StreamConfig;
  /** gRPC 服务器选项 */
  serverOptions?: Record<string, any>;
  /** 是否启用反射，默认false */
  enableReflection?: boolean;
}

/**
 * GraphQL 协议特定配置
 */
export interface GraphQLExtConfig {
  /** GraphQL Schema 文件路径 */
  schemaFile: string;
  /** 启用 GraphQL Playground，默认false */
  playground?: boolean;
  /** 启用内省查询，默认true */
  introspection?: boolean;
  /** 调试模式，默认false */
  debug?: boolean;
  /** 查询深度限制，默认10 */
  depthLimit?: number;
  /** 查询复杂度限制，默认1000 */
  complexityLimit?: number;
  /** 自定义标量类型 */
  customScalars?: Record<string, any>;
  /** 中间件配置 */
  middlewares?: any[];
}

/**
 * HTTP 协议特定配置（目前为空，预留扩展）
 */
export interface HttpExtConfig {
  /** 自定义HTTP选项 */
  [key: string]: any;
}

/**
 * 协议扩展配置联合类型
 */
export type ProtocolExtConfig = 
  | WebSocketExtConfig 
  | GrpcExtConfig 
  | GraphQLExtConfig 
  | HttpExtConfig;

/**
 * 协议扩展配置映射
 */
export interface ProtocolExtConfigMap {
  http: HttpExtConfig;
  https: HttpExtConfig;
  ws: WebSocketExtConfig;
  wss: WebSocketExtConfig;
  grpc: GrpcExtConfig;
  graphql: GraphQLExtConfig;
}

/**
 * 获取协议特定配置的工具函数
 */
export function getProtocolConfig<T extends keyof ProtocolExtConfigMap>(
  protocol: T,
  ext: Record<string, any> = {}
): ProtocolExtConfigMap[T] {
  return ext as ProtocolExtConfigMap[T];
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 验证协议特定配置的工具函数（增强版）
 */
export function validateProtocolConfig(
  protocol: string,
  ext: Record<string, any> = {},
  env: string = process.env.NODE_ENV || 'development'
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  const proto = protocol.toLowerCase();

  switch (proto) {
    case 'grpc':
      // 必需字段验证
      if (!ext.protoFile || typeof ext.protoFile !== 'string' || ext.protoFile.trim().length === 0) {
        result.valid = false;
        result.errors.push('gRPC protocol requires protoFile path');
      }
      
      // 可选字段验证
      if (ext.poolSize !== undefined && (typeof ext.poolSize !== 'number' || ext.poolSize < 1)) {
        result.warnings.push('poolSize should be a positive number, using default: 10');
      }
      if (ext.batchSize !== undefined && (typeof ext.batchSize !== 'number' || ext.batchSize < 1)) {
        result.warnings.push('batchSize should be a positive number, using default: 10');
      }
      
      // 流配置验证
      if (ext.streamConfig) {
        const sc = ext.streamConfig;
        if (sc.maxConcurrentStreams !== undefined && sc.maxConcurrentStreams < 1) {
          result.warnings.push('maxConcurrentStreams should be positive, using default: 50');
        }
        if (sc.streamTimeout !== undefined && sc.streamTimeout < 1000) {
          result.warnings.push('streamTimeout should be >= 1000ms for stability');
        }
      }
      break;

    case 'graphql':
      // 必需字段验证
      if (!ext.schemaFile || typeof ext.schemaFile !== 'string' || ext.schemaFile.trim().length === 0) {
        result.valid = false;
        result.errors.push('GraphQL protocol requires schemaFile path');
      }
      
      // 安全配置检查（生产环境）
      if (env === 'production') {
        if (ext.playground === true) {
          result.warnings.push('GraphQL Playground should be disabled in production');
        }
        if (ext.debug === true) {
          result.warnings.push('Debug mode should be disabled in production');
        }
        if (!ext.depthLimit) {
          result.warnings.push('Consider setting depthLimit for production security');
        }
        if (!ext.complexityLimit) {
          result.warnings.push('Consider setting complexityLimit for production security');
        }
      }
      
      // 深度和复杂度验证
      if (ext.depthLimit !== undefined && (typeof ext.depthLimit !== 'number' || ext.depthLimit < 1)) {
        result.warnings.push('depthLimit should be a positive number');
      }
      if (ext.complexityLimit !== undefined && (typeof ext.complexityLimit !== 'number' || ext.complexityLimit < 1)) {
        result.warnings.push('complexityLimit should be a positive number');
      }
      break;

    case 'ws':
    case 'wss':
      // 心跳配置验证
      if (ext.heartbeatInterval !== undefined && ext.heartbeatTimeout !== undefined) {
        if (ext.heartbeatInterval >= ext.heartbeatTimeout) {
          result.warnings.push('heartbeatInterval should be less than heartbeatTimeout');
        }
      }
      
      // 资源限制验证
      if (ext.maxConnections !== undefined && ext.maxConnections < 1) {
        result.warnings.push('maxConnections should be positive, using default: 1000');
      }
      if (ext.maxFrameSize !== undefined && ext.maxFrameSize < 1024) {
        result.warnings.push('maxFrameSize too small, may cause issues with normal messages');
      }
      if (ext.maxBufferSize !== undefined && ext.maxFrameSize !== undefined) {
        if (ext.maxBufferSize < ext.maxFrameSize * 2) {
          result.warnings.push('maxBufferSize should be at least 2x maxFrameSize');
        }
      }
      break;

    case 'http':
    case 'https':
      // HTTP 配置都是可选的，无需严格验证
      break;

    default:
      result.valid = false;
      result.errors.push(`Unknown protocol: ${protocol}`);
  }

  return result;
} 