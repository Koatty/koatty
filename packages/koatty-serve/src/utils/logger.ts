/*
 * @Description: Structured logging utilities based on koatty_logger
 * @Usage: 
 * @Author: richen
 * @Date: 2025-01-27 12:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { DefaultLogger as Logger } from "koatty_logger";
import { performance } from "perf_hooks";

// Re-export ID generators from helper for backward compatibility
export { generateTraceId, generateConnectionId, generateRequestId } from "./helper";

/**
 * Log context interface
 */
export interface LogContext {
  module?: string;          // 模块名 (如: HTTP, WebSocket, gRPC)
  protocol?: string;        // 协议类型
  serverId?: string;        // 服务器实例ID
  connectionId?: string;    // 连接ID
  requestId?: string;       // 请求ID
  userId?: string;          // 用户ID
  sessionId?: string;       // 会话ID
  traceId?: string;         // 追踪ID
  action?: string;          // 操作类型
  [key: string]: any;       // 其他自定义字段
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  [key: string]: any;
}

/**
 * Structured logger class based on koatty_logger
 * koatty_logger 2.4.0+ 已内置批量日志处理、采样、级别过滤等优化功能
 */
export class StructuredLogger {
  private static instance: StructuredLogger;
  private globalContext: LogContext = {};

  private constructor() {
    // koatty_logger 2.4.0+ 已内置优化，无需额外包装
  }

  static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Set global context for all logs
   * @param context Global context to merge with all log entries
   */
  setGlobalContext(context: LogContext): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  /**
   * Get current global context
   */
  getGlobalContext(): LogContext {
    return { ...this.globalContext };
  }

  /**
   * Clear global context
   */
  clearGlobalContext(): void {
    this.globalContext = {};
  }

  /**
   * Format log message with context
   * @param message Log message
   * @param context Additional context
   * @param data Additional data to log
   * @returns Formatted message string
   */
  private formatMessage(message: string, context?: LogContext, data?: any): string {
    const mergedContext = context ? { ...this.globalContext, ...context } : this.globalContext;
    const parts: string[] = [];
    
    if (mergedContext.module) {
      parts.push(`[${mergedContext.module.toUpperCase()}]`);
    }
    
    if (mergedContext.protocol) {
      parts.push(`[${mergedContext.protocol.toUpperCase()}]`);
    }
    
    if (mergedContext.connectionId) {
      parts.push(`[conn:${mergedContext.connectionId}]`);
    }
    
    if (mergedContext.requestId) {
      parts.push(`[req:${mergedContext.requestId}]`);
    }
    
    if (mergedContext.traceId) {
      parts.push(`[trace:${mergedContext.traceId}]`);
    }
    
    let finalMessage = parts.length > 0 ? `${parts.join(' ')} ${message}` : message;
    
    if (data) {
      const contextKeys = Object.keys(mergedContext);
      const additionalData = Object.entries(data)
        .filter(([key]) => !contextKeys.includes(key))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      if (Object.keys(additionalData).length > 0) {
        finalMessage += ` | Data: ${JSON.stringify(additionalData)}`;
      }
    }
    
    return finalMessage;
  }

  /**
   * Log debug message
   * @param message Log message
   * @param context Additional context
   * @param data Additional data
   */
  debug(message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage(message, context, data);
    Logger.Debug(formattedMessage);
  }

  /**
   * Log info message
   * @param message Log message
   * @param context Additional context
   * @param data Additional data
   */
  info(message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage(message, context, data);
    Logger.Info(formattedMessage);
  }

  /**
   * Log warning message
   * @param message Log message
   * @param context Additional context
   * @param data Additional data
   */
  warn(message: string, context?: LogContext, data?: any): void {
    const formattedMessage = this.formatMessage(message, context, data);
    Logger.Warn(formattedMessage);
  }

  /**
   * Log error message
   * @param message Log message
   * @param context Additional context
   * @param error Error object or additional data
   */
  error(message: string, context?: LogContext, error?: Error | any): void {
    let errorData: any = error;
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    const formattedMessage = this.formatMessage(message, context, errorData);
    Logger.Error(formattedMessage);
  }

