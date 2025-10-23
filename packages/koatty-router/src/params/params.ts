/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2024-10-31 14:31:42
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { injectParam } from "../utils/inject";
import { bodyParser, queryParser } from "../payload/payload";
import { PayloadOptions } from "../payload/interface";

/**
 * Get request header.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Header(name?: string): ParameterDecorator {
  return injectParam((ctx: KoattyContext) => name ? ctx.get(name) : ctx.headers, "Header");
}

/**
 * Get path variable (take value from ctx.params).
 *
 * @export
 * @param {string} [name] params name
 * @returns
 */
export function PathVariable(name?: string): ParameterDecorator {
  return injectParam((ctx: KoattyContext) => {
    const pathParams = ctx.params ?? {};
    return name ? pathParams[name] : pathParams;
  }, "PathVariable");
}

/**
 * Get query-string parameters (take value from ctx.query).
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Get(name?: string): ParameterDecorator {
  return injectParam((ctx: KoattyContext) => {
    const queryParams = ctx.query ?? {};
    return name ? queryParams[name] : queryParams;
  }, "Get");
}

/**
 * Get parsed POST/PUT... body.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Post(name?: string): ParameterDecorator {
  return injectParam(async (ctx: KoattyContext, opt?: PayloadOptions) => {
    const data = await bodyParser(ctx, opt);
    const params = data.body ?? data;
    return name ? params[name] : params;
  }, "Post");
}

/**
 * Get parsed upload file object.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function File(name?: string): ParameterDecorator {
  return injectParam(async (ctx: KoattyContext, opt?: PayloadOptions) => {
    const body = await bodyParser(ctx, opt);
    const params = body.file ?? {};
    return name ? params[name] : params;
  }, "File");
}


/**
 * Get parsed body(form variable and file object).
 *
 * @export
 * @returns ex: {body: {...}, file: {...}}
 */
export function RequestBody(): ParameterDecorator {
  return injectParam((ctx: KoattyContext, opt?: PayloadOptions) => bodyParser(ctx, opt), "RequestBody");
}

/**
 * Alias of @RequestBody
 * @param {*}
 * @return {*}
 */
export const Body = RequestBody;

/**
 * Get parsed query-string and path variable(koa ctx.query and ctx.params),
 * and set as an object.
 * 
 * @export
 * @returns {ParameterDecorator}
 */
export function RequestParam(): ParameterDecorator {
  return injectParam((ctx: KoattyContext, opt?: PayloadOptions) => queryParser(ctx, opt), "RequestParam");
}

/**
 * Alias of @RequestParam
 * @param {*}
 * @return {*}
 */
export const Param = RequestParam;