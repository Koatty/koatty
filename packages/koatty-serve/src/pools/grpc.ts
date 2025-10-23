/*
 * @Description: gRPC连接池管理器
 * @Usage: gRPC协议的连接池实现
 * @Author: richen
 * @Date: 2024-11-27 22:30:00
 * @LastEditTime: 2024-11-27 23:30:00
 */

import {
  ConnectionPoolManager,
  ConnectionRequestOptions
} from './pool';
import { ConnectionPoolConfig } from '../config/pool';

/**
 * gRPC连接元数据
 */
interface GrpcConnectionMetadata {
  id: string;
  createdAt: number;
  lastUsed: number;
  available: boolean;
  peer: string;
  callCount: number;
  errorCount: number;
  streamCount: number;
  activeStreams: number;
  totalBytesReceived: number;
  totalBytesSent: number;
  lastErrorTime?: number;
  metadata?: Record<string, any>;
}

/**
 * 简化的gRPC连接接口
 */
interface GrpcConnection {
  id: string;
  peer: string;
  metadata: any;
  cancelled: boolean;
  deadline?: Date;
  [key: string]: any;
}

/**
 * gRPC连接池管理器
 */
export class GrpcConnectionPoolManager extends ConnectionPoolManager<GrpcConnection> {
  private callMetrics = {
    totalUnarycalls: 0,
    totalStreamingCalls: 0,
    totalErrors: 0,
    averageCallDuration: 0,
    activeStreams: 0
  };

  constructor(config: ConnectionPoolConfig = {}) {
    super('grpc', config);
  }

  /**
   * 验证gRPC连接
   */
  protected validateConnection(connection: GrpcConnection): boolean {
    return connection &&
      typeof connection.peer === 'string' &&
      !connection.cancelled;
  }

  /**
   * 清理gRPC连接
   */
  protected async cleanupConnection(connection: GrpcConnection): Promise<void> {
    try {
      // 标记连接为已取消
      connection.cancelled = true;
    } catch (cleanupError) {
      this.logger.warn('Error cleaning up gRPC connection', {}, cleanupError);
    }
  }

  /**
   * 获取可用连接
   */
  protected async getAvailableConnection(): Promise<{ connection: GrpcConnection; id: string } | null> {
    for (const [id, metadata] of this.connectionMetadata) {
      if (metadata.available && this.isConnectionHealthy(this.connections.get(id)!)) {
        const connection = this.connections.get(id);
        if (connection) {
          metadata.available = false;
          metadata.lastUsed = Date.now();
          return { connection, id };
        }
      }
    }
    return null;
  }

  /**
   * 检查连接是否健康
   */
  isConnectionHealthy(connection: GrpcConnection): boolean {
    if (!connection) return false;

    const connectionId = this.findGrpcConnectionId(connection);
    if (!connectionId) return false;

    const metadata = this.connectionMetadata.get(connectionId) as GrpcConnectionMetadata;
    if (!metadata) return false;

    // 检查连接状态
    const isHealthy = !connection.cancelled;

    // 检查是否超时
    const now = Date.now();
    const maxIdleTime = this.config.connectionTimeout || 300000; // 5分钟
    const isIdle = metadata.available && (now - metadata.lastUsed) > maxIdleTime;

    return isHealthy && !isIdle;
  }

  /**
   * 添加gRPC连接（由服务器调用）
   */
  async addGrpcConnection(peer: string, callMetadata?: any): Promise<boolean> {
    const connection: GrpcConnection = {
      id: this.createConnectionId(),
      peer,
      metadata: callMetadata || {},
      cancelled: false,
      deadline: undefined
    };

    const metadata: Partial<GrpcConnectionMetadata> = {
      peer,
      callCount: 0,
      errorCount: 0,
      streamCount: 0,
      activeStreams: 0,
      totalBytesReceived: 0,
      totalBytesSent: 0,
      metadata: callMetadata
    };

    const success = await this.addConnection(connection, metadata);

    if (success) {
      this.setupConnectionEventHandlers(connection);
    }

    return success;
  }

  /**
   * 设置连接事件处理器
   */
  private setupConnectionEventHandlers(connection: GrpcConnection): void {
    const connectionId = this.findGrpcConnectionId(connection);
    if (!connectionId) return;

    // 简化的事件处理，避免复杂的gRPC类型
    // gRPC connection event handlers configured

    // 设置超时（如果有deadline）
    if (connection.deadline) {
      const timeout = connection.deadline.getTime() - Date.now();
      if (timeout > 0) {
        setTimeout(() => {
          if (!connection.cancelled) {
            this.removeConnection(connection, 'Deadline exceeded').catch(error => {
              this.logger.error('Error removing timed out gRPC connection', {}, error);
            });
          }
        }, timeout);
      }
    }
  }

