/*
 * @Description: HTTP/3 adapter using @matrixai/quic
 * @Usage: HTTP/3 协议适配器（基于 @matrixai/quic QUIC 传输层）
 * @Author: richen
 * @Date: 2025-01-12 17:30:00
 * @LastEditTime: 2025-01-12 17:30:00
 */

import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { readFileSync } from 'fs';
import { QPACKEncoder, QPACKDecoder } from '../utils/http3/qpack'; 
import { Http3FrameParser, Http3MessageHandler } from '../utils/http3/frames';

// 使用 require 导入 @matrixai/quic 以绕过模块解析问题
// 作为可选依赖，如果未安装则返回 null
let matrixaiQuic: any = null;
let QUICServer: any = null;
const logger = createLogger({ module: 'http3-matrixai-adapter' });

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  matrixaiQuic = require('@matrixai/quic');
  QUICServer = matrixaiQuic.QUICServer;
} catch { 
  // @matrixai/quic 未安装，HTTP/3 功能将不可用
  // 这是预期的行为，因为它是可选依赖
  logger.warn('@matrixai/quic is not installed, HTTP/3 functionality will be disabled');
}


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
 * HTTP/3 服务器适配器（基于 @matrixai/quic）
 * 
 * 注意：@matrixai/quic 提供 QUIC 传输层，我们在此基础上实现 HTTP/3 应用层协议
 */
export class Http3ServerAdapter extends EventEmitter {
  private quicServer: any = null;
  private listening = false;
  private connections: Map<string, any> = new Map();
  private qpackEncoder: QPACKEncoder;
  private qpackDecoder: QPACKDecoder;
  
  constructor(private readonly config: Http3ServerConfig) {
    super();
    
    // 检查 @matrixai/quic 是否可用
    if (!QUICServer) {
      throw new Error(
        '@matrixai/quic is not installed. ' +
        'HTTP/3 functionality requires @matrixai/quic library. ' +
        'Install it with: pnpm add @matrixai/quic'
      );
    }
    
    // 初始化 QPACK 编码器和解码器
    const maxTableCapacity = config.qpackMaxTableCapacity || 4096;
    this.qpackEncoder = new QPACKEncoder(maxTableCapacity);
    this.qpackDecoder = new QPACKDecoder(maxTableCapacity);
    
    logger.info('Initializing HTTP/3 server adapter', {}, {
      library: '@matrixai/quic',
      hostname: config.hostname,
      port: config.port,
      qpackMaxTableCapacity: maxTableCapacity,
      note: 'Using MatrixAI QUIC transport with full HTTP/3 frame parsing and QPACK compression'
    });
  }
  
  /**
   * 启动服务器
   */
  async listen(callback?: () => void): Promise<void> {
    try {
      // 准备 TLS 配置
      const cert = this.loadCertificate(this.config.certFile, 'certificate');
      const key = this.loadCertificate(this.config.keyFile, 'private key');
      const ca = this.config.caFile ? this.loadCertificate(this.config.caFile, 'CA certificate') : undefined;
      
      // 创建加密密钥（用于 address token 签名）
      const cryptoKeyBuffer = Buffer.alloc(32);
      // 在生产环境中应该使用安全的随机密钥
      crypto.getRandomValues(cryptoKeyBuffer);
      const cryptoKey: ArrayBuffer = cryptoKeyBuffer.buffer.slice(cryptoKeyBuffer.byteOffset, cryptoKeyBuffer.byteOffset + cryptoKeyBuffer.byteLength) as ArrayBuffer;
      
      // 创建服务器加密对象
      const serverCrypto = {
        key: cryptoKey,
        ops: {
          sign: async (key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> => {
            // 使用 HMAC 签名
            const crypto = await import('crypto');
            const hmac = crypto.createHmac('sha256', Buffer.from(key));
            hmac.update(Buffer.from(data));
            const digest = hmac.digest();
            return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength) as ArrayBuffer;
          },
          verify: async (key: ArrayBuffer, data: ArrayBuffer, sig: ArrayBuffer): Promise<boolean> => {
            // 验证 HMAC 签名
            const crypto = await import('crypto');
            const hmac = crypto.createHmac('sha256', Buffer.from(key));
            hmac.update(Buffer.from(data));
            const expected = hmac.digest();
            return Buffer.from(sig).equals(expected);
          }
        }
      };
      
      // 创建 QUIC 服务器
      this.quicServer = new QUICServer({
        crypto: serverCrypto as any,
        config: {
          key: key.toString('utf8'),
          cert: cert.toString('utf8'),
          ca: ca ? ca.toString('utf8') : undefined,
          verifyPeer: false, // HTTP/3 服务器通常不验证客户端证书
          maxIdleTimeout: this.config.maxIdleTimeout || 30000,
          maxConcurrentBidiStreams: this.config.initialMaxStreamsBidi || 100,
          maxConcurrentUniStreams: this.config.initialMaxStreamsUni || 100,
        } as any,
        logger: logger as any,
      });
      
      // 设置连接处理器
      this.setupConnectionHandlers();
      
      // 启动服务器
      await this.quicServer.start({
        host: this.config.hostname,
        port: this.config.port
      });
      
      this.listening = true;
      
      logger.info('HTTP/3 server listening', {}, {
        hostname: this.config.hostname,
        port: this.config.port,
        protocol: 'HTTP/3 over QUIC',
        implementation: '@matrixai/quic'
      });
      
      this.emit('listening');
      
      if (callback) {
        callback();
      }
      
    } catch (error) {
      logger.error('Failed to start HTTP/3 server', {}, error);
      throw error;
    }
  }
  
