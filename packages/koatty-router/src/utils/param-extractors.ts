/*
 * @Description: Unified parameter extractors singleton
 * @Usage: Centralized parameter extraction for V8 optimization
 * @Author: richen
 * @Date: 2025-03-16
 * @LastEditTime: 2025-03-16
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { PayloadOptions } from "../payload/interface";
import { bodyParser } from "../payload/payload";

/**
 * Unified parameter extractor collection
 * Using singleton pattern to maintain monomorphic call sites for V8 optimization
 * 
 * @description
 * This singleton provides standardized extraction methods for all parameter types.
 * By keeping the call sites monomorphic (calling the same function repeatedly),
 * V8's JIT compiler can better optimize the code paths.
 */
export const ParamExtractors = {
  /**
   * Extract query parameter
   * @param ctx - Koatty context
   * @param paramName - Optional parameter name
   * @returns Query value or entire query object
   */
  query(ctx: KoattyContext, paramName?: string): any {
    const query = ctx.query || {};
    return paramName ? query[paramName] : query;
  },

  /**
   * Extract body parameter (async)
   * @param ctx - Koatty context
   * @param paramName - Optional parameter name
   * @param options - Payload parser options
   * @returns Body value or entire body object
   */
  async body(ctx: KoattyContext, paramName?: string, options?: PayloadOptions): Promise<any> {
    const body = await bodyParser(ctx, options);
    return paramName ? body?.[paramName] : body;
  },

  /**
   * Extract header parameter
   * @param ctx - Koatty context
   * @param paramName - Optional header name
   * @returns Header value or entire headers object
   */
  header(ctx: KoattyContext, paramName?: string): any {
    return paramName ? ctx.get(paramName) : ctx.headers;
  },

  /**
   * Extract path parameter
   * @param ctx - Koatty context
   * @param paramName - Optional parameter name
   * @returns Path parameter value or entire params object
   */
  path(ctx: KoattyContext, paramName?: string): any {
    const params = ctx.params || {};
    return paramName ? params[paramName] : params;
  },

  /**
   * Extract file parameter (async)
   * @param ctx - Koatty context
   * @param paramName - Optional file field name
   * @param options - Payload parser options
   * @returns File object or specific file field
   */
  async file(ctx: KoattyContext, paramName?: string, options?: PayloadOptions): Promise<any> {
    const body = await bodyParser(ctx, options);
    const files = body.file || {};
    return paramName ? files[paramName] : files;
  },

  /**
   * Custom extraction using provided function
   * @param ctx - Koatty context
   * @param fn - Custom extraction function
   * @param options - Optional payload options
   * @returns Extracted value
   */
  custom(ctx: KoattyContext, fn: Function, options?: PayloadOptions): any {
    return fn(ctx, options);
  }
};

/**
 * Type of extractor keys
 */
export type ExtractorType = keyof typeof ParamExtractors;

