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
 * Parse gRPC request payload from the context
 * 
 * @param {KoattyContext} ctx - Koatty context object
 * @param {PayloadOptions} opts - Payload parsing options
 * @returns {Promise<{body: Buffer} | {}>} Raw buffer for protobuf data or empty object if parsing fails
 * @description 
 * gRPC uses Protocol Buffers binary format. This parser returns the raw buffer
 * for manual decoding in controllers using proto definitions.
 * The buffer should NOT be converted to string as it will corrupt the binary data.
 */
export async function parseGrpc(ctx: KoattyContext, opts: PayloadOptions) {
  try {
    // gRPC 使用 protobuf 二进制格式，直接返回 Buffer
    // 不能使用 toString()，否则会破坏二进制数据
    const buffer = await getRawBody(inflate(ctx.req), opts);
    
    // 返回原始 Buffer，让控制器使用 proto 定义进行解码
    return { body: buffer };
  } catch (error) {
    Logger.Error('[GrpcParseError]', error);
    return {};
  }
}
