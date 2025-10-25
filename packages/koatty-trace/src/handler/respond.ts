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
 * 安全的 JSON 序列化
 * - 处理循环引用
 * - 处理 BigInt、Symbol、Function
 * - 处理 Error 对象
 * - 错误恢复
 */
function safeJSONStringify(
  body: any,
  debug: boolean = false
): { success: true; data: string } | { success: false; error: string } {
  const seen = new WeakSet();

  try {
    const jsonString = JSON.stringify(body, (key, value) => {
      // 处理 undefined
      if (value === undefined) {
        return null;
      }

      // 处理 BigInt
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }

      // 处理 Symbol
      if (typeof value === 'symbol') {
        return value.toString();
      }

      // 处理函数
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }

      // 处理 Error 对象
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: debug ? value.stack : undefined,
          code: (value as any).code
        };
      }

      // 处理 Date
      if (value instanceof Date) {
        return value.toISOString();
      }

      // 处理 RegExp
      if (value instanceof RegExp) {
        return value.toString();
      }

      // ✅ 循环引用检测 - 必须在返回value之前检查
      if (typeof value === 'object' && value !== null) {
        // 检查是否已经遍历过这个对象
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        // 标记为已访问
        seen.add(value);
      }

      return value;
    });

    return { success: true, data: jsonString };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    Logger.Error('JSON serialization failed:', error);

    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * 安全的 res.end() 调用
 * - 捕获所有可能的错误
 * - 防止 unhandledRejection
 */
async function safeEnd(res: any, data?: string | Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // 尝试使用回调形式
      let callbackCalled = false;
      const endResult = res.end(data, (err: Error | undefined) => {
        callbackCalled = true;
        if (err) {
          Logger.Error('res.end() failed:', err);
          reject(err);
        } else {
          resolve();
        }
      });
      
      // 如果回调在下一个tick之前没有被调用，假设不支持回调（如mock）
      setImmediate(() => {
        if (!callbackCalled) {
          resolve();
        }
      });
    } catch (err) {
      Logger.Error('res.end() threw exception:', err);
      reject(err);
    }
  });
}

/**
 * 安全的流处理
 * - 监听所有错误事件
 * - 自动清理资源
 * - 处理客户端断开
 */
async function handleStreamResponse(
  stream: Readable,
  res: any,
  ctx: KoattyContext
): Promise<void> {
  return new Promise((resolve, reject) => {
    let errorHandled = false;

    const handleError = (err: Error, source: string) => {
      if (errorHandled) return;
      errorHandled = true;

      Logger.Error(`Stream error from ${source}:`, err);

      if (!stream.destroyed) {
        stream.destroy();
      }

      if (!res.headersSent) {
        try {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'text/plain');
          res.end('Internal Server Error: Stream processing failed');
        } catch (endErr) {
          Logger.Error('Failed to send error response:', endErr);
        }
      } else if (!res.writableEnded) {
        try {
          res.end();
        } catch (endErr) {
          Logger.Error('Failed to end response:', endErr);
        }
      }

      reject(err);
    };

    const handleFinish = () => {
      if (errorHandled) return;
      errorHandled = true;
      resolve();
    };

    stream.once('error', (err: Error) => handleError(err, 'stream'));
    res.once('error', (err: Error) => handleError(err, 'response'));
    res.once('close', () => {
      if (!stream.destroyed) {
        Logger.Warn('Client disconnected, destroying stream');
        stream.destroy();
      }
    });

    try {
      stream.pipe(res);
      res.once('finish', handleFinish);
    } catch (err) {
      handleError(err as Error, 'pipe');
    }
  });
}

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
export async function respond(ctx: KoattyContext, ext?: extensionOptions) {
  // allow bypassing koa
  if (false === ctx.respond) return;
  if (!ctx.writable) return;

  const res = ctx.res;
  const body = ctx.body;
  const code = ctx.status;

  // ✅ ignore body - 使用 safeEnd 确保错误被捕获
  if (StatusEmpty.includes(code)) {
    ctx.body = null;
    return safeEnd(res);
  }

  // ✅ HEAD method - 使用 safeEnd
  if ('HEAD' === ctx.method) {
    if (!res.headersSent && !(<any>ctx.response).has('Content-Length')) {
      const { length } = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }
    return safeEnd(res);
  }

  // ✅ status body - 使用 safeEnd
  if (null == body) {
    if ((<any>ctx.response)._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      return safeEnd(res);
    }
    // 转换body为字符串
    const textBody = ctx.req.httpVersionMajor >= 2 
      ? String(code) 
      : (ctx.message || String(code));
    
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(textBody);
    }
    return safeEnd(res, textBody);
  }

  // status
  if (code === 404) {
    ctx.status = 200;
  }

  // ✅ Apply compression middleware with enhanced error handling
  try {
    await compressMiddleware(ctx)(ctx, async () => {
      // ✅ 重新获取body，因为压缩中间件可能已修改ctx.body
      const currentBody = ctx.body;
      
      // Buffer 响应
      if (Buffer.isBuffer(currentBody)) {
        await safeEnd(res, currentBody);
        return;
      }

      // 字符串响应
      if (typeof currentBody === 'string') {
        await safeEnd(res, currentBody);
        return;
      }

      // ✅ 流响应（增强错误处理）
      if (currentBody instanceof Readable) {
        await handleStreamResponse(currentBody, res, ctx);
        return;
      }

      // ✅ JSON 响应（安全序列化）
      const jsonResult = safeJSONStringify(currentBody, ext?.debug);

      if (!jsonResult.success) {
        // JSON 序列化失败，发送错误响应
        const errMsg = (jsonResult as { success: false; error: string }).error;
        Logger.Error(`JSON serialization failed: ${errMsg}`);
        
        if (!res.headersSent) {
          ctx.status = 500;
          ctx.type = 'json';
        }

        const errorResponse = JSON.stringify({
          error: 'Internal Server Error',
          message: 'Failed to serialize response data',
          details: ext?.debug ? errMsg : undefined
        });

        await safeEnd(res, errorResponse);
        return;
      }

      // 序列化成功，发送响应
      const jsonData = (jsonResult as { success: true; data: string }).data;
      if (!res.headersSent) {
        ctx.type = 'json';
        ctx.length = Buffer.byteLength(jsonData);
      }
      await safeEnd(res, jsonData);
    });
  } catch (error) {
    // ✅ 最外层错误捕获
    Logger.Error('Response handling failed:', error);
    
    // 尝试发送错误响应
    if (!res.headersSent) {
      try {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      } catch (endErr) {
        Logger.Error('Failed to send error response:', endErr);
      }
    }
  }
}
