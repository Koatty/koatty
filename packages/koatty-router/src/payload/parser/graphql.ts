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
 * Parse GraphQL request payload from context
 * @param ctx KoattyContext instance
 * @param opts PayloadOptions for parsing
 * @returns {Promise<{query?: string, variables?: object, operationName?: string|null}>} Parsed GraphQL payload object
 * @description Parses the GraphQL request body and returns an object containing query, variables, and operationName.
 * If parsing fails, returns an empty object and logs the error.
 */
export async function parseGraphQL(ctx: KoattyContext, opts: PayloadOptions) {
  try {
    const str = await parseText(ctx, opts);
    if (!str) return {};

    const payload = JSON.parse(str);
    return {
      query: payload.query,
      variables: payload.variables || {},
      operationName: payload.operationName || null
    };
  } catch (error) {
    Logger.Error('[GraphQLParseError]', error);

    return {};
  }
}
