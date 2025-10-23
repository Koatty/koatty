/*
 * @Description:
 * @Usage:
 * @Author: richen
 * @Date: 2021-06-29 14:10:30
 * @LastEditTime: 2025-04-06 22:56:00
 */
import { UntypedHandleCall, ServerReadableStream, ServerWritableStream, ServerDuplexStream } from "@grpc/grpc-js";
import { IOC } from "koatty_container";
import {
  IRpcServerCall,
  IRpcServerCallback,
  Koatty, 
  KoattyContext,
  KoattyRouter,
  RouterImplementation
} from "koatty_core";
import * as Helper from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import { ListServices, LoadProto } from "koatty_proto";
import { injectParamMetaData, injectRouter, ParamMetadata } from "../utils/inject";
import { parsePath } from "../utils/path";
import { RouterOptions } from "./router";
import { Handler } from "../utils/handler";
import { getProtocolConfig, validateProtocolConfig } from "./types";

/**
 * gRPC流类型枚举
 */
export enum GrpcStreamType {
  UNARY = 'unary',
  SERVER_STREAMING = 'server_streaming',
  CLIENT_STREAMING = 'client_streaming',
  BIDIRECTIONAL_STREAMING = 'bidirectional_streaming'
}

/**
 * 流处理配置
 */
export interface StreamConfig {
  maxConcurrentStreams?: number;
  streamTimeout?: number;
  backpressureThreshold?: number;
  bufferSize?: number;
}

/**
 * GrpcRouter Options
 */
export interface GrpcRouterOptions extends RouterOptions {
  protoFile: string;
  poolSize?: number;
  batchSize?: number;
  streamConfig?: StreamConfig;
}

/**
 * 流状态管理
 */
interface StreamState {
  id: string;
  type: GrpcStreamType;
  startTime: number;
  messageCount: number;
  bufferSize: number;
  isActive: boolean;
}

/**
 * Connection pool for gRPC clients
 */
class GrpcConnectionPool {
  private pool: Map<string, any[]>;
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.pool = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get connection from pool or create new one
   */
  get(serviceName: string, options?: any): any {
    const connections = this.pool.get(serviceName);
    if (connections && connections.length > 0) {
      const conn = connections.pop();
      Logger.Debug(`Reused connection from pool for service: ${serviceName}`);
      return conn;
    }
    
    // No available connection, create new one
    Logger.Debug(`Creating new connection for service: ${serviceName}`);
    return this.create(serviceName, options);
  }

  /**
   * Release connection back to pool
   */
  release(serviceName: string, connection: any): void {
    if (!connection) return;
    
    if (!this.pool.has(serviceName)) {
      this.pool.set(serviceName, []);
    }
    
    const connections = this.pool.get(serviceName)!;
    if (connections.length < this.maxSize) {
      connections.push(connection);
      Logger.Debug(`Connection released back to pool for service: ${serviceName}, pool size: ${connections.length}`);
    } else {
      // Pool is full, close the connection
      if (connection.close && typeof connection.close === 'function') {
        connection.close();
      }
      Logger.Debug(`Pool full for service: ${serviceName}, connection closed`);
    }
  }

  /**
   * Create new connection
   * @param serviceName - Name of the gRPC service
   * @param options - gRPC client options
   * @returns Connection object (placeholder, actual implementation depends on gRPC client library)
   */
  private create(serviceName: string, options?: any): any {
    // NOTE: This is a placeholder implementation
    // In a real scenario, you would create an actual gRPC client connection:
    // 
    // Example with @grpc/grpc-js:
    // const grpc = require('@grpc/grpc-js');
    // const client = new ServiceClient(
    //   'localhost:50051',
    //   grpc.credentials.createInsecure(),
    //   options
    // );
    // return client;
    
    Logger.Debug(`Creating connection stub for service: ${serviceName}`);
    return {
      serviceName,
      createdAt: Date.now(),
      options,
      // Placeholder methods
      close: () => {
        Logger.Debug(`Closing connection for service: ${serviceName}`);
      }
    };
  }

