/*
 * @Description: HTTP/3 Frame Parser (RFC 9114)
 * @Usage: HTTP/3 帧解析和序列化实现
 * @Author: richen
 * @Date: 2025-01-12 18:00:00
 * @LastEditTime: 2025-01-12 18:00:00
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'http3-frames' });

/**
 * HTTP/3 帧类型 (RFC 9114 Section 7.2)
 */
export enum Http3FrameType {
  DATA = 0x00,           // 数据帧
  HEADERS = 0x01,        // 头部帧
  CANCEL_PUSH = 0x03,    // 取消推送帧
  SETTINGS = 0x04,       // 设置帧
  PUSH_PROMISE = 0x05,   // 推送承诺帧
  GOAWAY = 0x07,         // GOAWAY 帧
  MAX_PUSH_ID = 0x0D,    // 最大推送 ID 帧
}

/**
 * HTTP/3 设置参数 (RFC 9114 Section 7.2.4.1)
 */
export enum Http3Settings {
  QPACK_MAX_TABLE_CAPACITY = 0x01,    // QPACK 最大表容量
  MAX_FIELD_SECTION_SIZE = 0x06,      // 最大字段段大小
  QPACK_BLOCKED_STREAMS = 0x07,       // QPACK 阻塞流
}

/**
 * HTTP/3 帧接口
 */
export interface Http3Frame {
  type: Http3FrameType;
  length: number;
  payload: Buffer;
}

/**
 * HTTP/3 DATA 帧
 */
export interface Http3DataFrame extends Http3Frame {
  type: Http3FrameType.DATA;
  data: Buffer;
}

/**
 * HTTP/3 HEADERS 帧
 */
export interface Http3HeadersFrame extends Http3Frame {
  type: Http3FrameType.HEADERS;
  headers: Buffer; // QPACK 编码的头部
}

/**
 * HTTP/3 SETTINGS 帧
 */
export interface Http3SettingsFrame extends Http3Frame {
  type: Http3FrameType.SETTINGS;
  settings: Map<number, number>;
}

/**
 * HTTP/3 GOAWAY 帧
 */
export interface Http3GoAwayFrame extends Http3Frame {
  type: Http3FrameType.GOAWAY;
  streamId: bigint;
}

/**
 * HTTP/3 帧解析器
 */
export class Http3FrameParser {
  
  /**
   * 解析 HTTP/3 帧
   * @param buffer - 包含帧数据的缓冲区
   * @returns 解析后的帧数组和剩余的缓冲区
   */
  static parse(buffer: Buffer): { frames: Http3Frame[]; remaining: Buffer } {
    const frames: Http3Frame[] = [];
    let offset = 0;
    
    try {
      while (offset < buffer.length) {
        // 解析帧类型（可变长度整数）
        const typeResult = this.decodeVarint(buffer, offset);
        if (!typeResult) break;
        
        const { value: frameType, bytesRead: typeBytesRead } = typeResult;
        offset += typeBytesRead;
        
        // 解析帧长度（可变长度整数）
        const lengthResult = this.decodeVarint(buffer, offset);
        if (!lengthResult) break;
        
        const { value: frameLength, bytesRead: lengthBytesRead } = lengthResult;
        offset += lengthBytesRead;
        
        // 检查是否有足够的数据
        if (offset + frameLength > buffer.length) {
          // 数据不完整，返回已解析的帧和剩余数据
          offset -= (typeBytesRead + lengthBytesRead);
          break;
        }
        
        // 提取帧负载
        const payload = buffer.slice(offset, offset + frameLength);
        offset += frameLength;
        
        // 根据帧类型解析具体内容
        const frame = this.parseFrame(frameType, frameLength, payload);
        if (frame) {
          frames.push(frame);
        }
      }
    } catch (error) {
      logger.error('HTTP/3 frame parse error', {}, error);
    }
    
    const remaining = buffer.slice(offset);
    return { frames, remaining };
  }
  
  /**
   * 解析具体的帧类型
   */
  private static parseFrame(type: number, length: number, payload: Buffer): Http3Frame | null {
    switch (type) {
      case Http3FrameType.DATA:
        return this.parseDataFrame(length, payload);
      
      case Http3FrameType.HEADERS:
        return this.parseHeadersFrame(length, payload);
      
      case Http3FrameType.SETTINGS:
        return this.parseSettingsFrame(length, payload);
      
      case Http3FrameType.GOAWAY:
        return this.parseGoAwayFrame(length, payload);
      
      default:
        logger.debug('Unknown HTTP/3 frame type', {}, { type: type.toString(16) });
        return {
          type: type as Http3FrameType,
          length,
          payload
        };
    }
  }
  
