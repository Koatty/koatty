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
import { BufferEncoding, IncomingForm } from "formidable";
import onFinished from "on-finished";
import { deleteFiles } from "../../utils/path";

/**
 * Parse multipart/form-data request payload
 * 
 * @param ctx KoattyContext - The Koatty context object
 * @param opts PayloadOptions - Configuration options for parsing
 * @returns Promise<{body: any, file: any}> - Resolves with parsed fields and files
 * 
 * @description
 * Handles multipart form data parsing using IncomingForm.
 * Supports file uploads with automatic cleanup on response finish.
 * Returns empty objects if content-type is not multipart or if parsing fails.
 * 
 * @example
 * const { body, file } = await parseMultipart(ctx, {
 *   encoding: 'utf-8',
 *   multiples: true,
 *   keepExtensions: true,
 *   limit: 20 // Max file size in MB
 * });
 */
export function parseMultipart(ctx: KoattyContext, opts: PayloadOptions) {
  // Early validation
  if (!ctx.request.headers['content-type']?.includes('multipart/form-data')) {
    return Promise.resolve({ body: {}, file: {} });
  }

  const form = new IncomingForm({
    encoding: <BufferEncoding>opts.encoding,
    multiples: opts.multiples,
    keepExtensions: opts.keepExtensions,
    maxFileSize: opts.limit ? parseInt(opts.limit) * 1024 * 1024 : 20 * 1024 * 1024,
  });

  const cleanup = () => {
    if (uploadFiles) {
      try {
        deleteFiles(uploadFiles);
      } catch (e) {
        Logger.Error('[FileCleanupError]', e);

      }
    }
  };

  let uploadFiles: any = null;
  onFinished(ctx.res, cleanup);

  return new Promise((resolve) => {
    form.parse(ctx.req, (err, fields, files) => {
      if (err) {
        cleanup();
        Logger.Error('[MultipartParseError]', err);

        return resolve({ body: {}, file: {} });
      }

      uploadFiles = files;
      resolve({
        body: fields,
        file: files
      });
    });
  });
}