  /**
   * 设置连接处理器
   */
  private setupConnectionHandlers(): void {
    if (!this.quicServer) return;
    
    // 监听新连接
    this.quicServer.addEventListener('connection', (event: any) => {
      const connection = event.detail;
      const connId = connection.connectionId.toString();
      
      logger.debug('New QUIC connection', {}, { connectionId: connId });
      
      this.connections.set(connId, connection);
      this.emit('session', connection);
      
      // 监听连接上的流
      connection.addEventListener('stream', (streamEvent: any) => {
        const stream = streamEvent.detail;
        this.handleStream(connection, stream);
      });
      
      // 监听连接关闭
      connection.addEventListener('closed', () => {
        logger.debug('QUIC connection closed', {}, { connectionId: connId });
        this.connections.delete(connId);
      });
    });
    
    // 监听服务器错误
    this.quicServer.addEventListener('error', (event: any) => {
      const error = event.detail;
      logger.error('QUIC server error', {}, error);
      this.emit('error', error);
    });
  }
  
  /**
   * 处理 QUIC 流（HTTP/3 请求）
   */
  private async handleStream(connection: any, stream: any): Promise<void> {
    try {
      logger.debug('New QUIC stream', {}, {
        streamId: stream.streamId.toString(),
        readable: stream.readable,
        writable: stream.writable
      });
      
      // 读取流数据（HTTP/3 帧）
      const chunks: Buffer[] = [];
      const reader = stream.readable.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(Buffer.from(value));
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      const requestData = Buffer.concat(chunks);
      
      // 使用完整的 HTTP/3 帧解析
      const { frames } = Http3FrameParser.parse(requestData);
      
      if (frames.length === 0) {
        logger.warn('No HTTP/3 frames parsed from stream');
        return;
      }
      
      // 提取 HTTP 请求
      const extractedRequest = Http3MessageHandler.extractRequest(frames, this.qpackDecoder);
      
      if (!extractedRequest) {
        logger.warn('Failed to extract HTTP request from frames');
        return;
      }
      
      // 创建标准的 HTTP 请求/响应对象
      const request = this.createHttpRequest(extractedRequest, stream);
      const response = this.createHttp3Response(stream, extractedRequest);
      
      // 触发请求事件
      this.emit('request', request, response);
      
    } catch (error) {
      logger.error('Error handling QUIC stream', {}, error);
      
      // 发送错误响应
      try {
        await this.sendErrorResponse(stream, 500, 'Internal Server Error');
      } catch {
        // 忽略响应发送失败
      }
    }
  }
  
  /**
   * 创建标准 HTTP 请求对象
   */
  private createHttpRequest(extractedRequest: any, stream: any): any {
    const req: any = {
      method: extractedRequest.method,
      url: extractedRequest.url,
      headers: extractedRequest.headers,
      httpVersion: '3.0',
      httpVersionMajor: 3,
      httpVersionMinor: 0,
      body: extractedRequest.body,
      rawBody: extractedRequest.body,
      stream,
      
      // 兼容 Node.js IncomingMessage
      connection: null,
      socket: null,
      complete: true,
      readable: false,
    };
    
    return req;
  }
  
