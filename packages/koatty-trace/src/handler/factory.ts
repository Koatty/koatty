/**
 * 
 * @Description: 协议处理器工厂类
 * @Author: richen
 * @Date: 2025-04-04 12:21:48
 * @LastEditTime: 2025-04-04 19:11:05
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { ProtocolType } from './base';
import type { Handler } from './base';
import { HttpHandler } from './http';
import { GrpcHandler } from './grpc';
import { WsHandler } from './ws';
import { DefaultLogger as logger } from 'koatty_logger';


/**
 * Factory class for managing protocol handlers.
 * Provides registration and retrieval of handlers for different protocol types (HTTP, GRPC, WS).
 * Initializes with default handlers and supports fallback to HTTP handler.
 */
export class HandlerFactory {
  private static handlers = new Map<ProtocolType, Handler>();

  /**
   * Initialize with default handlers.
   */
  static {
    this.register(ProtocolType.HTTP, HttpHandler.getInstance());
    this.register(ProtocolType.GRPC, GrpcHandler.getInstance());
    this.register(ProtocolType.WS, WsHandler.getInstance());
  }

  /**
   * register a handler for a protocol type.
   * @param type 
   * @param handler 
   */
  static register(type: ProtocolType, handler: Handler) {
    this.handlers.set(type, handler);
  }

  /**
   * get a handler for a protocol type.
   * @param type 
   * @returns 
   */
  static getHandler(type: ProtocolType): Handler {
    const handler = this.handlers.get(type);
    if (!handler) {
      logger.warn(`Handler for protocol ${type} not found, falling back to HTTP`);
      return this.handlers.get(ProtocolType.HTTP)!;
    }
    return handler;
  }
}