  /**
   * Cleanup all connections in the pool
   */
  clear(): void {
    let totalConnections = 0;
    
    // Close all connections before clearing
    for (const [_serviceName, connections] of this.pool.entries()) {
      for (const connection of connections) {
        if (connection && connection.close && typeof connection.close === 'function') {
          connection.close();
        }
        totalConnections++;
      }
    }
    
    this.pool.clear();
    Logger.Info(`gRPC connection pool cleared, closed ${totalConnections} connections`);
  }
  
  /**
   * Get pool statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [serviceName, connections] of this.pool.entries()) {
      stats[serviceName] = connections.length;
    }
    return stats;
  }
}

/**
 * Batch processor for gRPC requests
 */
class GrpcBatchProcessor {
  private batchSize: number;
  private batchQueue: Map<string, any[]>;
  private batchTimers: Map<string, NodeJS.Timeout>;

  constructor(batchSize: number = 10) {
    this.batchSize = batchSize;
    this.batchQueue = new Map();
    this.batchTimers = new Map();
  }

  /**
   * Add request to batch
   */
  addRequest(serviceName: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(serviceName)) {
        this.batchQueue.set(serviceName, []);
      }

      const queue = this.batchQueue.get(serviceName)!;
      queue.push({ request, resolve, reject });

      // Process batch if size reached
      if (queue.length >= this.batchSize) {
        this.processBatch(serviceName);
      } else if (!this.batchTimers.has(serviceName)) {
        // Start timer for batch processing
        this.batchTimers.set(serviceName, setTimeout(() => {
          this.processBatch(serviceName);
        }, 100));
      }
    });
  }

  /**
   * Process batch of requests
   */
  private processBatch(serviceName: string): void {
    const queue = this.batchQueue.get(serviceName);
    if (!queue || queue.length === 0) return;

    const timer = this.batchTimers.get(serviceName);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(serviceName);
    }
    
    Logger.Debug(`Processing batch for service ${serviceName}, ${queue.length} requests`);
    
    // NOTE: This is a placeholder implementation
    // In a real scenario, you would:
    // 1. Combine all requests into a single gRPC batch call
    // 2. Send the batch to the service
    // 3. Process the batch response
    // 4. Resolve/reject each individual promise
    
    // Example implementation:
    // const batchRequest = { requests: queue.map(item => item.request) };
    // grpcClient.batchCall(batchRequest, (error, response) => {
    //   if (error) {
    //     queue.forEach(item => item.reject(error));
    //   } else {
    //     response.results.forEach((result, index) => {
    //       queue[index].resolve(result);
    //     });
    //   }
    // });
    
    // Placeholder: immediately resolve all requests
    queue.forEach((item, index) => {
      try {
        // Simulate successful response
        item.resolve({
          success: true,
          data: item.request,
          batchIndex: index,
          batchSize: queue.length
        });
      } catch (error) {
        item.reject(error);
      }
    });

    this.batchQueue.delete(serviceName);
    Logger.Debug(`Batch processing completed for service ${serviceName}`);
  }

  /**
   * Flush all pending batches and cleanup
   */
  flush(): void {
    let totalProcessed = 0;
    
    // Process all pending batches
    for (const serviceName of this.batchQueue.keys()) {
      const queueSize = this.batchQueue.get(serviceName)?.length || 0;
      this.processBatch(serviceName);
      totalProcessed += queueSize;
    }

    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    Logger.Info(`gRPC batch processor flushed, processed ${totalProcessed} pending requests`);
  }
  
  /**
   * Get batch queue statistics
   */
  getStats(): { serviceName: string; queueSize: number }[] {
    const stats: { serviceName: string; queueSize: number }[] = [];
    for (const [serviceName, queue] of this.batchQueue.entries()) {
      stats.push({
        serviceName,
        queueSize: queue.length
      });
    }
    return stats;
  }
}

/**
 * 流管理器
 */
class StreamManager {
  private streams: Map<string, StreamState>;
  private config: StreamConfig;

  constructor(config: StreamConfig = {}) {
    this.streams = new Map();
    this.config = {
      maxConcurrentStreams: config.maxConcurrentStreams || 100,
      streamTimeout: config.streamTimeout || 300000, // 5分钟
      backpressureThreshold: config.backpressureThreshold || 1000,
      bufferSize: config.bufferSize || 64 * 1024, // 64KB
      ...config
    };
  }

