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
      // ctx = null;
    });

    // try /catch
    const response: any = ctx.res;
    try {
      if (!ext.terminated) {
        response.timeout = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Deadline exceeded'));
          }, timeout);
        });

        await Promise.race([next(), response.timeout]).then(() => {
          clearTimeout(response.timeout);
        }).catch((err) => {
          clearTimeout(response.timeout);
          throw err;
        });
      }

      if (ctx.body !== undefined && ctx.status === 404) {
        ctx.status = 200;
      }
      if (ctx.status >= 400) {
        throw new Exception(ctx.message, 1, ctx.status);
      }
      
      // Only send if connection is open and body exists
      if (ctx?.websocket?.readyState === 1 && !Helper.isTrueEmpty(ctx.body)) {
        const sendOptions = useCompression ? { compress: true } : {};
        ctx.websocket.send(inspect(ctx.body), sendOptions);
      }
      return null;
    } catch (err: any) {
      return this.handleError(err, ctx, ext);
    } finally {
      ctx.res.emit("finish");
    }
  }
}
