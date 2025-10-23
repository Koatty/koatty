/*
 * @Description: HTTPS连接池管理器
 * @Usage: HTTPS协议的TLS连接池实现
 * @Author: richen
 * @Date: 2024-11-27 23:30:00
 * @LastEditTime: 2024-11-27 23:30:00
 */

import { 
  ConnectionPoolManager, 
  ConnectionRequestOptions
} from './pool';
import { ConnectionPoolConfig } from '../config/pool';
import { TLSSocket } from 'tls';

/**
 * HTTPS连接元数据
 */
interface HttpsConnectionMetadata {
  id: string;
  createdAt: number;
  lastUsed: number;
  available: boolean;
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
  protocol: string;
  cipher?: string;
  authorized: boolean;
  serverName?: string;
  certificate?: any;
  requestCount: number;
  bytesSent: number;
  bytesReceived: number;
  securityScore: number; // 安全评分 (0-100)
}

/**
 * HTTPS连接池管理器
 */
export class HttpsConnectionPoolManager extends ConnectionPoolManager<TLSSocket> {
  private securityMetrics = {
    totalHandshakes: 0,
    successfulHandshakes: 0,
    failedHandshakes: 0,
    averageHandshakeTime: 0
  };
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(config: ConnectionPoolConfig = {}) {
    super('https', config);
    
    // 启动定期清理和安全监控
    this.startCleanupTasks();
    this.startSecurityMonitoring();
  }

  /**
   * 验证HTTPS连接
   */
  protected validateConnection(connection: TLSSocket): boolean {
    return connection instanceof TLSSocket && 
           !connection.destroyed && 
           connection.readable && 
           connection.writable;
  }

  /**
   * 清理HTTPS连接
   */
  protected async cleanupConnection(connection: TLSSocket): Promise<void> {
    try {
      if (!connection.destroyed) {
        // 优雅关闭TLS连接
        connection.end();
        
        // 如果在合理时间内未关闭，强制销毁
        setTimeout(() => {
          if (!connection.destroyed) {
            connection.destroy();
          }
        }, 1000);
      }
    } catch (error) {
      this.logger.warn('Error cleaning up HTTPS connection', {}, error);
    }
  }

  /**
   * 获取可用连接
   */
  protected async getAvailableConnection(): Promise<{ connection: TLSSocket; id: string } | null> {
    for (const [id, metadata] of this.connectionMetadata) {
      if (metadata.available && this.isConnectionHealthy(this.connections.get(id)!)) {
        const connection = this.connections.get(id);
        if (connection) {
          // 标记为不可用
          metadata.available = false;
          metadata.lastUsed = Date.now();
          return { connection, id };
        }
      }
    }
    return null;
  }

  /**
   * 创建新连接
   */
  protected async createNewConnection(_options: ConnectionRequestOptions): Promise<{ connection: TLSSocket; id: string; metadata?: any } | null> {
    // HTTPS连接通常是被动接受的，这里返回null
    // 在实际的HTTPS服务器实现中，连接会通过server.on('secureConnection')事件添加
    return null;
  }

  /**
   * 检查连接是否健康
   */
  isConnectionHealthy(connection: TLSSocket): boolean {
    if (!connection) return false;
    
    const connectionId = this.findHttpsConnectionId(connection);
    if (!connectionId) return false;
    
    const metadata = this.connectionMetadata.get(connectionId) as HttpsConnectionMetadata;
    if (!metadata) return false;
    
    // 检查连接状态
    const isHealthy = !connection.destroyed && 
                     connection.readable && 
                     connection.writable &&
                     connection.authorized; // TLS特有的验证
    
    // 检查是否超时
    const now = Date.now();
    const idleTimeout = this.config.keepAliveTimeout || 5000;
    const isIdle = metadata.available && (now - metadata.lastUsed) > idleTimeout;
    
    return isHealthy && !isIdle;
  }

