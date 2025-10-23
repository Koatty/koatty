/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-12-15 11:49:15
 */

import { IOCContainer } from "koatty_container";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import { Span, SpanStatusCode,  } from "@opentelemetry/api";
import { StatusCodeConvert } from "./code";
import { IExceptionContext } from "./IContext";
import { Output } from "./output";
import { ATTR_HTTP_REQUEST_METHOD, ATTR_HTTP_RESPONSE_STATUS_CODE, ATTR_URL_FULL } from "@opentelemetry/semantic-conventions";

/**
 * Exception configuration interface
 */
export interface ExceptionConfig {
  enableStackTrace?: boolean;
  logFormat?: 'json' | 'text';
  customErrorFormat?: (error: Exception) => any;
  maxStackLength?: number;
}

/**
 * Error context interface
 */
export interface ErrorContext {
  requestId: string;
  path: string;
  method: string;
  userAgent?: string;
  startTime: number;
  endTime: number;
  duration: number;
  // 允许任意额外字段
  [key: string]: any;
}

// 全局配置
let globalConfig: ExceptionConfig = {
  enableStackTrace: process.env.NODE_ENV !== 'production',
  logFormat: 'json',
  maxStackLength: 1000
};

/**
 * Set global exception configuration
 * 
 * @param {Partial<ExceptionConfig>} config - Configuration options
 */
