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
import { injectParam, ParamSourceType } from "../utils/inject";
import { bodyParser, queryParser } from "../payload/payload";
import { PayloadOptions } from "../payload/interface";

/**
 * Get request header.
 *
 * @export
 * @param {string} [name]
 * @param {any} [defaultValue] - Default value if header is undefined
 * @returns
 */
export function Header(name?: string, defaultValue?: any): ParameterDecorator {
  return injectParam(
    (ctx: KoattyContext) => name ? ctx.get(name) : ctx.headers,
    "Header",
    ParamSourceType.HEADER,
    name,
    defaultValue
  );
}

/**
 * Get path variable (take value from ctx.params).
 *
 * @export
 * @param {string} [name] params name
 * @param {any} [defaultValue] - Default value if path variable is undefined
 * @returns
 */
export function PathVariable(name?: string, defaultValue?: any): ParameterDecorator {
  return injectParam(
    (ctx: KoattyContext) => {
      const pathParams = ctx.params ?? {};
      return name ? pathParams[name] : pathParams;
    },
    "PathVariable",
    ParamSourceType.PATH,
    name,
    defaultValue
  );
}

/**
 * Get query-string parameters (take value from ctx.query).
 *
 * @export
 * @param {string} [name]
 * @param {any} [defaultValue] - Default value if query parameter is undefined
 * @returns
 */
export function Get(name?: string, defaultValue?: any): ParameterDecorator {
  return injectParam(
    (ctx: KoattyContext) => {
      const queryParams = ctx.query ?? {};
      return name ? queryParams[name] : queryParams;
    },
    "Get",
    ParamSourceType.QUERY,
    name,
    defaultValue
  );
}

/**
 * Get parsed POST/PUT... body.
 *
 * @export
 * @param {string} [name]
 * @param {any} [defaultValue] - Default value if body parameter is undefined
 * @returns
 */
export function Post(name?: string, defaultValue?: any): ParameterDecorator {
  return injectParam(
    async (ctx: KoattyContext, opt?: PayloadOptions) => {
      const data = await bodyParser(ctx, opt);
      const params = data.body ?? data;
      return name ? params[name] : params;
    },
    "Post",
    ParamSourceType.BODY,
    name,
    defaultValue
  );
}

/**
 * Get parsed upload file object.
 *
 * @export
 * @param {string} [name]
 * @param {any} [defaultValue] - Default value if file is undefined
 * @returns
 */
export function File(name?: string, defaultValue?: any): ParameterDecorator {
  return injectParam(
    async (ctx: KoattyContext, opt?: PayloadOptions) => {
      const body = await bodyParser(ctx, opt);
      const params = body.file ?? {};
      return name ? params[name] : params;
    },
    "File",
    ParamSourceType.FILE,
    name,
    defaultValue
  );
}


/**
 * Get parsed body(form variable and file object).
 *
 * @export
 * @returns ex: {body: {...}, file: {...}}
 */
export function RequestBody(): ParameterDecorator {
  return injectParam(
    (ctx: KoattyContext, opt?: PayloadOptions) => bodyParser(ctx, opt),
    "RequestBody",
    ParamSourceType.BODY
  );
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
  return injectParam(
    (ctx: KoattyContext, opt?: PayloadOptions) => queryParser(ctx, opt),
    "RequestParam",
    ParamSourceType.CUSTOM
  );
}

/**
 * Alias of @RequestParam
 * @param {*}
 * @return {*}
 */
export const Param = RequestParam;