  /**
   * Create a child logger with merged context
   * @param context Context to merge
   * @returns New logger instance with merged context
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger();
    childLogger.setGlobalContext({ ...this.globalContext, ...context });
    return childLogger;
  }

  /**
   * Start performance measurement
   * @param label Performance measurement label
   * @returns Performance metrics object
   */
  startPerformanceMeasurement(label: string): PerformanceMetrics {
    const startTime = performance.now();
    const memoryUsage = process.memoryUsage();
    
    return {
      startTime,
      memoryUsage,
      label
    };
  }

  /**
   * End performance measurement and log result
   * @param metrics Performance metrics from startPerformanceMeasurement
   * @param context Additional context
   */
  endPerformanceMeasurement(metrics: PerformanceMetrics, context?: LogContext): void {
    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    const endMemoryUsage = process.memoryUsage();
    
    const memoryDelta = {
      rss: endMemoryUsage.rss - (metrics.memoryUsage?.rss || 0),
      heapTotal: endMemoryUsage.heapTotal - (metrics.memoryUsage?.heapTotal || 0),
      heapUsed: endMemoryUsage.heapUsed - (metrics.memoryUsage?.heapUsed || 0),
      external: endMemoryUsage.external - (metrics.memoryUsage?.external || 0)
    };
    
    this.debug(
      `Performance: ${metrics.label || 'Operation'} completed`,
      context,
      {
        duration: `${duration.toFixed(2)}ms`,
        memoryDelta: {
          rss: `${(memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`,
          heapUsed: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`
        }
      }
    );
  }

  /**
   * Measure and log performance of async operation
   * @param label Performance measurement label
   * @param operation Async operation to measure
   * @param context Additional context
   * @returns Result of the operation
   */
  async measureAsync<T>(
    label: string,
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const metrics = this.startPerformanceMeasurement(label);
    try {
      const result = await operation();
      this.endPerformanceMeasurement(metrics, context);
      return result;
    } catch (error) {
      this.endPerformanceMeasurement(metrics, context);
      throw error;
    }
  }

  /**
   * Measure and log performance of sync operation
   * @param label Performance measurement label
   * @param operation Sync operation to measure
   * @param context Additional context
   * @returns Result of the operation
   */
  measureSync<T>(
    label: string,
    operation: () => T,
    context?: LogContext
  ): T {
    const metrics = this.startPerformanceMeasurement(label);
    try {
      const result = operation();
      this.endPerformanceMeasurement(metrics, context);
      return result;
    } catch (error) {
      this.endPerformanceMeasurement(metrics, context);
      throw error;
    }
  }
}

/**
 * Create a new structured logger instance
 * @param context Initial context
 * @returns New logger instance
 */
export function createLogger(context?: LogContext): StructuredLogger {
  const logger = StructuredLogger.getInstance();
  if (context) {
    return logger.child(context);
  }
  return logger;
}

// Export singleton instance
export const structuredLogger = StructuredLogger.getInstance();

// Export convenience functions
export const debug = (message: string, context?: LogContext, data?: any) => 
  structuredLogger.debug(message, context, data);

export const info = (message: string, context?: LogContext, data?: any) => 
  structuredLogger.info(message, context, data);

export const warn = (message: string, context?: LogContext, data?: any) => 
  structuredLogger.warn(message, context, data);

export const error = (message: string, context?: LogContext, error?: Error | any) => 
  structuredLogger.error(message, context, error);

export const setGlobalContext = (context: LogContext) => 
  structuredLogger.setGlobalContext(context);

export const clearGlobalContext = () => 
  structuredLogger.clearGlobalContext();

export const measureAsync = <T>(
  label: string,
  operation: () => Promise<T>,
  context?: LogContext
) => structuredLogger.measureAsync(label, operation, context);

export const measureSync = <T>(
  label: string,
  operation: () => T,
  context?: LogContext
) => structuredLogger.measureSync(label, operation, context);
