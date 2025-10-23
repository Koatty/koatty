/*
 * @Description: HTTP/3连接池管理器
 * @Usage: HTTP/3协议的连接池实现（基于QUIC）
 * @Author: richen
 * @Date: 2025-01-12 10:00:00
 * @LastEditTime: 2025-01-12 10:00:00
 */

/**
 * HTTP/3 连接池实现说明：
 * 
 * HTTP/3 基于 QUIC 协议，运行在 UDP 之上。
 * Node.js 原生尚未完全支持 HTTP/3，需要使用第三方库。
 * 
 * 可选的实现方案：
 * 1. @node-rs/quic - 基于 Rust 的高性能 QUIC 实现
 * 2. quiche-native - Cloudflare quiche 的 Node.js 绑定
 * 3. webtransport - Web Transport API 实现
 * 
 * 本实现提供了架构框架，具体的 QUIC 库集成需要根据实际选择的库进行适配。
 */

import { 
  ConnectionPoolManager, 
  ConnectionRequestOptions
} from './pool';
import { ConnectionPoolConfig } from '../config/pool';

/**
 * HTTP/3 会话元数据
 * QUIC 连接支持多路复用，类似 HTTP/2
 */
interface Http3SessionMetadata {
  id: string;
  createdAt: number;
  lastUsed: number;
  available: boolean;
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
  encrypted: boolean;  // HTTP/3 总是加密的
  protocol: string;    // 'http3'
  activeStreams: number;
  totalStreams: number;
  maxConcurrentStreams: number;
  streamErrors: number;
  isClosing: boolean;
  lastPingTime?: number;
  lastPingAck?: number;
  // QUIC 特定属性
  connectionId?: string;
  bytesSent: number;
  bytesReceived: number;
  packetsLost: number;
  rtt: number;  // Round-trip time
  congestionWindow: number;
}

/**
 * HTTP/3 流元数据
 */
interface Http3StreamMetadata {
  id: number;
  sessionId: string;
  createdAt: number;
  direction: 'bidirectional' | 'unidirectional';
  state: 'open' | 'halfClosed' | 'closed';
}

/**
 * HTTP/3 连接（Session）接口
 * 
 * 注意：这是一个抽象接口，实际实现取决于使用的 QUIC 库
 * 例如：@node-rs/quic 的 Connection 对象
 */
export interface Http3Session {
  destroyed: boolean;
  closed: boolean;
  localAddress?: string;
  localPort?: number;
  remoteAddress?: string;
  remotePort?: number;
  
  // QUIC 连接方法
  close(code?: number, reason?: string): void;
  ping?(callback: (err: Error | null, duration: number) => void): void;
  getStats?(): {
    bytesSent: number;
    bytesReceived: number;
    packetsLost: number;
    rtt: number;
  };
  
  // 事件监听
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'stream', listener: (stream: any) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  
  once(event: 'close', listener: () => void): this;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
}

/**
 * HTTP/3连接池管理器
 */
