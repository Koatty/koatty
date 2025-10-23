/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-03-15 22:21:29
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

/**
 * 请求参数选项
 */
export interface PayloadOptions {
  extTypes: Record<string, string[]>;
  limit: string;
  encoding: BufferEncoding;
  multiples: boolean;
  keepExtensions: boolean;
  length?: number;
  /**
   * Protocol Buffer 文件路径（用于 gRPC 自动解析）
   * 如果提供，gRPC payload 解析器将尝试自动解码
   */
  protoFile?: string;
}