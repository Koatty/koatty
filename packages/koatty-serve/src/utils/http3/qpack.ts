/*
 * @Description: QPACK (QPACK: Field Compression for HTTP/3) implementation
 * @Usage: RFC 9204 - QPACK 头部压缩实现
 * @Author: richen
 * @Date: 2025-01-12 18:00:00
 * @LastEditTime: 2025-01-12 18:00:00
 */

import { createLogger } from '../../utils/logger';

const logger = createLogger({ module: 'qpack' });

/**
 * QPACK 静态表 (RFC 9204 Appendix A)
 * 包含常用的 HTTP 头部字段
 */
const STATIC_TABLE: Array<[string, string]> = [
  [':authority', ''],
  [':path', '/'],
  ['age', '0'],
  ['content-disposition', ''],
  ['content-length', '0'],
  ['cookie', ''],
  ['date', ''],
  ['etag', ''],
  ['if-modified-since', ''],
  ['if-none-match', ''],
  ['last-modified', ''],
  ['link', ''],
  ['location', ''],
  ['referer', ''],
  ['set-cookie', ''],
  [':method', 'CONNECT'],
  [':method', 'DELETE'],
  [':method', 'GET'],
  [':method', 'HEAD'],
  [':method', 'OPTIONS'],
  [':method', 'POST'],
  [':method', 'PUT'],
  [':scheme', 'http'],
  [':scheme', 'https'],
  [':status', '103'],
  [':status', '200'],
  [':status', '304'],
  [':status', '404'],
  [':status', '503'],
  ['accept', '*/*'],
  ['accept', 'application/dns-message'],
  ['accept-encoding', 'gzip, deflate, br'],
  ['accept-ranges', 'bytes'],
  ['access-control-allow-headers', 'cache-control'],
  ['access-control-allow-headers', 'content-type'],
  ['access-control-allow-origin', '*'],
  ['cache-control', 'max-age=0'],
  ['cache-control', 'max-age=2592000'],
  ['cache-control', 'max-age=604800'],
  ['cache-control', 'no-cache'],
  ['cache-control', 'no-store'],
  ['cache-control', 'public, max-age=31536000'],
  ['content-encoding', 'br'],
  ['content-encoding', 'gzip'],
  ['content-type', 'application/dns-message'],
  ['content-type', 'application/javascript'],
  ['content-type', 'application/json'],
  ['content-type', 'application/x-www-form-urlencoded'],
  ['content-type', 'image/gif'],
  ['content-type', 'image/jpeg'],
  ['content-type', 'image/png'],
  ['content-type', 'text/css'],
  ['content-type', 'text/html; charset=utf-8'],
  ['content-type', 'text/plain'],
  ['content-type', 'text/plain;charset=utf-8'],
  ['range', 'bytes=0-'],
  ['strict-transport-security', 'max-age=31536000'],
  ['strict-transport-security', 'max-age=31536000; includesubdomains'],
  ['strict-transport-security', 'max-age=31536000; includesubdomains; preload'],
  ['vary', 'accept-encoding'],
  ['vary', 'origin'],
  ['x-content-type-options', 'nosniff'],
  ['x-xss-protection', '1; mode=block'],
  [':status', '100'],
  [':status', '204'],
  [':status', '206'],
  [':status', '302'],
  [':status', '400'],
  [':status', '403'],
  [':status', '421'],
  [':status', '425'],
  [':status', '500'],
  ['accept-language', ''],
  ['access-control-allow-credentials', 'FALSE'],
  ['access-control-allow-credentials', 'TRUE'],
  ['access-control-allow-headers', '*'],
  ['access-control-allow-methods', 'get'],
  ['access-control-allow-methods', 'get, post, options'],
  ['access-control-allow-methods', 'options'],
  ['access-control-expose-headers', 'content-length'],
  ['access-control-request-headers', 'content-type'],
  ['access-control-request-method', 'get'],
  ['access-control-request-method', 'post'],
  ['alt-svc', 'clear'],
  ['authorization', ''],
  ['content-security-policy', "script-src 'none'; object-src 'none'; base-uri 'none'"],
  ['early-data', '1'],
  ['expect-ct', ''],
  ['forwarded', ''],
  ['if-range', ''],
  ['origin', ''],
  ['purpose', 'prefetch'],
  ['server', ''],
  ['timing-allow-origin', '*'],
  ['upgrade-insecure-requests', '1'],
  ['user-agent', ''],
  ['x-forwarded-for', ''],
  ['x-frame-options', 'deny'],
  ['x-frame-options', 'sameorigin'],
];

/**
 * QPACK 编码器
 */
