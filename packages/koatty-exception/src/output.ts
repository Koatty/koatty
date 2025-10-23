/*
 * @Description: output data
 * @Usage: 
 * @Author: richen
 * @Date: 2024-01-03 22:03:34
 * @LastEditTime: 2024-03-15 06:16:52
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { Helper } from "koatty_lib";

/**
 * Interface for Api output
 */
export interface JsonResult<T = any> {
  code: number; // 错误码
  message: string; // 消息内容
  data: T; // 数据
}

/**
 * Interface for Api CodeError
 */
export interface CodeError {
  code?: number;
  message?: string;
  data?: unknown;
}

/**
 * Type guard for JsonResult
 * 
 * @param {unknown} obj - Object to check
 * @returns {obj is JsonResult} Type guard result
 */
function isJsonResult(obj: unknown): obj is JsonResult {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'code' in obj &&
    'message' in obj &&
    'data' in obj &&
    typeof (obj as JsonResult).code === 'number' &&
    typeof (obj as JsonResult).message === 'string'
  );
}

/**
 * Type guard for CodeError
 * 
 * @param {unknown} obj - Object to check
 * @returns {obj is CodeError} Type guard result
 */
function isCodeError(obj: unknown): obj is CodeError {
  return !!(
    obj &&
    typeof obj === 'object' &&
    ('code' in obj || 'message' in obj || 'data' in obj)
  );
}

/**
 * Safe string conversion
 * 
 * @param {unknown} value - Value to convert
 * @returns {string} String representation
 */
function safeStringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object object]';
    }
  }
  
  return String(value);
}

export class Output {
  /**
   * Response to normalize json format content for success
   *
   * @template T
   * @param {string | JsonResult<T>} msg - Message or JsonResult object
   * @param {T} [data] - Response data
   * @param {number} [code=0] - Success code, default 0
   * @returns {JsonResult<T>} Normalized success response
   */
  public static ok<T = any>(msg: string | JsonResult<T>, data?: T, code = 0): JsonResult<T> {
    // Validate inputs
    if (typeof code !== 'number' || code < 0) {
      code = 0;
    }
    
    // Handle JsonResult input
    if (isJsonResult(msg)) {
      return {
        code: typeof msg.code === 'number' ? msg.code : code,
        message: safeStringify(msg.message),
        data: msg.data
      };
    }
    
    return {
      code: code,
      message: safeStringify(msg),
      data: data as T
    };
  }

  /**
   * Response to normalize json format content for fail
   *
   * @template T
   * @param {Error | CodeError | string | unknown} err - Error object, message, or unknown error
   * @param {T} [data] - Additional error data
   * @param {number} [code=1] - Error code, default 1
   * @returns {JsonResult<T>} Normalized error response
   */
  public static fail<T = any>(err?: Error | CodeError | string | unknown, data?: T, code = 1): JsonResult<T> {
    // Validate code input
    if (typeof code !== 'number' || code < 1) {
      code = 1;
    }
    
    // Handle Error objects
    if (Helper.isError(err)) {
      return {
        code: code,
        message: (<any>err).message || 'Unknown error',
        data: data as T
      };
    }
    
    // Handle CodeError objects
    if (isCodeError(err)) {
      return {
        code: typeof err.code === 'number' && err.code > 0 ? err.code : code,
        message: safeStringify(err.message) || 'Unknown error',
        data: (err.data as T) || data as T
      };
    }
    
    // Handle string messages
    if (typeof err === 'string') {
      return {
        code: code,
        message: err.trim() || 'Unknown error',
        data: data as T
      };
    }
    
    // Handle unknown errors
    return {
      code: code,
      message: safeStringify(err) || 'Unknown error occurred',
      data: data as T
    };
  }

  /**
   * Create a paginated response
   * 
   * @template T
   * @param {T[]} items - Array of items
   * @param {number} total - Total count
   * @param {number} page - Current page (1-based)
   * @param {number} pageSize - Items per page
   * @param {string} [message='Success'] - Response message
   * @returns {JsonResult} Paginated response
   */
  public static paginate<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
    message = 'Success'
  ): JsonResult<{
    items: T[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Validate inputs
    const safeTotal = Math.max(0, Math.floor(total));
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.floor(pageSize));
    const totalPages = Math.ceil(safeTotal / safePageSize);
    
    return this.ok(message, {
      items: Array.isArray(items) ? items : [],
      pagination: {
        total: safeTotal,
        page: safePage,
        pageSize: safePageSize,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1
      }
    });
  }

  /**
   * Create a response with metadata
   * 
   * @template T
   * @param {string} message - Response message
   * @param {T} data - Response data
   * @param {Record<string, unknown>} [meta] - Additional metadata
   * @param {number} [code=0] - Response code
   * @returns {JsonResult} Response with metadata
   */
  public static withMeta<T>(
    message: string,
    data: T,
    meta?: Record<string, unknown>,
    code = 0
  ): JsonResult<{ data: T; meta?: Record<string, unknown> }> {
    return this.ok(message, {
      data,
      ...(meta && Object.keys(meta).length > 0 && { meta })
    }, code);
  }
}