  /**
   * 注册新流
   */
  registerStream(id: string, type: GrpcStreamType): StreamState {
    const state: StreamState = {
      id,
      type,
      startTime: Date.now(),
      messageCount: 0,
      bufferSize: 0,
      isActive: true
    };
    
    this.streams.set(id, state);
    this.cleanupExpiredStreams();
    
    return state;
  }

  /**
   * 更新流状态
   */
  updateStream(id: string, updates: Partial<StreamState>): void {
    const state = this.streams.get(id);
    if (state) {
      Object.assign(state, updates);
    }
  }

  /**
   * 移除流
   */
  removeStream(id: string): void {
    this.streams.delete(id);
  }

  /**
   * 检查是否达到背压阈值
   */
  isBackpressureTriggered(id: string): boolean {
    const state = this.streams.get(id);
    return state ? state.bufferSize > this.config.backpressureThreshold! : false;
  }

  /**
   * 清理过期流
   */
  private cleanupExpiredStreams(): void {
    const now = Date.now();
    for (const [id, state] of this.streams.entries()) {
      if (now - state.startTime > this.config.streamTimeout!) {
        Logger.Warn(`Stream ${id} expired, removing...`);
        this.streams.delete(id);
      }
    }
  }

  /**
   * 获取活跃流数量
   */
  getActiveStreamCount(): number {
    return Array.from(this.streams.values()).filter(s => s.isActive).length;
  }

  /**
   * Close all active streams
   */
  closeAllStreams(): void {
    const activeCount = this.getActiveStreamCount();
    if (activeCount > 0) {
      Logger.Info(`Closing ${activeCount} active gRPC streams...`);
    }

    for (const [id, state] of this.streams.entries()) {
      if (state.isActive) {
        state.isActive = false;
        Logger.Debug(`Closed stream: ${id}`);
      }
    }

    this.streams.clear();
    Logger.Debug('All gRPC streams closed');
  }
}

/**
 * CtlInterface
 *
 * @interface CtlInterface
 */
interface CtlInterface {
  [path: string]: {
    name: string;
    ctl: Function;
    method: string;
    params: ParamMetadata[];
    composedMiddleware?: Function;
  }
}

export class GrpcRouter implements KoattyRouter {
  readonly protocol: string;
  options: GrpcRouterOptions;
  router: Map<string, RouterImplementation>;
  private connectionPool: GrpcConnectionPool;
  private batchProcessor: GrpcBatchProcessor;
  private streamManager: StreamManager;