export class QPACKEncoder {
  private dynamicTable: Array<[string, string]> = [];
  private maxTableCapacity: number;
  private tableCapacity = 0;
  
  constructor(maxTableCapacity = 4096) {
    this.maxTableCapacity = maxTableCapacity;
  }
  
  /**
   * 编码 HTTP 头部
   * @param headers - HTTP 头部数组 [[name, value], ...]
   * @returns 编码后的字节数组
   */
  encode(headers: Array<[string, string]>): Buffer {
    const encodedHeaders: Buffer[] = [];
    
    for (const [name, value] of headers) {
      const lowerName = name.toLowerCase();
      
      // 1. 尝试在静态表中查找完全匹配
      const staticIndex = this.findInStaticTable(lowerName, value);
      if (staticIndex !== -1) {
        // 索引头部字段 (Indexed Field Line)
        encodedHeaders.push(this.encodeIndexed(staticIndex, false));
        continue;
      }
      
      // 2. 尝试在静态表中查找名称匹配
      const staticNameIndex = this.findNameInStaticTable(lowerName);
      if (staticNameIndex !== -1) {
        // 带名称引用的字面量 (Literal Field Line With Name Reference)
        encodedHeaders.push(this.encodeLiteralWithNameRef(staticNameIndex, value, false));
        continue;
      }
      
      // 3. 字面量头部字段 (Literal Field Line With Literal Name)
      encodedHeaders.push(this.encodeLiteralWithLiteralName(lowerName, value));
    }
    
    return Buffer.concat(encodedHeaders);
  }
  
  /**
   * 编码索引头部字段
   * @param index - 表索引
   * @param _isDynamic - 是否为动态表索引（预留参数）
   */
  private encodeIndexed(index: number, _isDynamic: boolean): Buffer {
    // 索引头部字段的格式: 1xxxxxxx
    // 最高位为1表示索引头部字段
    const prefix = 0x80; // 10000000
    return this.encodeInteger(index, prefix, 6);
  }
  
  /**
   * 编码带名称引用的字面量
   * @param nameIndex - 名称在表中的索引
   * @param value - 头部值
   * @param _isDynamic - 是否为动态表索引（预留参数）
   */
  private encodeLiteralWithNameRef(nameIndex: number, value: string, _isDynamic: boolean): Buffer {
    // 带名称引用的字面量格式: 01xxxxxx
    const prefix = 0x40; // 01000000
    const indexBytes = this.encodeInteger(nameIndex, prefix, 6);
    const valueBytes = this.encodeString(value);
    
    return Buffer.concat([indexBytes, valueBytes]);
  }
  
  /**
   * 编码带字面量名称的字面量
   * @param name - 头部名称
   * @param value - 头部值
   */
  private encodeLiteralWithLiteralName(name: string, value: string): Buffer {
    // 带字面量名称的字面量格式: 001xxxxx
    const prefix = 0x20; // 00100000
    const prefixByte = Buffer.from([prefix]);
    const nameBytes = this.encodeString(name);
    const valueBytes = this.encodeString(value);
    
    return Buffer.concat([prefixByte, nameBytes, valueBytes]);
  }
  
  /**
   * 编码整数（可变长度整数编码）
   * @param value - 要编码的整数
   * @param prefix - 前缀字节
   * @param prefixBits - 前缀位数
   */
  private encodeInteger(value: number, prefix: number, prefixBits: number): Buffer {
    const maxPrefix = (1 << prefixBits) - 1;
    
    if (value < maxPrefix) {
      return Buffer.from([prefix | value]);
    }
    
    const bytes: number[] = [prefix | maxPrefix];
    value -= maxPrefix;
    
    while (value >= 128) {
      bytes.push((value % 128) + 128);
      value = Math.floor(value / 128);
    }
    bytes.push(value);
    
    return Buffer.from(bytes);
  }
  
  /**
   * 编码字符串
   * @param str - 要编码的字符串
   * @param useHuffman - 是否使用 Huffman 编码（当前简化实现不使用）
   */
  private encodeString(str: string, useHuffman = false): Buffer {
    const strBuffer = Buffer.from(str, 'utf8');
    const lengthPrefix = useHuffman ? 0x80 : 0x00; // 最高位表示是否使用 Huffman
    const lengthBytes = this.encodeInteger(strBuffer.length, lengthPrefix, 7);
    
    return Buffer.concat([lengthBytes, strBuffer]);
  }
  
  /**
   * 在静态表中查找完全匹配的条目
   */
  private findInStaticTable(name: string, value: string): number {
    for (let i = 0; i < STATIC_TABLE.length; i++) {
      if (STATIC_TABLE[i][0] === name && STATIC_TABLE[i][1] === value) {
        return i;
      }
    }
    return -1;
  }
  