  /**
   * 创建 HTTP/3 响应对象（使用完整的帧序列化和 QPACK）
   */
  private createHttp3Response(stream: any, _request: any): any {
    // 保存 this 引用以便在回调中使用
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const response: any = {
      statusCode: 200,
      statusMessage: 'OK',
      headers: {},
      headersSent: false,
      finished: false,
      _dataChunks: [] as Buffer[],
      
      setHeader: (name: string, value: string | string[]) => {
        if (response.headersSent) {
          throw new Error('Cannot set headers after they are sent');
        }
        response.headers[name.toLowerCase()] = value;
      },
      
      getHeader: (name: string) => {
        return response.headers[name.toLowerCase()];
      },
      
      getHeaders: () => {
        return { ...response.headers };
      },
      
      writeHead: (statusCode: number, statusMessage?: any, headers?: any) => {
        if (response.headersSent) {
          return response;
        }
        
        if (typeof statusMessage === 'object') {
          headers = statusMessage;
          statusMessage = undefined;
        }
        
        response.statusCode = statusCode;
        if (statusMessage) response.statusMessage = statusMessage;
        if (headers) {
          Object.assign(response.headers, headers);
        }
        
        response.headersSent = true;
        return response;
      },
      
      write: (chunk: any, encoding?: any, callback?: any) => {
        if (typeof encoding === 'function') {
          callback = encoding;
          encoding = 'utf8';
        }
        
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        response._dataChunks.push(buffer);
        
        if (callback) {
          process.nextTick(callback);
        }
        return true;
      },
      
      end: async (chunk?: any, encoding?: any, callback?: any) => {
        if (typeof chunk === 'function') {
          callback = chunk;
          chunk = null;
          encoding = null;
        } else if (typeof encoding === 'function') {
          callback = encoding;
          encoding = null;
        }
        
        if (response.finished) {
          if (callback) callback();
          return response;
        }
        
        // 添加最后的数据块
        if (chunk) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || 'utf8');
          response._dataChunks.push(buffer);
        }
        
        // 合并所有数据块
        const body = Buffer.concat(response._dataChunks);
        
        try {
          // 使用 HTTP/3 帧序列化和 QPACK 编码发送响应
          await self.sendHttp3Response(stream, response.statusCode, response.headers, body);
          response.finished = true;
        } catch (error) {
          logger.error('Failed to send HTTP/3 response', {}, error);
        }
        
        if (callback) callback();
        return response;
      }
    };
    
    return response;
  }
  
  /**
   * 发送完整的 HTTP/3 响应（使用帧序列化和 QPACK）
   */
  private async sendHttp3Response(
    stream: any,
    statusCode: number,
    headers: Record<string, string | string[]>,
    body: Buffer
  ): Promise<void> {
    try {
      // 使用 HTTP/3 消息处理器创建响应帧
      const frameBuffers = Http3MessageHandler.createResponse(
        statusCode,
        headers,
        body,
        this.qpackEncoder
      );
      
      // 写入所有帧到 QUIC 流
      const writer = stream.writable.getWriter();
      try {
        for (const frameBuffer of frameBuffers) {
          await writer.write(new Uint8Array(frameBuffer));
        }
        await writer.close();
        
        logger.debug('HTTP/3 response sent', {}, {
          statusCode,
          bodyLength: body.length,
          framesCount: frameBuffers.length
        });
      } finally {
        writer.releaseLock();
      }
    } catch (error) {
      logger.error('Failed to send HTTP/3 response', {}, error);
      throw error;
    }
  }
  
  /**
   * 发送错误响应
   */
  private async sendErrorResponse(stream: any, statusCode: number, message: string): Promise<void> {
    const body = Buffer.from(message, 'utf8');
    const headers = {
      'content-type': 'text/plain',
      'content-length': body.length.toString()
    };
    
    await this.sendHttp3Response(stream, statusCode, headers, body);
  }
  
  /**
   * 关闭服务器
   */
  async close(callback?: (err?: Error) => void): Promise<void> {
    if (!this.listening || !this.quicServer) {
      if (callback) callback();
      return;
    }
    
    try {
      // 关闭所有连接
      for (const connection of this.connections.values()) {
        try {
          await connection.stop();
        } catch (error) {
          logger.warn('Error closing connection', {}, error);
        }
      }
      this.connections.clear();
      
      // 停止服务器
      await this.quicServer.stop();
      
      this.listening = false;
      this.quicServer = null;
      
      logger.info('HTTP/3 server closed');
      
      if (callback) {
        callback();
      }
      
    } catch (error) {
      logger.error('Error closing HTTP/3 server', {}, error);
      if (callback) {
        callback(error as Error);
      }
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
    const pkg = require('@matrixai/quic/package.json');
    return `MatrixAI QUIC ${pkg.version}`;
  } catch {
    return '@matrixai/quic';
  }
}

/**
 * 检查是否支持 HTTP/3
 */
export function hasNativeHttp3Support(): boolean {
  try {
    require('@matrixai/quic');
    return true;
  } catch {
    return false;
  }
}

