/*
 * @Description:  
 * @Usage: 
 * @Author: richen
 * @Date: 2020-11-20 17:37:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-11-10 22:18:40
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { Helper } from "koatty_lib";
import { randomUUID } from 'node:crypto';
import { TraceOptions } from "../trace/itrace";

/**
 * Get request id from context based on protocol and options.
 * For grpc protocol, get from metadata or request body.
 * For other protocols, get from headers or query parameters.
 * If no request id found, generate a new trace id.
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {TraceOptions} options - Trace configuration options
 * @returns {string} Request ID or generated trace ID
 */
export function getRequestId(ctx: KoattyContext, options: TraceOptions): string {
  let requestId = '';
  switch (ctx.protocol) {
    case "grpc":
      const request: any = ctx?.getMetaData("_body")[0] || {};
      requestId = ctx?.getMetaData(<string>options.requestIdName) ||
        request[<string>options.requestIdName] || '';
      break;
    default:
      if (options.requestIdHeaderName) {
        const headerValue = ctx.headers?.[options.requestIdHeaderName.toLowerCase()] ||
          ctx.query?.[options.requestIdName] || '';
        requestId = Helper.isArray(headerValue) ? headerValue.join(".") : headerValue;
      }
  }
  return requestId || getTraceId(options);
}

/**
 * Generate a trace ID using the provided factory function or UUID
 * @param {TraceOptions} [options] - Optional configuration options
 * @returns {string} The generated trace ID
 */
export function getTraceId(options?: TraceOptions) {
  return Helper.isFunction(options?.idFactory) ? options.idFactory() : randomUUID();
}

// Export TimeoutController
export { TimeoutController } from './timeout';
