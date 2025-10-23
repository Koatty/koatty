/*
 * @Description: Payload parsing utilities with performance optimizations
 * @Usage: Parse request body based on content-type with caching
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { DefaultLogger as Logger } from "koatty_logger";
import { KoattyContext } from "koatty_core";
import { PayloadOptions } from "../interface";
import { parseText } from "./text";
import { parse } from "fast-querystring";

/**
 * Parse form-urlencoded request body.
 * 
 * @param {KoattyContext} ctx - The Koatty context object
 * @param {PayloadOptions} opts - The payload parsing options
 * @returns {Promise<{body?: any}>} Parsed form data object with body property, or empty object if parsing fails
 * @private
 */
export async function parseForm(ctx: KoattyContext, opts: PayloadOptions) {
  // Early return for empty or invalid content
  if (!ctx.request.headers['content-length'] ||
    !ctx.request.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    return {};
  }

  const str = await parseText(ctx, opts);
  if (!str || str.trim().length === 0) {
    return {};
  }

  try {
    const result = parse(str);
    return {
      body: result
    };
  } catch (error) {
    Logger.Error('[FormParseError]', error);

    return {};
  }
}
