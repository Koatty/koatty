/*
 * @Description: Payload parsing utilities with performance optimizations
 * @Usage: Parse request body based on content-type with caching
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { KoattyContext, KoattyNext } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import {
  cacheManager,
  DEFAULT_ENCODING, DEFAULT_LIMIT, IDENTITY_ENCODING, ParserFunction,
  ParserMap
} from "./payload_cache";
import { PayloadOptions } from "./interface";

// 使用 Set 和预编译正则表达式
const supportedMethods = new Set(['POST', 'PUT', 'DELETE', 'PATCH', 'LINK', 'UNLINK']);

/**
 * 根据内容类型获取对应的解析器（使用单例缓存管理器）
 * @param contentType 内容类型
 * @param typeMap 解析器映射表
 * @returns 解析器函数或 null
 */
function getParserForType(contentType: string, typeMap: ParserMap): ParserFunction | null {
  const normalizedType = cacheManager.getContentType(contentType);
  if (!normalizedType) {
    return null;
  }

  return typeMap.get(normalizedType) || null;
}

/**
 * 快速检查是否为支持的方法
 * @param method HTTP 方法
 * @returns 是否支持
 */
function isSupportedMethod(method: string): boolean {
  return supportedMethods.has(method);
}

/**
 * 快速检查内容长度
 * @param headers 请求头
 * @returns 内容长度或 0
 */
function getContentLength(headers: Record<string, string | string[] | undefined>): number {
  const len = headers['content-length'];
  if (typeof len === 'string') {
    return parseInt(len, 10) || 0;
  }
  return 0;
}

/**
 * Middleware for parsing request payload (query parameters and request body).
 * 
 * @param {PayloadOptions} [options] - Configuration options for payload parsing
 * @returns {Function} Koa middleware function that adds requestParam and requestBody to context
 * 
 * @example
 * ```ts
 * app.use(payload({
 *   // payload options
 * }));
 * ```
 */
export function payload(options?: PayloadOptions) {
  // 性能优化：预处理选项
  const opts = cacheManager.getMergedOptions(options);

  return (ctx: KoattyContext, next: KoattyNext) => {
    // 防止重复定义：在多协议场景下，多个router会注册payload中间件
    // 每个请求的ctx虽然是独立实例，但会经过所有中间件
    // 只在属性未定义时才定义，避免 "Cannot redefine property" 错误
    if (!Object.prototype.hasOwnProperty.call(ctx, 'requestParam')) {
      Helper.define(ctx, "requestParam", () => queryParser(ctx, opts));
    }
    if (!Object.prototype.hasOwnProperty.call(ctx, 'requestBody')) {
      Helper.define(ctx, "requestBody", () => bodyParser(ctx, opts));
    }
    return next();
  }
}

/**
 * Parse and merge query parameters and route parameters from context
 * @param {KoattyContext} ctx Koatty context object
 * @param {PayloadOptions} [_options] Optional payload configuration
 * @returns {any} Merged object containing query and route parameters
 */
export function queryParser(ctx: KoattyContext, _options?: PayloadOptions): any {
  // 性能优化：避免不必要的对象创建
  const query = ctx.query;
  const params = ctx.params;

  if (!params || Object.keys(params).length === 0) {
    return query;
  }

  if (!query || Object.keys(query).length === 0) {
    return params;
  }

  return Object.assign({}, query, params);
}

/**
 * Parse request body and store it in context metadata.
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {PayloadOptions} [options] - Optional payload parsing options
 * @returns {Promise<any>} Parsed request body
 * @throws {Error} When body parsing fails
 */
export async function bodyParser(ctx: KoattyContext, options?: PayloadOptions): Promise<any> {
  try {
    // 性能优化：快速检查缓存
    let body = ctx.getMetaData("_body")[0];
    if (!Helper.isEmpty(body)) {
      return body;
    }

    // 性能优化：使用缓存的合并选项
    const opts = cacheManager.getMergedOptions(options);
    body = await parseBody(ctx, opts);
    ctx.setMetaData("_body", body);
    return body;
  } catch (err) {
    Logger.Error(err);
    return {};
  }
}

/**
 * Parse request body based on content-type with performance optimizations.
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {PayloadOptions} options - Parser options including encoding, limit, etc.
 * @returns {Promise<unknown>} Parsed body data or empty object
 * 
 * @description
 * Optimized version with typeMap caching and Map-based lookups.
 * Handles different content types:
 * - application/json
 * - application/x-www-form-urlencoded
 * - text/plain
 * - multipart/form-data
 * - text/xml
 * - application/grpc
 * - application/graphql+json
 * - application/websocket
 */
function parseBody(ctx: KoattyContext, options: PayloadOptions): Promise<unknown> {
  // 性能优化：使用 Set 进行 O(1) 方法检查
  if (!isSupportedMethod(ctx.method)) {
    return Promise.resolve({});
  }

  // 性能优化：快速获取内容长度
  const len = getContentLength(ctx.req.headers || {});
  const encoding = ctx.req.headers?.['content-encoding'] || IDENTITY_ENCODING;

  if (len && encoding === IDENTITY_ENCODING) {
    options.length = len;
  }

  // 性能优化：避免重复赋值
  if (!options.encoding) options.encoding = DEFAULT_ENCODING;
  if (!options.limit) options.limit = DEFAULT_LIMIT;

  const contentType = ctx.request.headers['content-type'] || '';

  // 性能优化：使用缓存的 typeMap
  const typeMap = cacheManager.getTypeMap(options.extTypes);
  const parser = getParserForType(contentType, typeMap);

  return parser ? parser(ctx, options) : Promise.resolve({});
}
