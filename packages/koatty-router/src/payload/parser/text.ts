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
import getRawBody from "raw-body";
import inflate from "inflation";

/**
 * Parse raw request body as text.
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {PayloadOptions} opts - Payload parsing options
 * @returns {Promise<string>} Parsed text content, empty string if parsing fails
 */
export function parseText(ctx: KoattyContext, opts: PayloadOptions): Promise<string> {
  return getRawBody(inflate(ctx.req), opts)
    .catch(err => {
      Logger.Error(err);

      return "";
    });
}