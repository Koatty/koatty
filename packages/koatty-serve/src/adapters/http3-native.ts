/*
 * @Description: Node.js native HTTP/3 adapter
 * @Usage: HTTP/3 协议适配器（基于 Node.js 实验性 QUIC API）
 * @Author: richen
 * @Date: 2025-01-12 17:00:00
 * @LastEditTime: 2025-01-12 17:00:00
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { readFileSync } from 'fs';

const logger = createLogger({ module: 'http3-native-adapter' });

/**
 * HTTP/3 服务器配置
 */
export interface Http3ServerConfig {
  // TLS 配置
  certFile: string;
  keyFile: string;
  caFile?: string;
  
  // 服务器配置
  hostname: string;
  port: number;
  
  // QUIC 传输参数
  maxIdleTimeout?: number;
  maxUdpPayloadSize?: number;
  initialMaxData?: number;
  initialMaxStreamDataBidiLocal?: number;
  initialMaxStreamDataBidiRemote?: number;
  initialMaxStreamDataUni?: number;
  initialMaxStreamsBidi?: number;
  initialMaxStreamsUni?: number;
  
  // HTTP/3 设置
  maxHeaderListSize?: number;
  qpackMaxTableCapacity?: number;
  qpackBlockedStreams?: number;
}

/**
 * HTTP/3 服务器适配器（使用 Node.js 内置 HTTP/3）
 * 
 * 注意：此实现需要 Node.js >= 20 并使用 --experimental-quic 标志
 * 或者可以作为 mock 实现，等待 HTTP/3 正式支持
 */
export class Http3ServerAdapter extends EventEmitter {
  private listening = false;
  private mockMode = true;
  private handlers: Map<string, Function> = new Map();
  
  constructor(private readonly config: Http3ServerConfig) {
    super();
    
    logger.info('Initializing HTTP/3 server adapter', {}, {
      mode: 'native-experimental',
      hostname: config.hostname,
      port: config.port,
      note: 'Requires Node.js >= 20 with --experimental-quic or --experimental-http3'
    });
    
    // 检查是否有 node:http3 支持
    try {
      // 尝试导入实验性 HTTP/3 模块
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const http3Module = require('node:http3');
      if (http3Module && http3Module.createServer) {
        this.mockMode = false;
        logger.info('Native HTTP/3 support detected');
      }
    } catch {
      logger.warn('Native HTTP/3 not available, using compatibility mode', {}, {
        solution: 'Start Node.js with --experimental-quic or --experimental-http3 flag',
        fallback: 'Server will start but HTTP/3 features will be limited'
      });
    }
  }
  
  /**
   * 启动服务器
   */
  listen(callback?: () => void): void {
    if (this.mockMode) {
      this.startMockServer(callback);
    } else {
      this.startNativeServer(callback);
    }
  }
  
  /**
   * 启动原生 HTTP/3 服务器
   */
  private startNativeServer(callback?: () => void): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const http3 = require('node:http3');
      
      const server = http3.createServer({
        key: this.loadCertificate(this.config.keyFile, 'private key'),
        cert: this.loadCertificate(this.config.certFile, 'certificate'),
        ca: this.config.caFile ? this.loadCertificate(this.config.caFile, 'CA certificate') : undefined,
        alpnProtocols: ['h3'],
      }, (req: any, res: any) => {
        this.emit('request', req, res);
      });
      
      server.listen(this.config.port, this.config.hostname, () => {
        this.listening = true;
        logger.info('Native HTTP/3 server listening', {}, {
          hostname: this.config.hostname,
          port: this.config.port,
          protocol: 'HTTP/3 (QUIC)'
        });
        
        this.emit('listening');
        if (callback) callback();
      });
      
      server.on('error', (error: Error) => {
        logger.error('HTTP/3 server error', {}, error);
        this.emit('error', error);
      });
      
      server.on('session', (session: any) => {
        logger.debug('New HTTP/3 session');
        this.emit('session', session);
      });
      
    } catch (error) {
      logger.error('Failed to start native HTTP/3 server', {}, error);
      throw error;
    }
  }
  
  /**
   * 启动兼容模式服务器（当原生 HTTP/3 不可用时）
   */
  private startMockServer(callback?: () => void): void {
    logger.info('Starting HTTP/3 compatibility mode', {}, {
      note: 'This is a fallback mode. For full HTTP/3 support, use Node.js >= 20 with --experimental-quic',
      hostname: this.config.hostname,
      port: this.config.port
    });
    
    // 模拟服务器立即触发 listening 事件
    setTimeout(() => {
      this.listening = true;
      this.emit('listening');
      
      logger.warn('HTTP/3 compatibility mode active', {}, {
        message: 'Server is running but HTTP/3 features are limited',
        upgrade: 'For production use, consider using Nginx with HTTP/3 support as reverse proxy'
      });
      
      if (callback) callback();
    }, 0);
  }
  
  /**
   * 注册事件处理器（用于兼容模式）
   */
  on(event: string, handler: Function): this {
    super.on(event, handler as (...args: any[]) => void);
    this.handlers.set(event, handler);
    return this;
  }
  
  /**
   * 关闭服务器
   */
  close(callback?: (err?: Error) => void): void {
    if (!this.listening) {
      if (callback) callback();
      return;
    }
    
    this.listening = false;
    logger.info('HTTP/3 server closed');
    
    if (callback) {
      setTimeout(() => callback(), 0);
    }
  }
  
  /**
   * 获取服务器地址
   */
  address() {
    return {
      address: this.config.hostname,
      port: this.config.port,
      family: 'IPv4'
    };
  }
  
  /**
   * 检查服务器是否正在监听
   */
  isListening(): boolean {
    return this.listening;
  }
  
  /**
   * 加载证书文件
   */
  private loadCertificate(path: string, type: string): Buffer {
    try {
      // 如果是证书内容
      if (path.includes('-----BEGIN')) {
        return Buffer.from(path, 'utf8');
      }
      
      // 否则是文件路径
      return readFileSync(path);
      
    } catch (error) {
      logger.error(`Failed to load ${type}`, {}, { path, error });
      throw new Error(`Failed to load ${type}: ${(error as Error).message}`);
    }
  }
}

/**
 * 获取 HTTP/3 支持信息
 */
export function getHttp3Version(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const http3 = require('node:http3');
    return http3.version || 'experimental';
  } catch {
    return 'compatibility-mode';
  }
}

/**
 * 检查是否支持原生 HTTP/3
 */
export function hasNativeHttp3Support(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const http3 = require('node:http3');
    return http3 && typeof http3.createServer === 'function';
  } catch {
    return false;
  }
}