  /**
   * 解析 DATA 帧
   */
  private static parseDataFrame(length: number, payload: Buffer): Http3DataFrame {
    return {
      type: Http3FrameType.DATA,
      length,
      payload,
      data: payload
    };
  }
  
  /**
   * 解析 HEADERS 帧
   */
  private static parseHeadersFrame(length: number, payload: Buffer): Http3HeadersFrame {
    return {
      type: Http3FrameType.HEADERS,
      length,
      payload,
      headers: payload // QPACK 编码的头部，需要进一步解码
    };
  }
  
  /**
   * 解析 SETTINGS 帧
   */
  private static parseSettingsFrame(length: number, payload: Buffer): Http3SettingsFrame {
    const settings = new Map<number, number>();
    let offset = 0;
    
    while (offset < payload.length) {
      // 解析设置标识符
      const idResult = this.decodeVarint(payload, offset);
      if (!idResult) break;
      
      const { value: id, bytesRead: idBytesRead } = idResult;
      offset += idBytesRead;
      
      // 解析设置值
      const valueResult = this.decodeVarint(payload, offset);
      if (!valueResult) break;
      
      const { value, bytesRead: valueBytesRead } = valueResult;
      offset += valueBytesRead;
      
      settings.set(id, value);
    }
    
    return {
      type: Http3FrameType.SETTINGS,
      length,
      payload,
      settings
    };
  }
  
  /**
   * 解析 GOAWAY 帧
   */
  private static parseGoAwayFrame(length: number, payload: Buffer): Http3GoAwayFrame {
    const streamIdResult = this.decodeVarint(payload, 0);
    const streamId = streamIdResult ? BigInt(streamIdResult.value) : BigInt(0);
    
    return {
      type: Http3FrameType.GOAWAY,
      length,
      payload,
      streamId
    };
  }
  
  /**
   * 解码可变长度整数 (RFC 9000 Section 16)
   */
  private static decodeVarint(buffer: Buffer, offset: number): { value: number; bytesRead: number } | null {
    if (offset >= buffer.length) return null;
    
    const firstByte = buffer[offset];
    const prefix = firstByte >> 6; // 前两位表示长度
    
    let value: number;
    let bytesRead: number;
    
    switch (prefix) {
      case 0: // 1 字节
        value = firstByte & 0x3F;
        bytesRead = 1;
        break;
      
      case 1: // 2 字节
        if (offset + 2 > buffer.length) return null;
        value = ((firstByte & 0x3F) << 8) | buffer[offset + 1];
        bytesRead = 2;
        break;
      
      case 2: // 4 字节
        if (offset + 4 > buffer.length) return null;
        value = ((firstByte & 0x3F) << 24) |
                (buffer[offset + 1] << 16) |
                (buffer[offset + 2] << 8) |
                buffer[offset + 3];
        bytesRead = 4;
        break;
      
      case 3: // 8 字节
        if (offset + 8 > buffer.length) return null;
        // JavaScript 的 number 最大安全整数是 2^53-1，对于大整数可能需要使用 BigInt
        value = ((firstByte & 0x3F) << 56) |
                (buffer[offset + 1] << 48) |
                (buffer[offset + 2] << 40) |
                (buffer[offset + 3] << 32) |
                (buffer[offset + 4] << 24) |
                (buffer[offset + 5] << 16) |
                (buffer[offset + 6] << 8) |
                buffer[offset + 7];
        bytesRead = 8;
        break;
      
      default:
        return null;
    }
    
    return { value, bytesRead };
  }
}

/**
 * HTTP/3 帧序列化器
 */
export class Http3FrameSerializer {
  
  /**
   * 序列化 DATA 帧
   */
  static serializeDataFrame(data: Buffer): Buffer {
    const type = this.encodeVarint(Http3FrameType.DATA);
    const length = this.encodeVarint(data.length);
    
    return Buffer.concat([type, length, data]);
  }
  
  /**
   * 序列化 HEADERS 帧
   */
  static serializeHeadersFrame(headers: Buffer): Buffer {
    const type = this.encodeVarint(Http3FrameType.HEADERS);
    const length = this.encodeVarint(headers.length);
    
    return Buffer.concat([type, length, headers]);
  }
  