export class Http3ConnectionPoolManager extends ConnectionPoolManager<Http3Session> {
  private readonly activeStreams = new Map<string, Set<Http3StreamMetadata>>();
  private pingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ConnectionPoolConfig = {}) {
    super('http3', config);
    
    // 启动HTTP/3特有的监控任务
    this.startHttp3MonitoringTasks();
  }

  /**
   * 验证HTTP/3会话
   */
  protected validateConnection(session: Http3Session): boolean {
    return session && 
           !session.destroyed && 
           !session.closed;
  }

  /**
   * 清理HTTP/3会话
   */
  protected async cleanupConnection(session: Http3Session): Promise<void> {
    try {
      const sessionId = this.findHttp3SessionId(session);
      if (sessionId) {
        // 清理活跃流
        const streams = this.activeStreams.get(sessionId);
        if (streams) {
          // 关闭所有流（具体实现取决于 QUIC 库）
          streams.clear();
          this.activeStreams.delete(sessionId);
        }
      }

      if (!session.destroyed && !session.closed) {
        session.close(0, 'Normal closure');
      }
    } catch (error) {
      this.logger.warn('Error cleaning up HTTP/3 session', {}, error);
    }
  }

  /**
   * 获取可用会话
   */
  protected async getAvailableConnection(): Promise<{ connection: Http3Session; id: string } | null> {
    for (const [id, metadata] of this.connectionMetadata) {
      const http3Metadata = metadata as Http3SessionMetadata;
      
      // 检查会话是否可用且有容量
      if (http3Metadata.available && 
          !http3Metadata.isClosing &&
          http3Metadata.activeStreams < http3Metadata.maxConcurrentStreams &&
          this.isConnectionHealthy(this.connections.get(id)!)) {
        
        const session = this.connections.get(id);
        if (session) {
          // 更新使用时间
          http3Metadata.lastUsed = Date.now();
          return { connection: session, id };
        }
      }
    }
    return null;
  }

  /**
   * 创建新连接 - HTTP/3会话通常是被动接受的
   */
  protected async createNewConnection(_options: ConnectionRequestOptions): Promise<{ connection: Http3Session; id: string; metadata?: any } | null> {
    // HTTP/3会话通常是被动接受的，这里返回null
    // 在实际的HTTP/3服务器实现中，会话会通过server.on('session')事件添加
    return null;
  }

  /**
   * 检查会话是否健康
   */
  isConnectionHealthy(session: Http3Session): boolean {
    if (!session) return false;
    
    const sessionId = this.findHttp3SessionId(session);
    if (!sessionId) return false;
    
    const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
    if (!metadata) return false;
    
    // 检查会话状态
    const isSessionHealthy = !session.destroyed && 
                            !session.closed &&
                            !metadata.isClosing;
    
    // 检查ping响应时间（如果支持）
    const now = Date.now();
    const pingTimeout = this.config.protocolSpecific?.maxIdleTimeout || 30000;
    
    if (metadata.lastPingTime && !metadata.lastPingAck) {
      if (now - metadata.lastPingTime > pingTimeout) {
        return false;
      }
    }
    
    // 检查 RTT 是否异常
    if (metadata.rtt > 5000) { // 5秒 RTT 视为不健康
      return false;
    }
    
    return isSessionHealthy;
  }

  /**
   * 添加HTTP/3会话（由服务器调用）
   */
  async addHttp3Session(session: Http3Session): Promise<boolean> {
    const metadata: Partial<Http3SessionMetadata> = {
      remoteAddress: session.remoteAddress,
      remotePort: session.remotePort,
      localAddress: session.localAddress,
      localPort: session.localPort,
      encrypted: true,  // HTTP/3 总是加密的
      protocol: 'http3',
      activeStreams: 0,
      totalStreams: 0,
      maxConcurrentStreams: this.config.protocolSpecific?.initialMaxStreamsBidi || 100,
      streamErrors: 0,
      isClosing: false,
      bytesSent: 0,
      bytesReceived: 0,
      packetsLost: 0,
      rtt: 0,
      congestionWindow: 0
    };

    const success = await this.addConnection(session, metadata);
    
    if (success) {
      this.setupSessionEventHandlers(session);
    }
    
    return success;
  }

  /**
   * 设置会话事件处理器
   */
  private setupSessionEventHandlers(session: Http3Session): void {
    const sessionId = this.findHttp3SessionId(session);
    if (!sessionId) return;

    // 初始化流集合
    this.activeStreams.set(sessionId, new Set());

    // 处理会话关闭
    session.on('close', () => {
      this.removeConnection(session, 'Session closed').catch(error => {
        this.logger.error('Error removing closed session', {}, error);
      });
    });

    // 处理会话错误
    session.on('error', (error) => {
      this.logger.warn('HTTP/3 session error', {}, { 
        sessionId, 
        error: error.message 
      });
      this.removeConnection(session, `Session error: ${error.message}`).catch(err => {
        this.logger.error('Error removing errored session', {}, err);
      });
    });

    // 处理流创建（如果 QUIC 库支持此事件）
    if (typeof session.on === 'function') {
      session.on('stream', (stream: any) => {
        this.handleNewStream(sessionId, stream);
      });
    }

    // 设置定期ping（如果支持）
    this.startSessionPing(session, sessionId);
  }

  /**
   * 处理新流
   */
  private handleNewStream(sessionId: string, stream: any): void {
    const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
    if (!metadata) return;

    const streams = this.activeStreams.get(sessionId);
    if (streams) {
      const streamMetadata: Http3StreamMetadata = {
        id: stream.id || Date.now(),
        sessionId,
        createdAt: Date.now(),
        direction: stream.bidirectional ? 'bidirectional' : 'unidirectional',
        state: 'open'
      };
      
      streams.add(streamMetadata);
      metadata.activeStreams = streams.size;
      metadata.totalStreams++;
      metadata.lastUsed = Date.now();

      // 处理流事件
      if (stream.on) {
        stream.on('close', () => {
          streams.delete(streamMetadata);
          metadata.activeStreams = streams.size;
        });

        stream.on('error', (error: Error) => {
          metadata.streamErrors++;
          streams.delete(streamMetadata);
          metadata.activeStreams = streams.size;
          
          this.logger.warn('HTTP/3 stream error', {}, {
            sessionId,
            streamId: streamMetadata.id,
            error: error.message,
            totalStreamErrors: metadata.streamErrors
          });
        });
      }

      // 记录延迟
      const startTime = Date.now();
      if (stream.on) {
        stream.on('close', () => {
          const latency = Date.now() - startTime;
          this.recordLatency(latency);
        });
      }
    }
  }

  /**
   * 启动会话ping
   */
  private startSessionPing(session: Http3Session, sessionId: string): void {
    const pingInterval = this.config.protocolSpecific?.maxIdleTimeout || 30000;
    
    const pingTimer = setInterval(() => {
      if (session.destroyed || session.closed) {
        clearInterval(pingTimer);
        return;
      }

      try {
        const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
        if (metadata && session.ping) {
          metadata.lastPingTime = Date.now();
          session.ping((err, duration) => {
            if (!err && metadata) {
              metadata.lastPingAck = Date.now();
              metadata.rtt = duration;
            }
          });
        }
      } catch {
        // Ping error handled silently
      }
    }, pingInterval);
  }

  /**
   * 启动HTTP/3监控任务
   */
  private startHttp3MonitoringTasks(): void {
    // Ping间隔
    const pingInterval = this.config.protocolSpecific?.maxIdleTimeout || 30000;
    this.pingInterval = setInterval(() => {
      this.pingAllSessions();
    }, pingInterval);

    // 健康检查间隔
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // 1分钟
  }

  /**
   * 向所有会话发送ping
   */
  private pingAllSessions(): void {
    for (const [sessionId, session] of this.connections) {
      if (!session.destroyed && !session.closed) {
        try {
          const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
          if (metadata && !metadata.isClosing && session.ping) {
            metadata.lastPingTime = Date.now();
            session.ping((err, duration) => {
              if (!err && metadata) {
                metadata.lastPingAck = Date.now();
                metadata.rtt = duration;
              }
            });
          }
        } catch {
          // Session ping failed
        }
      }
    }
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    const unhealthySessions: Http3Session[] = [];
    
    for (const [_sessionId, session] of this.connections) {
      if (!this.isConnectionHealthy(session)) {
        unhealthySessions.push(session);
      }
    }

    // 清理不健康的会话
    unhealthySessions.forEach(session => {
      this.removeConnection(session, 'Health check failed').catch(error => {
        this.logger.error('Error removing unhealthy session', {}, error);
      });
    });
  }

  /**
   * 更新会话统计信息（从 QUIC 库获取）
   */
  updateSessionStats(session: Http3Session, sessionId: string): void {
    const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
    if (!metadata || !session.getStats) return;

    try {
      const stats = session.getStats();
      metadata.bytesSent = stats.bytesSent;
      metadata.bytesReceived = stats.bytesReceived;
      metadata.packetsLost = stats.packetsLost;
      metadata.rtt = stats.rtt;
    } catch (error) {
      this.logger.warn('Failed to update session stats', {}, error);
    }
  }

  /**
   * 获取会话统计信息
   */
  getConnectionStats() {
    const stats = this.getMetrics();
    const activeSessions = this.getActiveConnectionCount();
    
    let availableSessions = 0;
    let totalActiveStreams = 0;
    let totalStreams = 0;
    let totalStreamErrors = 0;
    let closingSessions = 0;
    let totalBytesSent = 0;
    let totalBytesReceived = 0;
    let totalPacketsLost = 0;
    let avgRtt = 0;
    
    for (const [sessionId, _session] of this.connections) {
      const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
      
      if (metadata) {
        if (metadata.available && !metadata.isClosing) {
          availableSessions++;
        }
        
        if (metadata.isClosing) {
          closingSessions++;
        }
        
        totalActiveStreams += metadata.activeStreams;
        totalStreams += metadata.totalStreams;
        totalStreamErrors += metadata.streamErrors;
        totalBytesSent += metadata.bytesSent;
        totalBytesReceived += metadata.bytesReceived;
        totalPacketsLost += metadata.packetsLost;
        avgRtt += metadata.rtt;
      }
    }
    
    avgRtt = activeSessions > 0 ? avgRtt / activeSessions : 0;
    
    return {
      ...stats,
      availableSessions,
      closingSessions,
      totalActiveStreams,
      totalStreams,
      totalStreamErrors,
      totalBytesSent,
      totalBytesReceived,
      totalPacketsLost,
      averageRtt: avgRtt,
      averageStreamsPerSession: activeSessions > 0 ? totalActiveStreams / activeSessions : 0,
      utilizationRatio: this.config.maxConnections ? 
        activeSessions / this.config.maxConnections : 0,
      packetLossRate: totalBytesSent > 0 ? totalPacketsLost / (totalBytesSent / 1200) : 0  // 假设平均包大小1200字节
    };
  }

  /**
   * 获取会话详细信息
   */
  getSessionDetails(): Array<{
    id: string;
    remoteAddress: string;
    protocol: string;
    activeStreams: number;
    totalStreams: number;
    streamErrors: number;
    maxConcurrentStreams: number;
    isClosing: boolean;
    bytesSent: number;
    bytesReceived: number;
    packetsLost: number;
    rtt: number;
    age: number;
    idle: number;
  }> {
    const now = Date.now();
    const details: Array<any> = [];
    
    for (const [sessionId, metadata] of this.connectionMetadata) {
      const http3Metadata = metadata as Http3SessionMetadata;
      
      details.push({
        id: sessionId,
        remoteAddress: http3Metadata.remoteAddress || 'unknown',
        protocol: http3Metadata.protocol,
        activeStreams: http3Metadata.activeStreams,
        totalStreams: http3Metadata.totalStreams,
        streamErrors: http3Metadata.streamErrors,
        maxConcurrentStreams: http3Metadata.maxConcurrentStreams,
        isClosing: http3Metadata.isClosing,
        bytesSent: http3Metadata.bytesSent,
        bytesReceived: http3Metadata.bytesReceived,
        packetsLost: http3Metadata.packetsLost,
        rtt: http3Metadata.rtt,
        age: now - http3Metadata.createdAt,
        idle: now - http3Metadata.lastUsed
      });
    }
    
    return details;
  }

  /**
   * 优雅关闭会话
   */
  async gracefulCloseSession(session: Http3Session, timeout: number = 5000): Promise<void> {
    const sessionId = this.findHttp3SessionId(session);
    if (!sessionId) return;

    try {
      // 标记会话正在关闭
      const metadata = this.connectionMetadata.get(sessionId) as Http3SessionMetadata;
      if (metadata) {
        metadata.isClosing = true;
        metadata.available = false;
      }
      
      // 等待活跃流完成
      const streams = this.activeStreams.get(sessionId);
      if (streams && streams.size > 0) {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (streams.size === 0) {
              clearInterval(checkInterval);
              resolve(void 0);
            }
          }, 100);

          // 超时处理
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve(void 0);
          }, timeout);
        });
      }

      // 关闭会话
      if (!session.destroyed && !session.closed) {
        session.close(0, 'Graceful shutdown');
      }
    } catch (error) {
      this.logger.error('Error during graceful session close', {}, error);
    }
  }

  /**
   * 找到会话ID的辅助方法
   */
  private findHttp3SessionId(session: Http3Session): string | null {
    for (const [id, conn] of this.connections) {
      if (conn === session) return id;
    }
    return null;
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    try {
      // 清理所有流映射
      this.activeStreams.clear();
      
      // 清理定时器
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // 调用父类的销毁方法（会自动清理定时器）
      await super.destroy();
      
      this.logger.info('HTTP/3 connection pool destroyed');
    } catch (error) {
      this.logger.error('Error destroying HTTP/3 connection pool', {}, error);
      throw error;
    }
  }

  // ============= 实现抽象方法 =============

  /**
   * 设置协议特定的连接处理器
   */
  protected async setupProtocolSpecificHandlers(session: Http3Session): Promise<void> {
    // HTTP/3特定的处理器设置已在addHttp3Session中完成
    this.setupSessionEventHandlers(session);
  }

  /**
   * 协议特定的连接创建逻辑
   */
  protected async createProtocolConnection(_options: ConnectionRequestOptions): Promise<{ connection: Http3Session; metadata?: any } | null> {
    // HTTP/3会话由服务器被动接受，不主动创建
    return null;
  }
}

