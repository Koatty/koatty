/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-04-04 12:21:48
 * @LastEditTime: 2025-04-04 20:00:41
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { Exception } from "koatty_exception";
import { DefaultLogger as Logger } from "koatty_logger";
import { BaseHandler, Handler } from "./base";
import { extensionOptions } from "../trace/itrace";
import { respond } from "./respond";

/**
 * HTTP request handler middleware for Koatty framework.
 * Handles request timeout, security headers, logging, tracing and error handling.
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {Function} next - Next middleware function
 * @param {extensionOptions} [ext] - Extension options including timeout, encoding, span and other settings
 * @returns {Promise<any>} Response data after handling the request
 * 
 * @throws {Exception} When request timeout occurs or status code >= 400
 * 
 * Features:
 * - Sets security headers
 * - Handles request timeout (default 10s)
 * - Logs request/response details
 * - OpenTelemetry tracing support
 * - Automatic error handling
 */
export class HttpHandler extends BaseHandler implements Handler {
  private static instance: HttpHandler;

  private constructor() {
    super();
  }

  public static getInstance(): HttpHandler {
    if (!HttpHandler.instance) {
      HttpHandler.instance = new HttpHandler();
    }
    return HttpHandler.instance;
  }

  async handle(ctx: KoattyContext, next: Function, ext?: extensionOptions): Promise<any> {
    const timeout = ext.timeout || 10000;

    this.commonPreHandle(ctx, ext);
    ctx?.res?.once('finish', () => {
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
            reject(new Error('Deadline exceeded')); // 抛出超时异常
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
      return respond(ctx, ext);
    } catch (err: any) {
      return this.handleError(err, ctx, ext);
    } finally {
      clearTimeout(response.timeout);
    }
  }
}
