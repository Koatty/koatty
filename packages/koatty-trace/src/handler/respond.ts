/*
 * @Description: Response helper with compression support using koa-compress.
 * @Usage: 
 * @Author: richen
 * @Date: 2020-11-20 17:37:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-11-10 22:18:40
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import type { KoattyContext } from "koatty_core";
import { DefaultLogger as Logger } from "koatty_logger";
import type { extensionOptions } from "../trace/itrace";
// @ts-expect-error - koa-compress types may not be available
import compress from 'koa-compress';
import { Readable } from 'stream';
import zlib from 'node:zlib';
// @ts-expect-error - koa-compress types may not be available
import type { CompressOptions } from 'koa-compress';

// StatusEmpty
const StatusEmpty = [204, 205, 304];

/**
 * Creates a compression middleware based on the client's Accept-Encoding header.
 * Supports Brotli and Gzip compression algorithms.
 * 
 * @param {KoattyContext} ctx - The Koatty context object
 * @returns {Function} Compression middleware function
 * - Returns Brotli compression if 'br' is supported
 * - Returns Gzip compression if 'gzip' is supported
 * - Returns pass-through middleware if no compression is supported
 * 
 * @remarks
 * - Compression threshold is set to 1024 bytes
 * - Excludes image content types from compression
 * - Brotli compression uses quality level 4
 * - Gzip uses Z_SYNC_FLUSH mode
 */
export function compressMiddleware(ctx: KoattyContext): ReturnType<typeof compress> {
  const acceptEncoding = ctx.get('Accept-Encoding') || '';
  const options: CompressOptions = {
    threshold: 1024,
    filter(contentType: string) {
      return !/^image\//i.test(contentType);
    }
  };

  if (acceptEncoding.includes('br')) {
    options.br = {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
      }
    };
    return compress(options);
  } else if (acceptEncoding.includes('gzip')) {
    options.gzip = {
      flush: zlib.constants.Z_SYNC_FLUSH
    };
    options.br = false;
    return compress(options);
  }

  return (ctx: any, next: any) => next(); // 不压缩时返回空中间件

}

/**
 * Process and send the response to the client based on the context.
 * Handles different response types including empty responses, HEAD requests,
 * null bodies, buffers, strings, streams and JSON.
 * Also applies compression middleware if configured.
 * 
 * @param ctx - The Koatty context object containing request and response information
 * @param ext - Optional extension options for additional middleware configuration
 * @returns void | Promise<void> Returns nothing or a Promise that resolves when response is sent
 */
export function respond(ctx: KoattyContext, ext?: extensionOptions) {
  // allow bypassing koa
  if (false === ctx.respond) return;
  if (!ctx.writable) return;

  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;

  // ignore body
  if (StatusEmpty.includes(code)) {
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' === ctx.method) {
    if (!res.headersSent && !(<any>ctx.response).has('Content-Length')) {
      const { length } = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }
    return res.end();
  }

  // status body
  if (null == body) {
    if ((<any>ctx.response)._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      return res.end();
    }
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(<string>body);
    }
    return res.end(body);
  }

  // status
  if (code === 404) {
    ctx.status = 200;
  }

  // Apply compression middleware (it will handle no-compression case internally)
  return compressMiddleware(ctx)(ctx, async () => {
    // responses
    if (Buffer.isBuffer(body)) return res.end(body);
    if ('string' === typeof body) return res.end(body);
    if (body instanceof Readable) {
      const stream: Readable = body;
      stream.on('error', (err: Error) => {
        Logger.Error('Response stream error:', err);
        stream.destroy();
      });
      return stream.pipe(res);
    }

    // body: json
    body = JSON.stringify(body);
    if (!res.headersSent) {
      ctx.length = Buffer.byteLength(<string>body);
    }
    return res.end(body);
  });
}
