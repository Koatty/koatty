/*
 * @Description: HTTP/2连接池管理器
 * @Usage: HTTP/2协议的连接池实现
 * @Author: richen
 * @Date: 2024-11-27 22:00:00
 * @LastEditTime: 2024-11-27 22:00:00
 */

import { 
  Http2Session, 
  Http2Stream,
  constants as http2Constants
} from 'http2';
import { TLSSocket } from 'tls';
import { 
  ConnectionPoolManager, 
  ConnectionRequestOptions
} from './pool';
import { ConnectionPoolConfig } from '../config/pool';

/**
 * HTTP/2会话元数据
 */
interface Http2SessionMetadata {
  id: string;
  createdAt: number;
  lastUsed: number;
  available: boolean;
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
  encrypted: boolean;
  protocol: string;
  activeStreams: number;
  totalStreams: number;
  maxConcurrentStreams: number;
  initialWindowSize: number;
  streamErrors: number;
  isGoingAway: boolean;
  lastPingTime?: number;
  lastPingAck?: number;
  settings: Record<string, any>;
}

/**
 * HTTP/2连接池管理器
 */
export class Http2ConnectionPoolManager extends ConnectionPoolManager<Http2Session> {
  private readonly activeStreams = new Map<string, Set<Http2Stream>>();
  private pingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ConnectionPoolConfig = {}) {
    super('http2', config);
    
    // 启动HTTP/2特有的监控任务
    this.startHttp2MonitoringTasks();
  }

  /**
   * 验证HTTP/2会话
   */
  protected validateConnection(session: Http2Session): boolean {
    return session && 
           !session.destroyed && 
           !session.closed &&
           session.state &&
           session.state.effectiveLocalWindowSize > 0;
  }

  /**
   * 清理HTTP/2会话
   */
  protected async cleanupConnection(session: Http2Session): Promise<void> {
    try {
      const sessionId = this.findHttp2SessionId(session);
      if (sessionId) {
        // 清理活跃流
        const streams = this.activeStreams.get(sessionId);
        if (streams) {
          for (const stream of streams) {
            try {
              if (!stream.destroyed) {
                stream.close(http2Constants.NGHTTP2_CANCEL);
              }
            } catch {
              // Stream close error handled silently
            }
          }
          this.activeStreams.delete(sessionId);
        }
      }

      if (!session.destroyed && !session.closed) {
        session.close();
      }
    } catch (error) {
      this.logger.warn('Error cleaning up HTTP/2 session', {}, error);
    }
  }

  /**
   * 获取可用会话
   */
  protected async getAvailableConnection(): Promise<{ connection: Http2Session; id: string } | null> {
    for (const [id, metadata] of this.connectionMetadata) {
      const http2Metadata = metadata as Http2SessionMetadata;
      
      // 检查会话是否可用且有容量
      if (http2Metadata.available && 
          !http2Metadata.isGoingAway &&
          http2Metadata.activeStreams < http2Metadata.maxConcurrentStreams &&
          this.isConnectionHealthy(this.connections.get(id)!)) {
        
        const session = this.connections.get(id);
        if (session) {
          // 更新使用时间
          http2Metadata.lastUsed = Date.now();
          return { connection: session, id };
        }
      }
    }
    return null;
  }

  /**
   * 创建新连接 - HTTP/2会话通常是被动接受的
   */
  protected async createNewConnection(_options: ConnectionRequestOptions): Promise<{ connection: Http2Session; id: string; metadata?: any } | null> {
    // HTTP/2会话通常是被动接受的，这里返回null
    // 在实际的HTTP/2服务器实现中，会话会通过server.on('session')事件添加
    return null;
  }

  /**
   * 检查会话是否健康
   */
  isConnectionHealthy(session: Http2Session): boolean {
    if (!session) return false;
    
    const sessionId = this.findHttp2SessionId(session);
    if (!sessionId) return false;
    
    const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
    if (!metadata) return false;
    
    // 检查会话状态
    const isSessionHealthy = !session.destroyed && 
                            !session.closed &&
                            !metadata.isGoingAway &&
                            session.state &&
                            session.state.effectiveLocalWindowSize > 0;
    
    // 检查ping响应时间
    const now = Date.now();
    const pingTimeout = this.config.protocolSpecific?.keepAliveTime || 30000;
    
    if (metadata.lastPingTime && !metadata.lastPingAck) {
      if (now - metadata.lastPingTime > pingTimeout) {
        return false;
      }
    }
    
    return isSessionHealthy;
  }

  /**
   * 添加HTTP/2会话（由服务器调用）
   */
  async addHttp2Session(session: Http2Session): Promise<boolean> {
    const socket = session.socket as TLSSocket;
    
    // 获取会话设置
    const settings = session.localSettings || {};
    
    const metadata: Partial<Http2SessionMetadata> = {
      remoteAddress: socket?.remoteAddress,
      remotePort: socket?.remotePort,
      localAddress: socket?.localAddress,
      localPort: socket?.localPort,
      encrypted: socket instanceof TLSSocket,
      protocol: 'http2',
      activeStreams: 0,
      totalStreams: 0,
      maxConcurrentStreams: settings.maxConcurrentStreams || 100,
      initialWindowSize: settings.initialWindowSize || 65535,
      streamErrors: 0,
      isGoingAway: false,
      settings: settings
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
  private setupSessionEventHandlers(session: Http2Session): void {
    const sessionId = this.findHttp2SessionId(session);
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
      this.logger.warn('HTTP/2 session error', {}, { 
        sessionId, 
        error: error.message 
      });
      this.removeConnection(session, `Session error: ${error.message}`).catch(err => {
        this.logger.error('Error removing errored session', {}, err);
      });
    });

    // 处理GOAWAY帧
    session.on('goaway', (errorCode, lastStreamID, opaqueData) => {
      const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
      if (metadata) {
        metadata.isGoingAway = true;
        metadata.available = false;
      }
      
      this.logger.info('HTTP/2 session received GOAWAY', {}, {
        sessionId,
        errorCode,
        lastStreamID,
        opaqueData: opaqueData?.toString()
      });
      
      // 延迟关闭会话以允许正在进行的流完成
      setTimeout(() => {
        this.removeConnection(session, `GOAWAY received: ${errorCode}`).catch(error => {
          this.logger.error('Error removing GOAWAY session', {}, error);
        });
      }, 5000);
    });

    // 处理流创建
    session.on('stream', (stream: Http2Stream, headers) => {
      this.handleNewStream(sessionId, stream, headers);
    });

    // 处理ping响应
    session.on('ping', (_payload: any) => {
      const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
      if (metadata) {
        metadata.lastPingAck = Date.now();
      }
    });

    // 处理设置更新
    session.on('localSettings', (settings) => {
      const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
      if (metadata) {
        metadata.settings = { ...metadata.settings, ...settings };
        metadata.maxConcurrentStreams = settings.maxConcurrentStreams || metadata.maxConcurrentStreams;
        metadata.initialWindowSize = settings.initialWindowSize || metadata.initialWindowSize;
      }
    });

    // 设置定期ping
    this.startSessionPing(session, sessionId);
  }

  /**
   * 处理新流
   */
  private handleNewStream(sessionId: string, stream: Http2Stream, _headers: any): void {
    const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
    if (!metadata) return;

    const streams = this.activeStreams.get(sessionId);
    if (streams) {
      streams.add(stream);
      metadata.activeStreams = streams.size;
      metadata.totalStreams++;
      metadata.lastUsed = Date.now();

      // HTTP/2 stream created

      // 处理流事件
      stream.on('close', () => {
        streams.delete(stream);
        metadata.activeStreams = streams.size;
        
        // HTTP/2 stream closed
      });

      stream.on('error', (error) => {
        metadata.streamErrors++;
        streams.delete(stream);
        metadata.activeStreams = streams.size;
        
        this.logger.warn('HTTP/2 stream error', {}, {
          sessionId,
          streamId: stream.id,
          error: error.message,
          totalStreamErrors: metadata.streamErrors
        });
      });

      // 记录延迟
      const startTime = Date.now();
      stream.on('close', () => {
        const latency = Date.now() - startTime;
        this.recordLatency(latency);
      });
    }
  }

  /**
   * 启动会话ping（保留在TimerManager中，因为是动态创建的）
   */
  private startSessionPing(session: Http2Session, sessionId: string): void {
    const pingInterval = this.config.protocolSpecific?.keepAliveTime || 30000;
    
    const pingTimer = setInterval(() => {
      if (session.destroyed || session.closed) {
        clearInterval(pingTimer);
        return;
      }

      try {
        const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
        if (metadata) {
          metadata.lastPingTime = Date.now();
          session.ping((err, _duration, _payload) => {
            if (!err && metadata) {
              metadata.lastPingAck = Date.now();
            }
          });
        }
      } catch {
        // Ping error handled silently
      }
    }, pingInterval);
  }

  /**
   * 启动HTTP/2监控任务
   */
  private startHttp2MonitoringTasks(): void {
    // Ping间隔
    const pingInterval = this.config.protocolSpecific?.keepAliveTime || 30000;
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
          const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
          if (metadata && !metadata.isGoingAway) {
            metadata.lastPingTime = Date.now();
            session.ping((err, _duration, _payload) => {
              if (!err && metadata) {
                metadata.lastPingAck = Date.now();
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
    const unhealthySessions: Http2Session[] = [];
    
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

    // Unhealthy HTTP/2 sessions cleaned up silently (if any)
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
    let goingAwaySessions = 0;
    
    for (const [sessionId, _session] of this.connections) {
      const metadata = this.connectionMetadata.get(sessionId) as Http2SessionMetadata;
      
      if (metadata) {
        if (metadata.available && !metadata.isGoingAway) {
          availableSessions++;
        }
        
        if (metadata.isGoingAway) {
          goingAwaySessions++;
        }
        
        totalActiveStreams += metadata.activeStreams;
        totalStreams += metadata.totalStreams;
        totalStreamErrors += metadata.streamErrors;
      }
    }
    
    return {
      ...stats,
      availableSessions,
      goingAwaySessions,
      totalActiveStreams,
      totalStreams,
      totalStreamErrors,
      averageStreamsPerSession: activeSessions > 0 ? totalActiveStreams / activeSessions : 0,
      utilizationRatio: this.config.maxConnections ? 
        activeSessions / this.config.maxConnections : 0
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
    isGoingAway: boolean;
    age: number;
    idle: number;
  }> {
    const now = Date.now();
    const details: Array<any> = [];
    
    for (const [sessionId, metadata] of this.connectionMetadata) {
      const http2Metadata = metadata as Http2SessionMetadata;
      
      details.push({
        id: sessionId,
        remoteAddress: http2Metadata.remoteAddress || 'unknown',
        protocol: http2Metadata.protocol,
        activeStreams: http2Metadata.activeStreams,
        totalStreams: http2Metadata.totalStreams,
        streamErrors: http2Metadata.streamErrors,
        maxConcurrentStreams: http2Metadata.maxConcurrentStreams,
        isGoingAway: http2Metadata.isGoingAway,
        age: now - http2Metadata.createdAt,
        idle: now - http2Metadata.lastUsed
      });
    }
    
    return details;
  }

  /**
   * 优雅关闭会话
   */
  async gracefulCloseSession(session: Http2Session, timeout: number = 5000): Promise<void> {
    const sessionId = this.findHttp2SessionId(session);
    if (!sessionId) return;

    try {
      // 发送GOAWAY帧
      session.goaway(0, 0, Buffer.from('Server shutdown'));
      
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
        session.close();
      }
    } catch (error) {
      this.logger.error('Error during graceful session close', {}, error);
    }
  }

  /**
   * 找到会话ID的辅助方法
   */
  private findHttp2SessionId(session: Http2Session): string | null {
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
      
      // 调用父类的销毁方法（会自动清理定时器）
      await super.destroy();
      
      this.logger.info('HTTP/2 connection pool destroyed');
    } catch (error) {
      this.logger.error('Error destroying HTTP/2 connection pool', {}, error);
      throw error;
    }
  }

  // ============= 实现抽象方法 =============

  /**
   * 设置协议特定的连接处理器
   */
  protected async setupProtocolSpecificHandlers(session: Http2Session): Promise<void> {
    // HTTP/2特定的处理器设置已在addHttp2Session中完成
    this.setupSessionEventHandlers(session);
  }

  /**
   * 协议特定的连接创建逻辑
   */
  protected async createProtocolConnection(_options: ConnectionRequestOptions): Promise<{ connection: Http2Session; metadata?: any } | null> {
    // HTTP/2会话由服务器被动接受，不主动创建
    return null;
  }
} 