export function setExceptionConfig(config: Partial<ExceptionConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current exception configuration
 * 
 * @returns {ExceptionConfig} Current configuration
 */
export function getExceptionConfig(): ExceptionConfig {
  return { ...globalConfig };
}

/**
 * Indicates that an decorated class is a "ExceptionHandler".
 * @ExceptionHandler()
 * export class BusinessException extends Exception { 
 *    constructor(message: string, code: number, status: number) { ... }
 *    handler(ctx: IExceptionContext) { 
 * 
 *      ...//Handling business exceptions 
 * 
 *    }
 * }
 *
 * @export
 * @param {string} [identifier] class name
 * @returns {ClassDecorator}
 */
export function ExceptionHandler(): ClassDecorator {
  return (target: any) => {
    const identifier = IOCContainer.getIdentifier(target);
    // if (identifier === "Exception") {
    //     throw new Error("class name cannot be `Exception`");
    // }
    // if (!identifier.endsWith("Exception")) {
    //     throw Error("class name must end with 'Exception'");
    // }
    // if (!target.prototype.type) {
    //     throw new Error("class's property 'type' must be set");
    // }
    if (!(target.prototype instanceof Exception)) {
      throw new Error(`class ${identifier} does not inherit from class 'Exception'`);
    }
    IOCContainer.saveClass("COMPONENT", target, "ExceptionHandler");
  };
}

/**
 * Predefined runtime exception
 *
 * @export
 * @class Exception
 * @extends {Error}
 */
export class Exception extends Error {
  public readonly type: string = 'Exception';
  public status: number = 500;
  public code: number = 1;
  public span?: Span;
  public timestamp: number;
  public context?: Partial<ErrorContext>;

  /**
   * @description: Creates an instance of Exception.
   * @param {string} message err message
   * @param {number} code err code
   * @param {number} status http status
   * @param {string} stack err stack
   * @param {Span} span opentracing span
   * @return {Exception}
   */
  constructor(message: string, code?: number, status?: number, stack?: string, span?: Span) {
    super(message);
    this.timestamp = Date.now();
    this.setCode(code);
    this.setStatus(status);
    this.setStack(stack);
    this.span = span;
    
    // 确保错误名称正确
    this.name = this.constructor.name;
  }

  /**
   * Set error code with validation
   * 
   * @param {number} code - Error code
   * @returns {Exception} This instance for chaining
   */
  setCode(code?: number): this {
    if (code !== undefined && Helper.isNumber(code) && code >= 0) {
      this.code = Math.floor(code); // 确保是整数
    }
    return this;
  }

  /**
   * Set HTTP status with validation
   * 
   * @param {number} status - HTTP status code
   * @returns {Exception} This instance for chaining
   */
  setStatus(status?: number): this {
    if (status !== undefined && Helper.isNumber(status) && status >= 100 && status < 600) {
      this.status = Math.floor(status); // 确保是整数
    }
    return this;
  }

  /**
   * Set error message with validation
   * 
   * @param {string} message - Error message
   * @returns {Exception} This instance for chaining
   */
  setMessage(message: string): this {
    if (message && typeof message === 'string') {
      this.message = message.trim();
    }
    return this;
  }

  /**
   * Set stack trace with validation
   * 
   * @param {string} stack - Stack trace
   * @returns {Exception} This instance for chaining
   */
  setStack(stack?: string): this {
    if (stack && typeof stack === 'string') {
      const config = getExceptionConfig();
      this.stack = config.maxStackLength && stack.length > config.maxStackLength 
        ? stack.substring(0, config.maxStackLength) + '...[truncated]'
        : stack;
    }
    return this;
  }

  /**
   * Set OpenTelemetry span
   * 
   * @param {Span} span - OpenTelemetry span
   * @returns {Exception} This instance for chaining
   */
  setSpan(span: Span): this {
    if (span) {
      this.span = span;
    }
    return this;
  }

  /**
   * Set error context
   * 
   * @param {Partial<ErrorContext>} context - Error context
   * @returns {Exception} This instance for chaining
   */
  setContext(context: Partial<ErrorContext>): this {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * @description: Default exception handler
   * @param {IExceptionContext} ctx
   * @return {Promise<any>}
   */
  async handler(ctx: IExceptionContext): Promise<any> {
    try {
      // 设置响应状态
      ctx.status = this.status || ctx.status;
      
      // 设置错误上下文
      this.setContext({
        requestId: ctx.requestId,
        path: ctx.originalPath || '/',
        method: ctx.method,
        userAgent: ctx.get('User-Agent'),
        startTime: ctx.startTime,
        endTime: Date.now(),
        duration: Date.now() - ctx.startTime
      });
      
      // 记录日志
      this.log(ctx);
      
      // 设置响应类型
      ctx.type = ctx.encoding !== false ? `application/json; charset=${ctx.encoding}` : 'application/json';
      
      return this.output(ctx);
    } catch (error) {
      Logger.Error('Exception handler failed:', error);
      
      // 降级处理 - 返回基本错误响应
      return this.fallbackOutput(ctx, error);
    }
  }

  /**
   * @description: 降级输出处理
   * @param {IExceptionContext} ctx
   * @param {unknown} _error
   * @return {any}
   */
  private fallbackOutput(ctx: IExceptionContext, _error: unknown): any {
    const isGrpc = ctx.protocol === 'grpc';
    const isWebSocket = ctx.protocol === 'ws' || ctx.protocol === 'wss';
    
    const fallbackResponse: { code: number; message: string; data: null } = {
      code: 500,
      message: "Internal Server Error",
      data: null
    };

    if (isGrpc) {
      return ctx.rpc.callback({
        code: 13, // INTERNAL
        details: JSON.stringify(fallbackResponse)
      }, null);
    }

    const body = JSON.stringify(fallbackResponse);
    ctx.length = Buffer.byteLength(body);

    if (isWebSocket) {
      return ctx.websocket.send(body);
    }

    return ctx.res.end(body);
  }

  /**
   * @description: 结构化日志记录
   * @param {IExceptionContext} ctx
   * @return {void}
   */
  protected log(ctx: IExceptionContext): void {
    const config = getExceptionConfig();
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      type: this.type,
      message: this.message,
      code: this.code,
      status: this.status,
      context: this.context || {
        requestId: ctx.requestId,
        path: ctx.originalPath || '/',
        method: ctx.method,
        startTime: ctx.startTime,
        duration: Date.now() - ctx.startTime,
        endTime: Date.now()
      },
      ...(config.enableStackTrace && this.stack && { stack: this.stack })
    };

    // 根据配置决定日志格式
    const logMessage = config.logFormat === 'json' 
      ? JSON.stringify(logData, null, 2)
      : this.formatTextLog(logData);

    Logger.Error(logMessage);

    // 更新链路追踪信息
    this.updateSpan(ctx);
  }

  /**
   * Format log as text
   * 
   * @param {any} logData - Log data object
   * @returns {string} Formatted text log
   */
  private formatTextLog(logData: any): string {
    const { timestamp, level, type, message, code, status, context, stack } = logData;
    let log = `[${timestamp}] ${level}: ${type} - ${message} (code: ${code}, status: ${status})`;
    
    if (context) {
      log += `\n  Context: ${JSON.stringify(context)}`;
    }
    
    if (stack) {
      log += `\n  Stack: ${stack}`;
    }
    
    return log;
  }

  /**
   * Update OpenTelemetry span with error information
   * 
   * @param {IExceptionContext} ctx - Koatty context
   */
  private updateSpan(ctx: IExceptionContext): void {
    if (this.span) {
      this.span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: this.message 
      });
      this.span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, ctx.status);
      this.span.setAttribute(ATTR_HTTP_REQUEST_METHOD, ctx.method);
      this.span.setAttribute(ATTR_URL_FULL, ctx.url);
      this.span.setAttribute('error.code', this.code);
      this.span.setAttribute('error.type', this.type);
    }
  }

  /**
   * @description: 输出处理
   * @param {IExceptionContext} ctx
   * @return {any}
   */
  protected output(ctx: IExceptionContext): any {
    const config = getExceptionConfig();
    const isGrpc = ctx.protocol === 'grpc';
    const isWebSocket = ctx.protocol === 'ws' || ctx.protocol === 'wss';
    
    // 使用自定义格式或默认格式
    const responseBody = config.customErrorFormat 
      ? config.customErrorFormat(this)
      : this.message || "";

    if (isGrpc) {
      if (this.code < 2) {
        this.code = StatusCodeConvert(ctx.status);
      }
      return ctx.rpc.callback({
        code: this.code,
        details: JSON.stringify(ctx.body || responseBody)
      }, null);
    }

    const body = JSON.stringify(Output.fail(responseBody, ctx.body || '', this.code));
    ctx.length = Buffer.byteLength(body);

    if (isWebSocket) {
      return ctx.websocket.send(body);
    }

    return ctx.res.end(body);
  }

  /**
   * Convert exception to plain object
   * 
   * @returns {object} Plain object representation
   */
  toJSON(): object {
    const config = getExceptionConfig();
    return {
      type: this.type,
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      timestamp: this.timestamp,
      context: this.context,
      ...(config.enableStackTrace && this.stack && { stack: this.stack })
    };
  }
}