  /**
   * 在静态表中查找名称匹配的条目
   */
  private findNameInStaticTable(name: string): number {
    for (let i = 0; i < STATIC_TABLE.length; i++) {
      if (STATIC_TABLE[i][0] === name) {
        return i;
      }
    }
    return -1;
  }
}

/**
 * QPACK 解码器
 */
export class QPACKDecoder {
  private dynamicTable: Array<[string, string]> = [];
  private maxTableCapacity: number;
  
  constructor(maxTableCapacity = 4096) {
    this.maxTableCapacity = maxTableCapacity;
  }
  
  /**
   * 解码 HTTP 头部
   * @param encoded - 编码的字节数组
   * @returns 解码后的头部数组 [[name, value], ...]
   */
  decode(encoded: Buffer): Array<[string, string]> {
    const headers: Array<[string, string]> = [];
    let offset = 0;
    
    try {
      while (offset < encoded.length) {
        const firstByte = encoded[offset];
        
        // 索引头部字段 (1xxxxxxx)
        if ((firstByte & 0x80) === 0x80) {
          const { value: index, bytesRead } = this.decodeInteger(encoded, offset, 0x80, 7);
          offset += bytesRead;
          
          const entry = this.getTableEntry(index);
          if (entry) {
            headers.push(entry);
          }
        }
        // 带名称引用的字面量 (01xxxxxx)
        else if ((firstByte & 0xC0) === 0x40) {
          const { value: nameIndex, bytesRead: indexBytes } = this.decodeInteger(encoded, offset, 0x40, 6);
          offset += indexBytes;
          
          const { value: headerValue, bytesRead: valueBytes } = this.decodeString(encoded, offset);
          offset += valueBytes;
          
          const nameEntry = this.getTableEntry(nameIndex);
          if (nameEntry) {
            headers.push([nameEntry[0], headerValue]);
          }
        }
        // 带字面量名称的字面量 (001xxxxx)
        else if ((firstByte & 0xE0) === 0x20) {
          offset++; // 跳过前缀字节
          
          const { value: name, bytesRead: nameBytes } = this.decodeString(encoded, offset);
          offset += nameBytes;
          
          const { value: value, bytesRead: valueBytes } = this.decodeString(encoded, offset);
          offset += valueBytes;
          
          headers.push([name, value]);
        }
        // 其他类型（简化实现，跳过）
        else {
          logger.warn('Unknown QPACK field type', {}, { firstByte: firstByte.toString(16) });
          offset++;
        }
      }
    } catch (error) {
      logger.error('QPACK decode error', {}, error);
    }
    
    return headers;
  }
  
  /**
   * 解码整数
   */
  private decodeInteger(buffer: Buffer, offset: number, prefix: number, prefixBits: number): { value: number; bytesRead: number } {
    const maxPrefix = (1 << prefixBits) - 1;
    let value = buffer[offset] & maxPrefix;
    let bytesRead = 1;
    
    if (value < maxPrefix) {
      return { value, bytesRead };
    }
    
    let m = 0;
    let b: number;
    
    do {
      b = buffer[offset + bytesRead];
      bytesRead++;
      value += (b & 0x7F) * Math.pow(2, m);
      m += 7;
    } while ((b & 0x80) === 0x80 && offset + bytesRead < buffer.length);
    
    return { value, bytesRead };
  }
  
  /**
   * 解码字符串
   */
  private decodeString(buffer: Buffer, offset: number): { value: string; bytesRead: number } {
    const firstByte = buffer[offset];
    const useHuffman = (firstByte & 0x80) === 0x80;
    
    const { value: length, bytesRead: lengthBytes } = this.decodeInteger(buffer, offset, 0x80, 7);
    const totalBytesRead = lengthBytes + length;
    
    const stringBuffer = buffer.slice(offset + lengthBytes, offset + lengthBytes + length);
    
    // 简化实现：当前不支持 Huffman 解码
    if (useHuffman) {
      logger.warn('Huffman decoding not implemented, returning raw string');
    }
    
    const value = stringBuffer.toString('utf8');
    return { value, bytesRead: totalBytesRead };
  }
  
  /**
   * 从表中获取条目
   */
  private getTableEntry(index: number): [string, string] | null {
    if (index < STATIC_TABLE.length) {
      return STATIC_TABLE[index];
    }
    
    const dynamicIndex = index - STATIC_TABLE.length;
    if (dynamicIndex < this.dynamicTable.length) {
      return this.dynamicTable[dynamicIndex];
    }
    
    return null;
  }
}