  /**
   * 处理gRPC调用完成
   */
  async handleCallComplete(connection: GrpcConnection, success: boolean): Promise<void> {
    const connectionId = this.findGrpcConnectionId(connection);
    if (!connectionId) return;

    const metadata = this.connectionMetadata.get(connectionId) as GrpcConnectionMetadata;
    if (metadata) {
      metadata.callCount++;
      metadata.lastUsed = Date.now();

      if (!success) {
        metadata.errorCount++;
        metadata.lastErrorTime = Date.now();
        this.callMetrics.totalErrors++;
      }

      // 更新调用类型统计
      this.updateCallMetrics(connection);

      // 标记为可用
      metadata.available = true;
    }

    // 对于一次性调用，完成后移除连接
    if (this.isUnaryCall(connection)) {
      await this.removeConnection(connection, 'Unary call completed');
    }
  }

  /**
   * 更新调用指标
   */
  private updateCallMetrics(connection: GrpcConnection): void {
    if (this.isUnaryCall(connection)) {
      this.callMetrics.totalUnarycalls++;
    } else {
      this.callMetrics.totalStreamingCalls++;
    }
  }

  /**
   * 判断是否为一元调用
   */
  private isUnaryCall(_connection: GrpcConnection): boolean {
    // 简化实现，可以根据metadata判断
    return true; // 默认认为是一元调用
  }

  /**
   * 处理流响应发送
   */
  async handleStreamResponse(connection: GrpcConnection, data: any): Promise<void> {
    const connectionId = this.findGrpcConnectionId(connection);
    if (!connectionId) return;

    const metadata = this.connectionMetadata.get(connectionId) as GrpcConnectionMetadata;
    if (metadata) {
      const dataSize = Buffer.isBuffer(data) ? data.length : JSON.stringify(data).length;
      metadata.totalBytesSent += dataSize;
      metadata.lastUsed = Date.now();
    }
  }

  /**
   * 清理过期连接
   */
  private cleanupExpiredGrpcConnections(): void {
    const now = Date.now();
    const maxIdleTime = this.config.connectionTimeout || 300000; // 默认5分钟
    const connectionsToRemove: Array<{ id: string; connection: GrpcConnection }> = [];

    for (const [id, metadata] of this.connectionMetadata) {
      const typedMetadata = metadata as GrpcConnectionMetadata;
      if (typedMetadata.available &&
        (now - typedMetadata.lastUsed) > maxIdleTime) {
        const connection = this.connections.get(id);
        if (connection) {
          connectionsToRemove.push({ id, connection });
        }
      }
    }

    // 异步清理过期连接
    connectionsToRemove.forEach(({ connection }) => {
      this.removeConnection(connection, 'Connection idle timeout').catch(error => {
        this.logger.error('Error cleaning up idle gRPC connection', {}, error);
      });
    });

    // Idle gRPC connections cleaned up silently (if any)
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats() {
    const baseStats = this.getMetrics();

    let totalCalls = 0;
    let totalErrors = 0;
    let totalStreams = 0;
    let activeStreams = 0;
    let totalBytesReceived = 0;
    let totalBytesSent = 0;

    for (const [connectionId, _connection] of this.connections) {
      const metadata = this.connectionMetadata.get(connectionId) as GrpcConnectionMetadata;

      if (metadata) {
        totalCalls += metadata.callCount;
        totalErrors += metadata.errorCount;
        totalStreams += metadata.streamCount;
        activeStreams += metadata.activeStreams;
        totalBytesReceived += metadata.totalBytesReceived;
        totalBytesSent += metadata.totalBytesSent;
      }
    }

    return {
      ...baseStats,
      grpcSpecific: {
        totalCalls,
        totalErrors,
        totalStreams,
        activeStreams,
        totalBytesReceived,
        totalBytesSent,
        errorRate: totalCalls > 0 ? totalErrors / totalCalls : 0,
        callMetrics: this.callMetrics
      }
    };
  }

  /**
   * 获取gRPC特定指标
   */
  getGrpcMetrics() {
    return {
      ...this.callMetrics,
      connections: Array.from(this.connectionMetadata.values())
        .map((metadata: any) => ({
          id: metadata.id,
          peer: metadata.peer,
          callCount: metadata.callCount,
          errorCount: metadata.errorCount,
          streamCount: metadata.streamCount,
          activeStreams: metadata.activeStreams,
          totalBytesReceived: metadata.totalBytesReceived,
          totalBytesSent: metadata.totalBytesSent,
          age: Date.now() - metadata.createdAt,
          idle: Date.now() - metadata.lastUsed
        }))
    };
  }

  /**
   * 找到连接ID的辅助方法
   */
  private findGrpcConnectionId(connection: GrpcConnection): string | null {
    for (const [id, conn] of this.connections) {
      if (conn === connection) return id;
    }
    return null;
  }

  /**
   * 创建连接ID
   */
  private createConnectionId(): string {
    return `grpc_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    await super.destroy();
    this.logger.info('gRPC connection pool destroyed');
  }

  // ============= 实现抽象方法 =============

  /**
   * 协议特定的连接处理器设置
   */
  protected async setupProtocolSpecificHandlers(connection: GrpcConnection): Promise<void> {
    // gRPC特定的处理器设置已在addGrpcConnection中完成
    this.setupConnectionEventHandlers(connection);
  }

  /**
   * 协议特定的连接创建逻辑
   */
  protected async createProtocolConnection(_options: ConnectionRequestOptions): Promise<{ connection: GrpcConnection; metadata?: any } | null> {
    // gRPC连接由服务器被动接受，不主动创建
    return null;
  }
} 