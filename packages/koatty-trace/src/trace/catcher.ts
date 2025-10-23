/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2024-11-11 11:36:07
 * @LastEditTime: 2025-03-31 17:51:22
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { IOCContainer } from "koatty_container";
import { KoattyContext } from "koatty_core";
import { Exception, isException } from "koatty_exception";
import { Helper } from "koatty_lib";
import { Span } from "@opentelemetry/api";
import { extensionOptions } from "./itrace";
import { SpanManager } from '../opentelemetry/spanManager';

/**
 * Global error catcher for handling exceptions in Koatty framework.
 * 
 * @param ctx - Koatty context object
 * @param err - Error or Exception object to be handled
 * @param ext - Optional extension options
 * @returns Result of error handling through Exception handler
 * 
 * @description
 * This function processes errors by:
 * 1. Handling existing Exception objects with spans
 * 2. Using custom global error handlers if provided
 * 3. Falling back to default Exception handling
 */
export function catcher<T extends Exception>(
  ctx: KoattyContext,
  err: Error | Exception | T,
  ext?: extensionOptions
) {
  const { message: sanitizedMessage, status } = getErrorInfo(ctx, err);
  const code = (<T>err).code || 1;
  const stack = err.stack;
  const span = ext.spanManager?.getSpan();

  // 如果是异常对象，直接返回
  if (isException(err)) {
    return (<Exception>err).setCode(code).setStatus(status).
      setMessage(sanitizedMessage).setSpan(span).setStack(stack).handler(ctx);
  }
  // 执行自定义全局异常处理
  const ins: Exception = IOCContainer.getInsByClass(ext.globalErrorHandler,
    [sanitizedMessage, code, status, stack, span])
  if (Helper.isFunction(ins?.handler)) {
    return ins.handler(ctx);
  }

  // 使用默认异常处理
  return new Exception(sanitizedMessage, code, status, stack, span).handler(ctx);
}

/**
 * Get error information including status code and sanitized message
 * @param ctx KoattyContext - The Koatty context object
 * @param err Error | Exception - The error object
 * @returns {Object} - Object containing:
 *   - status: {number} HTTP status code
 *   - message: {string} Sanitized error message
 * @description
 * This function provides comprehensive error information by:
 * 1. Determining appropriate HTTP status code based on:
 *    - Explicit status from error object
 *    - Context status
 *    - Default 500 for unhandled errors
 * 2. Extracting and sanitizing error message by:
 *    - Using error.message if available
 *    - Falling back to context.message
 *    - Escaping double quotes to prevent JSON injection
 * 3. Handling various error types:
 *    - Built-in Error objects
 *    - Custom Exception objects
 *    - Context-specific errors
 */
function getErrorInfo<T extends Exception>(ctx: KoattyContext,
  err: Error | Exception | T) {
  // Status code determination
  let status = 500; // 默认 500（服务器错误）
  if ('status' in err && typeof err.status === 'number') {
    status = err.status;
  } else if (err instanceof Error) {
    status = 500; // 确保 throw new Error() 不会误判为 404
  } else if (ctx.status === 404 && !(ctx.response as any)._explicitStatus) {
    status = 404; // 未匹配路由的默认 404
  } else {
    status = ctx.status || 500;
  }

  // Message extraction and sanitization
  let message = "";
  try {
    message = (err?.message ?? ctx?.message ?? "").toString();
    // Escape double quotes to prevent JSON injection
    message = message.replace(/"/g, '\\"');
  } catch (e) {
    message = "";
  }

  return { status, message };
}