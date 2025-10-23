/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-21 22:07:11
 * @LastEditTime: 2025-03-23 11:41:02
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { BaseHandler, Handler } from './base';
import { Transform, Stream } from 'stream';
import * as zlib from 'zlib';
import { IRpcServerCallImpl, KoattyContext } from "koatty_core";
import { Exception, StatusCodeConvert } from "koatty_exception";
import { DefaultLogger as Logger } from "koatty_logger";
import { Span } from '@opentelemetry/api';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';
import { catcher } from '../trace/catcher';
import { extensionOptions } from '../trace/itrace';


/**
 * gRPC request handler middleware for Koatty framework.
 * Handles gRPC requests with tracing, timeout, error handling and logging capabilities.
 * 
 * @param {KoattyContext} ctx - The Koatty context object
 * @param {Function} next - The next middleware function
 * @param {extensionOptions} [ext] - Extension options including timeout, encoding, span and error handler
 * @returns {Promise<any>} Returns null on success or error result from catcher
 * 
 * @throws {Exception} When response status is >= 400
 * @throws {Error} When request timeout exceeded
 */
export class GrpcHandler extends BaseHandler implements Handler {
  private static instance: GrpcHandler;

  private constructor() {
    super();
  }

  public static getInstance(): GrpcHandler {
    if (!GrpcHandler.instance) {
      GrpcHandler.instance = new GrpcHandler();
    }
    return GrpcHandler.instance;
  }

  async handle(ctx: KoattyContext, next: Function, ext?: extensionOptions): Promise<any> {
    const timeout = ext.timeout || 10000;
    const acceptEncoding = ctx.rpc.call.metadata.get('accept-encoding')[0] || '';
    const compression = acceptEncoding.includes('br') ? 'brotli' : 
                      acceptEncoding.includes('gzip') ? 'gzip' : 'none';

    ctx?.rpc?.call?.sendMetadata(ctx.rpc.call.metadata);

    this.commonPreHandle(ctx, ext);

    // event callback
    ctx.res.once("finish", () => {
      const now = Date.now();
      const status = StatusCodeConvert(ctx.status);
      const msg = `{"action":"${ctx.method}","status":"${status}","startTime":"${ctx.startTime}","duration":"${(now - ctx.startTime) || 0}","requestId":"${ctx.requestId}","endTime":"${now}","path":"${ctx.originalPath}"}`;
      this.commonPostHandle(ctx, ext, msg);
      // ctx = null;
    });
    (<IRpcServerCallImpl<any, any>>ctx?.rpc?.call).once("error", (err) => {
      this.handleError(err, ctx, ext);
    });

    // try /catch
    const response: any = {};

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
        throw new Exception(ctx.message, 0, ctx.status);
      }

      // Handle response stream compression
      if (compression !== 'none' && ctx.body instanceof Stream) {
        const compressStream = compression === 'gzip' ? 
          zlib.createGzip({ level: 6 }) : zlib.createBrotliCompress({
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: 4
            }
          });
        ctx.body = ctx.body.pipe(compressStream);
      }
      ctx.rpc.callback(null, ctx.body);
      return null;
    } catch (err: any) {
      return this.handleError(err, ctx, ext);
    } finally {
      ctx.res.emit("finish");
    }
  }
}