  /**
   * 添加HTTPS连接（由服务器调用）
   */
  async addHttpsConnection(connection: TLSSocket): Promise<boolean> {
    const handshakeStart = Date.now();
    
    try {
      // 等待TLS握手完成
      if (!connection.authorized && !connection.destroyed) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('TLS handshake timeout'));
          }, 10000);
          
          connection.once('secureConnect', () => {
            clearTimeout(timeout);
            resolve(void 0);
          });
          
          connection.once('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }
      
      const handshakeDuration = Date.now() - handshakeStart;
      this.updateSecurityMetrics(true, handshakeDuration, connection);
      
      const metadata: Partial<HttpsConnectionMetadata> = {
        remoteAddress: connection.remoteAddress,
        remotePort: connection.remotePort,
        localAddress: connection.localAddress,
        localPort: connection.localPort,
        protocol: 'https',
        cipher: connection.getCipher()?.name,
        authorized: connection.authorized,
        serverName: (connection as any).servername,
        certificate: connection.getPeerCertificate(),
        requestCount: 0,
        bytesSent: 0,
        bytesReceived: 0,
        securityScore: this.calculateSecurityScore(connection)
      };

      const success = await this.addConnection(connection, metadata);
      
      if (success) {
        this.setupConnectionEventHandlers(connection);
      }
      
      return success;
    } catch (error) {
      this.updateSecurityMetrics(false, Date.now() - handshakeStart);
      this.logger.error('Failed to add HTTPS connection', {}, error);
      return false;
    }
  }

  /**
   * 计算连接安全评分
   */
  private calculateSecurityScore(connection: TLSSocket): number {
    let score = 0;
    
    // 基础授权检查 (40分)
    if (connection.authorized) {
      score += 40;
    }
    
    // 协议版本检查 (20分)
    const protocol = connection.getProtocol();
    if (protocol === 'TLSv1.3') {
      score += 20;
    } else if (protocol === 'TLSv1.2') {
      score += 15;
    } else if (protocol === 'TLSv1.1') {
      score += 10;
    }
    
    // 加密套件检查 (20分)
    const cipher = connection.getCipher();
    if (cipher) {
      if (cipher.name.includes('AES')) score += 10;
      if (cipher.name.includes('GCM')) score += 5;
      if (cipher.name.includes('256')) score += 5;
    }
    
    // 证书检查 (20分)
    try {
      const cert = connection.getPeerCertificate();
      if (cert && cert.valid_to) {
        const expiry = new Date(cert.valid_to);
        const now = new Date();
        const daysToExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry > 90) score += 20;
        else if (daysToExpiry > 30) score += 15;
        else if (daysToExpiry > 7) score += 10;
        else score += 5;
      }
    } catch (error) {
      // 证书检查失败
      this.logger.error('Failed to calculate security score', {}, error);
    }
    
    return Math.min(score, 100);
  }

  /**
   * 更新安全指标
   */
  private updateSecurityMetrics(success: boolean, handshakeDuration: number, connection?: TLSSocket): void {
    this.securityMetrics.totalHandshakes++;
    
    if (!success) {
      this.securityMetrics.failedHandshakes++;
    }
    
    if (connection && !connection.authorized) {
      this.securityMetrics.failedHandshakes++;
    }
    
    // 更新平均握手时间
    this.securityMetrics.averageHandshakeTime = 
      (this.securityMetrics.averageHandshakeTime * (this.securityMetrics.totalHandshakes - 1) + handshakeDuration) 
      / this.securityMetrics.totalHandshakes;
  }

  /**
   * 设置连接事件处理器
   */
  private setupConnectionEventHandlers(connection: TLSSocket): void {
    const connectionId = this.findHttpsConnectionId(connection);
    if (!connectionId) return;

    // 处理连接关闭
    connection.on('close', () => {
      this.removeConnection(connection, 'Connection closed').catch(error => {
        this.logger.error('Error removing closed HTTPS connection', {}, error);
      });
    });

    // 处理连接错误
    connection.on('error', (error) => {
      this.logger.warn('HTTPS connection error', {}, { 
        connectionId, 
        error: error.message,
        authorized: connection.authorized
      });
      this.removeConnection(connection, `Connection error: ${error.message}`).catch(err => {
        this.logger.error('Error removing errored HTTPS connection', {}, err);
      });
    });

    // 处理TLS错误
    connection.on('tlsClientError', (error) => {
      this.logger.warn('TLS client error', {}, { 
        connectionId, 
        error: error.message 
      });
      this.securityMetrics.failedHandshakes++;
    });

    // 处理连接超时
    connection.on('timeout', () => {
      // HTTPS connection timeout handled
      this.removeConnection(connection, 'Connection timeout').catch(error => {
        this.logger.error('Error removing timed out HTTPS connection', {}, error);
      });
    });

    // 监控数据传输
    connection.on('data', (data) => {
      const metadata = this.connectionMetadata.get(connectionId) as HttpsConnectionMetadata;
      if (metadata) {
        metadata.bytesReceived += data.length;
        metadata.lastUsed = Date.now();
      }
    });

    // 设置超时
    const timeout = this.config.connectionTimeout || 30000;
    connection.setTimeout(timeout);
  }

  /**
   * 处理HTTPS请求完成
   */
  async handleRequestComplete(connection: TLSSocket, bytesSent: number = 0): Promise<void> {
    const connectionId = this.findHttpsConnectionId(connection);
    if (!connectionId) return;

    const metadata = this.connectionMetadata.get(connectionId) as HttpsConnectionMetadata;
    if (metadata) {
      metadata.requestCount++;
      metadata.bytesSent += bytesSent;
      metadata.lastUsed = Date.now();
      
      // 标记连接为可用
      metadata.available = true;
    }

    // 记录延迟
    this.recordLatency(Date.now() - metadata.lastUsed);
  }

  /**
   * 注册HTTPS特定的清理任务到统一监控器
   */
  private startCleanupTasks(): void {
    // 定期清理空闲连接
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // 每30秒
  }

  /**
   * 启动安全监控
   */
  private startSecurityMonitoring(): void {
    // 安全指标监控已启用（静默收集）
    // 实际的安全指标在每次连接建立时收集
  }

  /**
   * 清理空闲连接
   */
  private cleanupIdleConnections(): void {
    const now = Date.now();
    const maxIdleTime = this.config.keepAliveTimeout || 300000; // 默认5分钟
    const connectionsToRemove: Array<{ id: string; connection: TLSSocket }> = [];

    for (const [id, metadata] of this.connectionMetadata) {
      const typedMetadata = metadata as HttpsConnectionMetadata;
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
        this.logger.error('Error cleaning up idle HTTPS connection', {}, error);
      });
    });

    // Idle HTTPS connections cleaned up silently (if any)
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats() {
    const stats = {
      total: this.connections.size,
      active: this.getActiveConnectionCount(),
      available: 0,
      authorized: 0,
      unauthorized: 0,
      totalRequests: 0,
      totalBytesSent: 0,
      totalBytesReceived: 0,
      averageSecurityScore: 0,
      protocols: {} as Record<string, number>,
      ciphers: {} as Record<string, number>
    };

    let totalSecurityScore = 0;

    for (const [_id, metadata] of this.connectionMetadata) {
      const typedMetadata = metadata as HttpsConnectionMetadata;
      
      if (typedMetadata.available) stats.available++;
      if (typedMetadata.authorized) stats.authorized++;
      else stats.unauthorized++;
      
      stats.totalRequests += typedMetadata.requestCount;
      stats.totalBytesSent += typedMetadata.bytesSent;
      stats.totalBytesReceived += typedMetadata.bytesReceived;
      totalSecurityScore += typedMetadata.securityScore;
      
      // 协议统计
      const protocol = typedMetadata.protocol || 'unknown';
      stats.protocols[protocol] = (stats.protocols[protocol] || 0) + 1;
      
      // 加密套件统计
      const cipher = typedMetadata.cipher || 'unknown';
      stats.ciphers[cipher] = (stats.ciphers[cipher] || 0) + 1;
    }

    stats.averageSecurityScore = this.connections.size > 0 
      ? totalSecurityScore / this.connections.size 
      : 0;

    return {
      ...stats,
      security: this.securityMetrics
    };
  }

  /**
   * 获取安全指标
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      connectionSecurityScores: Array.from(this.connectionMetadata.values())
        .map((metadata: any) => ({
          id: metadata.id,
          securityScore: metadata.securityScore,
          authorized: metadata.authorized,
          cipher: metadata.cipher,
          protocol: metadata.protocol
        }))
    };
  }

  /**
   * 设置Keep-Alive超时
   */
  setKeepAliveTimeout(timeout: number): void {
    this.config.keepAliveTimeout = timeout;
    // HTTPS keep-alive timeout updated
  }

  /**
   * 获取连接详情
   */
  getConnectionDetails(): Array<{
    id: string;
    remoteAddress: string;
    protocol: string;
    cipher: string;
    authorized: boolean;
    securityScore: number;
    requestCount: number;
    bytesSent: number;
    bytesReceived: number;
    age: number;
    idle: number;
  }> {
    const now = Date.now();
    return Array.from(this.connectionMetadata.entries()).map(([id, metadata]) => {
      const typedMetadata = metadata as HttpsConnectionMetadata;
      return {
        id,
        remoteAddress: typedMetadata.remoteAddress || 'unknown',
        protocol: typedMetadata.protocol,
        cipher: typedMetadata.cipher || 'unknown',
        authorized: typedMetadata.authorized,
        securityScore: typedMetadata.securityScore,
        requestCount: typedMetadata.requestCount,
        bytesSent: typedMetadata.bytesSent,
        bytesReceived: typedMetadata.bytesReceived,
        age: now - typedMetadata.createdAt,
        idle: now - typedMetadata.lastUsed
      };
    });
  }

  /**
   * 查找HTTPS连接ID
   */
  private findHttpsConnectionId(connection: TLSSocket): string | null {
    for (const [id, conn] of this.connections) {
      if (conn === connection) return id;
    }
    return null;
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    await super.destroy();
    this.logger.info('HTTPS connection pool destroyed');
  }

  // ============= 实现抽象方法 =============

  /**
   * 设置协议特定的连接处理器
   */
  protected async setupProtocolSpecificHandlers(connection: TLSSocket): Promise<void> {
    // HTTPS特定的处理器设置已在addHttpsConnection中完成
    this.setupConnectionEventHandlers(connection);
  }

  /**
   * 协议特定的连接创建逻辑
   */
  protected async createProtocolConnection(_options: ConnectionRequestOptions): Promise<{ connection: TLSSocket; metadata?: any } | null> {
    // HTTPS连接由服务器被动接受，不主动创建
    return null;
  }
} 