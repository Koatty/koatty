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


/**
 * Parse request body as JSON
 * @param {KoattyContext} ctx - Koatty context object
 * @param {PayloadOptions} opts - Payload parsing options
 * @returns {Promise<{body?: any}>} Parsed JSON object with body property, or empty object if parsing fails
 */
export async function parseJson(ctx: KoattyContext, opts: PayloadOptions) {
  const str = await parseText(ctx, opts);
  if (!str) return {};

  try {
    return { body: JSON.parse(str) };
  } catch (error) {
    Logger.Error(error);

    return {};
  }
}