  /**
   * 序列化 SETTINGS 帧
   */
  static serializeSettingsFrame(settings: Map<number, number>): Buffer {
    const settingsBuffers: Buffer[] = [];
    
    for (const [id, value] of settings.entries()) {
      settingsBuffers.push(this.encodeVarint(id));
      settingsBuffers.push(this.encodeVarint(value));
    }
    
    const payload = Buffer.concat(settingsBuffers);
    const type = this.encodeVarint(Http3FrameType.SETTINGS);
    const length = this.encodeVarint(payload.length);
    
    return Buffer.concat([type, length, payload]);
  }
  
  /**
   * 序列化 GOAWAY 帧
   */
  static serializeGoAwayFrame(streamId: bigint): Buffer {
    const type = this.encodeVarint(Http3FrameType.GOAWAY);
    const streamIdBuffer = this.encodeVarint(Number(streamId));
    const length = this.encodeVarint(streamIdBuffer.length);
    
    return Buffer.concat([type, length, streamIdBuffer]);
  }
  
  /**
   * 编码可变长度整数 (RFC 9000 Section 16)
   */
  static encodeVarint(value: number): Buffer {
    if (value < 0) {
      throw new Error('Varint must be non-negative');
    }
    
    // 1 字节 (0-63)
    if (value < 64) {
      return Buffer.from([value]);
    }
    
    // 2 字节 (64-16383)
    if (value < 16384) {
      return Buffer.from([
        0x40 | (value >> 8),
        value & 0xFF
      ]);
    }
    
    // 4 字节 (16384-1073741823)
    if (value < 1073741824) {
      return Buffer.from([
        0x80 | (value >> 24),
        (value >> 16) & 0xFF,
        (value >> 8) & 0xFF,
        value & 0xFF
      ]);
    }
    
    // 8 字节
    return Buffer.from([
      0xC0 | (value >> 56),
      (value >> 48) & 0xFF,
      (value >> 40) & 0xFF,
      (value >> 32) & 0xFF,
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF
    ]);
  }
}

/**
 * HTTP/3 请求/响应处理器
 */
export class Http3MessageHandler {
  
  /**
   * 从帧中提取 HTTP 请求
   */
  static extractRequest(frames: Http3Frame[], qpackDecoder: any): {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: Buffer;
  } | null {
    let headersFrame: Http3HeadersFrame | null = null;
    const dataFrames: Http3DataFrame[] = [];
    
    // 分离 HEADERS 和 DATA 帧
    for (const frame of frames) {
      if (frame.type === Http3FrameType.HEADERS && !headersFrame) {
        headersFrame = frame as Http3HeadersFrame;
      } else if (frame.type === Http3FrameType.DATA) {
        dataFrames.push(frame as Http3DataFrame);
      }
    }
    
    if (!headersFrame) {
      return null;
    }
    
    // 解码 QPACK 头部
    const decodedHeaders = qpackDecoder.decode(headersFrame.headers);
    
    // 提取伪头部和普通头部
    let method = 'GET';
    let url = '/';
    const headers: Record<string, string> = {};
    
    for (const [name, value] of decodedHeaders) {
      if (name === ':method') {
        method = value;
      } else if (name === ':path') {
        url = value;
      } else if (name === ':scheme' || name === ':authority') {
        // 这些伪头部可以用于构建完整的 URL，但这里简化处理
      } else if (!name.startsWith(':')) {
        headers[name] = value;
      }
    }
    
    // 合并所有 DATA 帧的数据
    const body = Buffer.concat(dataFrames.map(f => f.data));
    
    return { method, url, headers, body };
  }
  
  /**
   * 创建 HTTP 响应帧
   */
  static createResponse(
    statusCode: number,
    headers: Record<string, string | string[]>,
    body: Buffer,
    qpackEncoder: any
  ): Buffer[] {
    const frames: Buffer[] = [];
    
    // 1. 创建 HEADERS 帧
    const responseHeaders: Array<[string, string]> = [
      [':status', statusCode.toString()]
    ];
    
    for (const [name, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          responseHeaders.push([name.toLowerCase(), v]);
        }
      } else {
        responseHeaders.push([name.toLowerCase(), value]);
      }
    }
    
    const encodedHeaders = qpackEncoder.encode(responseHeaders);
    frames.push(Http3FrameSerializer.serializeHeadersFrame(encodedHeaders));
    
    // 2. 创建 DATA 帧（如果有 body）
    if (body.length > 0) {
      frames.push(Http3FrameSerializer.serializeDataFrame(body));
    }
    
    return frames;
  }
}