  constructor(app: Koatty, options: RouterOptions = { protocol: "grpc", prefix: "" }) {
    const extConfig = getProtocolConfig('grpc', options.ext || {});
    
    // 配置验证
    const validation = validateProtocolConfig('grpc', options.ext || {});
    if (!validation.valid) {
      throw new Error(`gRPC router configuration error: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning: string) => Logger.Warn(`[GrpcRouter] ${warning}`));
    }
    
    this.options = {
      ...options,
      protoFile: extConfig.protoFile,
      poolSize: extConfig.poolSize || 10,
      batchSize: extConfig.batchSize || 10,
      streamConfig: extConfig.streamConfig || {}
    } as GrpcRouterOptions;
    
    this.protocol = options.protocol || "grpc";
    this.router = new Map();
    this.connectionPool = new GrpcConnectionPool(this.options.poolSize);
    this.batchProcessor = new GrpcBatchProcessor(this.options.batchSize);
    this.streamManager = new StreamManager(this.options.streamConfig);
  }

  /**
   * SetRouter
   * @param name 
   * @param impl 
   * @returns 
   */
  SetRouter(name: string, impl?: RouterImplementation) {
    if (Helper.isEmpty(name)) return;
    this.router.set(name, {
      service: impl?.service,
      implementation: impl?.implementation
    });
  }

  /**
   * ListRouter
   *
   * @returns {*}  {Map<string, ServiceImplementation>}
   * @memberof GrpcRouter
   */
  ListRouter(): Map<string, RouterImplementation> {
    return this.router;
  }

  /**
   * 检测gRPC流类型
   */
  private detectStreamType(call: any): GrpcStreamType {
    // 一元调用：call.request 存在（包含请求数据）
    // 流调用：call 本身就是流对象，数据通过事件接收
    if (call.request) {
      Logger.Debug(`[GRPC_ROUTER] Stream detection: UNARY (call.request exists)`);
      return GrpcStreamType.UNARY;
    }
    
    // 对于流调用，检查是否是真正的流对象（Stream 类型）
    const isActuallyReadableStream = call.readable === true;
    const isActuallyWritableStream = call.writable === true;
    
    Logger.Debug(`[GRPC_ROUTER] Stream detection: readable=${call.readable}, writable=${call.writable}`);
    
    if (isActuallyReadableStream && isActuallyWritableStream) {
      return GrpcStreamType.BIDIRECTIONAL_STREAMING;
    } else if (isActuallyReadableStream) {
      return GrpcStreamType.CLIENT_STREAMING;
    } else if (isActuallyWritableStream) {
      return GrpcStreamType.SERVER_STREAMING;
    } else {
      // 默认返回一元调用
      Logger.Warn(`[GRPC_ROUTER] Unable to determine stream type, defaulting to UNARY`);
      return GrpcStreamType.UNARY;
    }
  }

  /**
   * 处理一元调用 (Unary RPC)
   */
  private async handleUnaryCall(
    call: IRpcServerCall<any, any>, 
    callback: IRpcServerCallback<any>,
    app: Koatty,
    ctlItem: any
  ): Promise<void> {
    try {
      Logger.Debug(`[GRPC_ROUTER] Handling unary call for ${ctlItem.name}.${ctlItem.method}`);
      
      // 创建 gRPC context (context 已经由 koatty_serve 在调用 handler 之前创建好了)
      // 这里的 call 和 callback 已经被包装在 context 中
      // 直接从 call 中获取 context，或者使用 app.createContext
      const ctx = app.createContext(call, callback, 'grpc');
      
      Logger.Debug(`[GRPC_ROUTER] Context created, getting controller instance`);
      const ctl = IOC.getInsByClass(ctlItem.ctl, [ctx]);
      
      Logger.Debug(`[GRPC_ROUTER] Calling Handler for ${ctlItem.method}`);
      const result = await Handler(app, ctx, ctl, ctlItem.method, ctlItem.params, undefined, ctlItem.composedMiddleware);
      
      // Handler 执行完成后，调用 gRPC callback 返回结果
      const response = result || ctx.body;
      Logger.Debug(`[GRPC_ROUTER] gRPC method ${ctlItem.name}.${ctlItem.method} completed, calling callback with response:`, response);
      callback(null, response);
      
    } catch (error) {
      Logger.Error(`[GRPC_ROUTER] Error executing gRPC method ${ctlItem.name}.${ctlItem.method}:`, error);
      callback(error as Error);
    }
  }

  /**
   * 处理服务器流 (Server Streaming RPC)
   */
  private async handleServerStreaming(
    call: ServerWritableStream<any, any>,
    app: Koatty,
    ctlItem: any
  ): Promise<void> {
    const streamId = `server_${Date.now()}_${Math.random()}`;
    const streamState = this.streamManager.registerStream(streamId, GrpcStreamType.SERVER_STREAMING);
    
    try {
      Logger.Debug(`[GRPC_ROUTER] Handling server streaming call for ${ctlItem.name}.${ctlItem.method}`);
      
      // 设置流超时
      const timeout = setTimeout(() => {
        Logger.Warn(`[GRPC_ROUTER] Server stream ${streamId} timeout`);
        call.end();
        this.streamManager.removeStream(streamId);
      }, this.options.streamConfig?.streamTimeout || 300000);

      // 处理流结束
      call.on('cancelled', () => {
        Logger.Debug(`[GRPC_ROUTER] Server stream ${streamId} cancelled`);
        clearTimeout(timeout);
        this.streamManager.removeStream(streamId);
      });

      call.on('error', (error) => {
        Logger.Error(`[GRPC_ROUTER] Server stream ${streamId} error:`, error);
        clearTimeout(timeout);
        this.streamManager.removeStream(streamId);
      });

      // 直接创建 context，不再调用 app.callback
      const ctx = app.createContext(call, null, 'grpc');
      
      // 添加流写入方法到上下文
      ctx.writeStream = (data: any) => {
        if (this.streamManager.isBackpressureTriggered(streamId)) {
          Logger.Warn(`[GRPC_ROUTER] Backpressure triggered for stream ${streamId}`);
          return false;
        }
        
        call.write(data);
        this.streamManager.updateStream(streamId, { 
          messageCount: streamState.messageCount + 1 
        });
        return true;
      };
      
      ctx.endStream = () => {
        call.end();
        clearTimeout(timeout);
        this.streamManager.removeStream(streamId);
      };

      // 获取控制器实例并执行
      const ctl = IOC.getInsByClass(ctlItem.ctl, [ctx]);
      await Handler(app, ctx, ctl, ctlItem.method, ctlItem.params, undefined, ctlItem.composedMiddleware);
      
    } catch (error) {
      Logger.Error(`[GRPC_ROUTER] Error in server streaming: ${error}`);
      call.end();
      this.streamManager.removeStream(streamId);
    }
  }

  /**
   * 处理客户端流 (Client Streaming RPC)
   */
  private handleClientStreaming(
    call: ServerReadableStream<any, any>,
    callback: IRpcServerCallback<any>,
    app: Koatty,
    ctlItem: any
  ): void {
    const streamId = `client_${Date.now()}_${Math.random()}`;
    const streamState = this.streamManager.registerStream(streamId, GrpcStreamType.CLIENT_STREAMING);
    const messages: any[] = [];
    
    try {
      Logger.Debug(`[GRPC_ROUTER] Handling client streaming call for ${ctlItem.name}.${ctlItem.method}`);
      
      // 设置流超时
      const timeout = setTimeout(() => {
        Logger.Warn(`[GRPC_ROUTER] Client stream ${streamId} timeout`);
        callback(new Error('Stream timeout'));
        this.streamManager.removeStream(streamId);
      }, this.options.streamConfig?.streamTimeout || 300000);

      // 处理数据接收
      call.on('data', (data: any) => {
        messages.push(data);
        this.streamManager.updateStream(streamId, { 
          messageCount: streamState.messageCount + 1,
          bufferSize: streamState.bufferSize + JSON.stringify(data).length
        });
        
        // 检查背压
        if (this.streamManager.isBackpressureTriggered(streamId)) {
          Logger.Warn(`[GRPC_ROUTER] Backpressure triggered for client stream ${streamId}`);
          call.pause();
          setTimeout(() => call.resume(), 100);
        }
      });

      // 处理流结束
      call.on('end', async () => {
        clearTimeout(timeout);
        Logger.Debug(`[GRPC_ROUTER] Client stream ${streamId} ended with ${messages.length} messages`);
        
        try {
          // 直接创建 context，不再调用 app.callback
          const ctx = app.createContext(call, callback, 'grpc');
          ctx.streamMessages = messages;
          
          // 获取控制器实例并执行
          const ctl = IOC.getInsByClass(ctlItem.ctl, [ctx]);
          const result = await Handler(app, ctx, ctl, ctlItem.method, ctlItem.params, undefined, ctlItem.composedMiddleware);
          
          // 调用 callback 返回结果
          const response = result || ctx.body;
          callback(null, response);
          
          this.streamManager.removeStream(streamId);
        } catch (error) {
          Logger.Error(`[GRPC_ROUTER] Error processing client stream: ${error}`);
          callback(error as Error);
          this.streamManager.removeStream(streamId);
        }
      });

      call.on('error', (error) => {
        Logger.Error(`[GRPC_ROUTER] Client stream ${streamId} error:`, error);
        clearTimeout(timeout);
        callback(error);
        this.streamManager.removeStream(streamId);
      });

      call.on('cancelled', () => {
        Logger.Debug(`[GRPC_ROUTER] Client stream ${streamId} cancelled`);
        clearTimeout(timeout);
        this.streamManager.removeStream(streamId);
      });
      
    } catch (error) {
      Logger.Error(`[GRPC_ROUTER] Error in client streaming: ${error}`);
      callback(error as Error);
      this.streamManager.removeStream(streamId);
    }
  }

  /**
   * 处理双向流 (Bidirectional Streaming RPC)
   */
  private handleBidirectionalStreaming(
    call: ServerDuplexStream<any, any>,
    app: Koatty,
    ctlItem: any
  ): void {
    const streamId = `bidi_${Date.now()}_${Math.random()}`;
    const streamState = this.streamManager.registerStream(streamId, GrpcStreamType.BIDIRECTIONAL_STREAMING);
    
    try {
      Logger.Debug(`[GRPC_ROUTER] Handling bidirectional streaming call for ${ctlItem.name}.${ctlItem.method}`);
      
      // 设置流超时
      const timeout = setTimeout(() => {
        Logger.Warn(`[GRPC_ROUTER] Bidirectional stream ${streamId} timeout`);
        call.end();
        this.streamManager.removeStream(streamId);
      }, this.options.streamConfig?.streamTimeout || 300000);

      // 处理数据接收
      call.on('data', async (data: any) => {
        this.streamManager.updateStream(streamId, { 
          messageCount: streamState.messageCount + 1,
          bufferSize: streamState.bufferSize + JSON.stringify(data).length
        });
        
        // 检查背压
        if (this.streamManager.isBackpressureTriggered(streamId)) {
          Logger.Warn(`[GRPC_ROUTER] Backpressure triggered for bidirectional stream ${streamId}`);
          call.pause();
          setTimeout(() => call.resume(), 100);
        }

        try {
          // 直接创建 context，不再调用 app.callback
          const ctx = app.createContext(call, null, 'grpc');
          ctx.streamMessage = data;
          
          // 添加流写入方法到上下文
          ctx.writeStream = (responseData: any) => {
            if (this.streamManager.isBackpressureTriggered(streamId)) {
              Logger.Warn(`[GRPC_ROUTER] Write backpressure triggered for stream ${streamId}`);
              return false;
            }
            call.write(responseData);
            return true;
          };
          
          ctx.endStream = () => {
            call.end();
            clearTimeout(timeout);
            this.streamManager.removeStream(streamId);
          };

          // 获取控制器实例并执行
          const ctl = IOC.getInsByClass(ctlItem.ctl, [ctx]);
          await Handler(app, ctx, ctl, ctlItem.method, ctlItem.params, undefined, ctlItem.composedMiddleware);
        } catch (error) {
          Logger.Error(`[GRPC_ROUTER] Error processing bidirectional stream message: ${error}`);
        }
      });

      // 处理流结束
      call.on('end', () => {
        Logger.Debug(`[GRPC_ROUTER] Bidirectional stream ${streamId} ended`);
        clearTimeout(timeout);
        call.end();
        this.streamManager.removeStream(streamId);
      });

      call.on('error', (error) => {
        Logger.Error(`[GRPC_ROUTER] Bidirectional stream ${streamId} error:`, error);
        clearTimeout(timeout);
        call.end();
        this.streamManager.removeStream(streamId);
      });

      call.on('cancelled', () => {
        Logger.Debug(`[GRPC_ROUTER] Bidirectional stream ${streamId} cancelled`);
        clearTimeout(timeout);
        this.streamManager.removeStream(streamId);
      });
      
    } catch (error) {
      Logger.Error(`[GRPC_ROUTER] Error in bidirectional streaming: ${error}`);
      call.end();
      this.streamManager.removeStream(streamId);
    }
  }

  /**
   * 统一的流处理入口
   */
  private handleStreamCall(
    call: IRpcServerCall<any, any>, 
    callback: IRpcServerCallback<any>,
    app: Koatty,
    ctlItem: any
  ): void {
    Logger.Debug(`[GRPC_ROUTER] handleStreamCall called for ${ctlItem.name}.${ctlItem.method}`);
    
    // 检测流类型
    const streamType = this.detectStreamType(call);
    Logger.Debug(`[GRPC_ROUTER] Detected stream type: ${streamType}`);
    
    // 检查并发流限制（只对真正的流调用进行限制）
    if (streamType !== GrpcStreamType.UNARY && 
        this.streamManager.getActiveStreamCount() >= (this.options.streamConfig?.maxConcurrentStreams || 100)) {
      Logger.Warn('[GRPC_ROUTER] Maximum concurrent streams reached');
      if (callback) {
        callback(new Error('Server busy'));
      } else {
        (call as any).end();
      }
      return;
    }

    Logger.Debug(`[GRPC_ROUTER] Processing stream type: ${streamType} for ${ctlItem.name}.${ctlItem.method}`);

    switch (streamType) {
      case GrpcStreamType.UNARY:
        Logger.Debug(`[GRPC_ROUTER] Calling handleUnaryCall for ${ctlItem.name}.${ctlItem.method}`);
        this.handleUnaryCall(call, callback, app, ctlItem);
        break;
      case GrpcStreamType.SERVER_STREAMING:
        this.handleServerStreaming(call as ServerWritableStream<any, any>, app, ctlItem);
        break;
      case GrpcStreamType.CLIENT_STREAMING:
        this.handleClientStreaming(call as ServerReadableStream<any, any>, callback, app, ctlItem);
        break;
      case GrpcStreamType.BIDIRECTIONAL_STREAMING:
        this.handleBidirectionalStreaming(call as ServerDuplexStream<any, any>, app, ctlItem);
        break;
      default:
        Logger.Error(`Unknown stream type: ${streamType}`);
        (call as any).end();
    }
  }

  /**
   * LoadRouter
   *
   * @memberof Router
   */
  async LoadRouter(app: Koatty, list: any[]) {
    try {
      const pdef = LoadProto(this.options.protoFile);
      
      const services = ListServices(pdef);
      
      const ctls: CtlInterface = {};

      for (const n of list) {
        Logger.Debug(`[GRPC_ROUTER] Processing controller: ${n}`);
        const ctlClass = IOC.getClass(n, "CONTROLLER");
        const ctlRouters = await injectRouter(app, ctlClass, this.options.protocol);
        Logger.Debug(`[GRPC_ROUTER] Controller ${n} routers:`, ctlRouters ? Object.keys(ctlRouters).length : 0);
        if (!ctlRouters) continue;

        // 传递 protoFile 给 payload 解析器，用于可能的自动解码
        const ctlParams = injectParamMetaData(app, ctlClass, {
          ...this.options.payload,
          protoFile: this.options.protoFile
        });
        for (const router of Object.values(ctlRouters)) {
          ctls[router.path] = {
            name: n,
            ctl: ctlClass,
            method: router.method,
            params: ctlParams[router.method],
            composedMiddleware: router.composedMiddleware
          };
          Logger.Debug(`[GRPC_ROUTER] Registered controller route: "${router.path}" => ${n}.${router.method}`);
        }
      }


      for (const si of services) {        
        if (!si.service || si.handlers.length === 0) {
          Logger.Warn(`[GRPC_ROUTER] Ignore ${si.name} which is an empty service`);
          continue;
        }

        Logger.Debug(`[GRPC_ROUTER] Processing gRPC service: ${si.name} with ${si.handlers.length} handlers`);

        // Register placeholder implementations for gRPC service
        // These are just shells - the actual routing is handled by middleware
        const impl: Record<string, UntypedHandleCall> = {};
        for (const handler of si.handlers) {
          const path = parsePath(handler.path);
          Logger.Debug(`[GRPC_ROUTER] Looking for handler: "${handler.path}" (parsed: "${path}") => handler name: "${handler.name}"`);
          const ctlItem = ctls[path];
          if (!ctlItem) {
            Logger.Warn(`[GRPC_ROUTER] ❌ No matching controller route found for gRPC handler "${handler.path}" (parsed: "${path}")`);
            continue;
          }

          Logger.Debug(`[GRPC_ROUTER] ✅ Register request mapping: ["${path}" => ${ctlItem.name}.${ctlItem.method}]`);
          
          // Register a placeholder handler
          // This handler will never be called because koatty_serve will call app.callback instead
          // But we still need to register it so grpc server knows this method exists
          impl[handler.name] = (call: IRpcServerCall<any, any>, callback: IRpcServerCallback<any>) => {
            Logger.Warn(`[GRPC_ROUTER] ⚠️ Placeholder handler called for: ${handler.name} - this should not happen!`);
            callback(new Error('This handler should not be called - routing should go through middleware'));
          };
        }
        
        // only register service when impl is not empty
        if (Object.keys(impl).length > 0) {
          this.SetRouter(si.name, { service: si.service, implementation: impl });
          
          // Handle both single server and multi-protocol server
          const server = app.server as any;

          let grpcServer = null;
          
          // Check if server is an array (multi-protocol mode)
          if (Helper.isArray(server)) {
            // Multi-protocol server: find gRPC server instance in array
            for (const s of server) {
              const protocol = s.options?.protocol || s.protocol;
              if (protocol === 'grpc' && Helper.isFunction(s.RegisterService)) {
                grpcServer = s;
                break;
              }
            }
          } else if (Helper.isFunction(server.getAllServers)) {
            // Alternative multi-protocol structure with getAllServers method
            const allServers = server.getAllServers();
            if (allServers && allServers.size > 0) {
              allServers.forEach((s: any) => {
                const protocol = Helper.isString(s.options?.protocol) ? s.options.protocol : 
                               (Helper.isArray(s.options?.protocol) ? s.options.protocol[0] : '');
                if (protocol === 'grpc' && Helper.isFunction(s.RegisterService)) {
                  grpcServer = s;
                }
              });
            }
          } else if (Helper.isFunction(server.RegisterService)) {
            // Single protocol gRPC server
            grpcServer = server;
          }
          
          // Register service to gRPC server
          if (grpcServer) {
            grpcServer.RegisterService({ service: si.service, implementation: impl });
          } else {
            Logger.Error(`[GRPC_ROUTER] ❌ Failed to find gRPC server instance for service registration: ${si.name}`);
          }
        } else {
          Logger.Warn(`[GRPC_ROUTER] Skip registering service ${si.name}: no matching controller handlers found`);
        }
      }
      
      // Register gRPC router middleware to app
      // Similar to HTTP router, this middleware handles routing for gRPC protocol
      
      app.use(async (ctx: KoattyContext, next: any) => {
        // Only handle gRPC protocol
        if (ctx.protocol !== 'grpc') {
          await next();
          return;
        }
        
        Logger.Debug('[GRPC_ROUTER] gRPC router middleware executing', {
          protocol: ctx.protocol,
          rpc: ctx.rpc
        });
        
        // Get method path from ctx.rpc (call object)
        // The call object should have a path property like "/Hello/SayHello"
        const methodPath = (ctx.rpc as any)?.path || (ctx.rpc as any)?.call?.path;
        
        if (!methodPath) {
          Logger.Error('[GRPC_ROUTER] No method path found in ctx.rpc');
          throw new Error('gRPC method path not found');
        }
        
        Logger.Debug(`[GRPC_ROUTER] Looking up controller for method: ${methodPath}`);
        
        // Find matching controller
        const ctlItem = ctls[methodPath];
        if (!ctlItem) {
          Logger.Error(`[GRPC_ROUTER] No controller found for method: ${methodPath}`);
          throw new Error(`gRPC method not implemented: ${methodPath}`);
        }
        
        Logger.Debug(`[GRPC_ROUTER] Found controller: ${ctlItem.name}.${ctlItem.method}`);
        
        // Execute controller
        const ctl = IOC.getInsByClass(ctlItem.ctl, [ctx]);
        const result = await Handler(app, ctx, ctl, ctlItem.method, ctlItem.params, undefined, ctlItem.composedMiddleware);
        
        // Set result to ctx.body
        ctx.body = result;
        
        Logger.Debug('[GRPC_ROUTER] Controller execution completed', {
          method: methodPath,
          hasResult: !!result
        });
      });
      
      
      // Protocol Isolation Note:
      // gRPC router now works through Koa middleware chain, just like HTTP router
      // The gRPC server calls app.callback("grpc") which executes this middleware
      Logger.Debug('gRPC router middleware registered (integrated with middleware chain)');
    } catch (err) {
      Logger.Error(err);
    }
  }

  /**
   * Cleanup all gRPC resources (for graceful shutdown)
   */
  public cleanup(): void {
    Logger.Info('Starting gRPC router cleanup...');

    // Close all active streams
    this.streamManager.closeAllStreams();

    // Flush pending batches
    this.batchProcessor.flush();

    // Clear connection pool
    this.connectionPool.clear();

    Logger.Info('gRPC router cleanup completed');
  }
}
