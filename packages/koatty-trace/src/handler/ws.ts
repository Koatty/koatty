/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-21 22:07:11
 * @LastEditTime: 2025-03-23 11:46:32
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { KoattyContext } from "koatty_core";
import { Exception } from "koatty_exception";
import { DefaultLogger as Logger } from "koatty_logger";
import { Span } from "@opentelemetry/api";
import { SemanticAttributes } from "@opentelemetry/semantic-conventions";
import { inspect } from "util";
import { catcher } from "../trace/catcher";
import { BaseHandler, Handler } from './base';
import { extensionOptions } from "../trace/itrace";
import { Helper } from "koatty_lib";

/**
 * WebSocket handler class implementing the Handler interface.
 * Manages WebSocket connections and handles request/response lifecycle.
 * Uses Singleton pattern to ensure only one instance exists.
 * 
 * Features:
 * - Timeout handling for WebSocket connections
 * - Support for WebSocket compression (permessage-deflate)
 * - Request tracking with timing information
 * - Error handling and status code management
 * 
 * @class WsHandler
 * @extends BaseHandler
 * @implements Handler
 * 
 * @example
 * const handler = WsHandler.getInstance();
 * await handler.handle(ctx, next, options);
 */
export class WsHandler extends BaseHandler implements Handler {
  private static instance: WsHandler;

  private constructor() {
    super();
  }

  public static getInstance(): WsHandler {
    if (!WsHandler.instance) {
      WsHandler.instance = new WsHandler();
    }
    return WsHandler.instance;
  }

  async handle(ctx: KoattyContext, next: Function, ext?: extensionOptions): Promise<any> {
    const timeout = ext?.timeout || 10000;
    const wsExtensions = ctx.req.headers['sec-websocket-extensions'] || '';
    const useCompression = wsExtensions.includes('permessage-deflate');
    
    this.commonPreHandle(ctx, ext);
    
    ctx?.res?.once("finish", () => {
      const now = Date.now();
      const msg = `{"action":"${ctx.method}","status":"${ctx.status}","startTime":"${ctx.startTime}","duration":"${(now - ctx.startTime) || 0}","requestId":"${ctx.requestId}","endTime":"${now}","path":"${ctx.originalPath || '/'}"}`;
      this.commonPostHandle(ctx, ext, msg);
    });

    try {
      // ✅ 使用基类的通用超时处理方法
      await this.handleWithTimeout(ctx, next, ext, timeout);

      // ✅ 使用基类的通用状态检查方法
      this.checkAndSetStatus(ctx);
      
      // ✅ 安全的WebSocket发送 - 只在连接开启且有数据时发送
      if (ctx?.websocket?.readyState === 1 && !Helper.isTrueEmpty(ctx.body)) {
        try {
          const sendOptions = useCompression ? { compress: true } : {};
          // 使用inspect安全转换,限制深度避免循环引用问题
          const message = inspect(ctx.body, { 
            depth: 10, 
            breakLength: Infinity,
            compact: true 
          });
          
          // ✅ WebSocket send - 包装在try-catch中捕获同步错误
          // 注意: 某些WebSocket实现支持回调,某些不支持,所以我们使用try-catch
          ctx.websocket.send(message, sendOptions);
          
          // 监听WebSocket的error事件(如果还没有监听)
          if (!ctx.websocket.listenerCount || ctx.websocket.listenerCount('error') === 0) {
            ctx.websocket.once('error', (wsErr: Error) => {
              Logger.Error('WebSocket error:', wsErr);
            });
          }
        } catch (sendErr) {
          Logger.Error('WebSocket send error:', sendErr);
          // 不抛出异常,因为消息已经处理完成
        }
      }
      return null;
    } catch (err: any) {
      return this.handleError(err, ctx, ext);
    } finally {
      ctx.res.emit("finish");
    }
  }
}
