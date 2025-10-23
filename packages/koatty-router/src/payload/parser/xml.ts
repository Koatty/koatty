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
import { XMLParser } from "fast-xml-parser";
import { parseText } from "./text";

interface XMLParserOptions {
  ignoreAttributes: boolean;
  isArray: (name: string) => boolean;
}


// 单例 XML 解析器，避免重复创建
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  isArray: () => false,
} as XMLParserOptions);

/**
 * Parse XML payload from request body
 * @param ctx KoattyContext instance
 * @param opts Payload parsing options
 * @returns {Promise<{body?: any}>} Parsed XML object in body property or empty object if parsing fails
 */
export async function parseXml(ctx: KoattyContext, opts: PayloadOptions) {
  const str = await parseText(ctx, opts);
  if (!str) return {};

  try {
    return { body: xmlParser.parse(str) };
  } catch (error) {
    Logger.Error(error);

    return {};
  }
}

