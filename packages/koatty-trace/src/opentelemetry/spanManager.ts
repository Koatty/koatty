/*
 * @Description: Enhanced SpanManager with improved concurrency safety and performance
 * @Usage: 
 * @Author: richen
 * @Date: 2020-11-20 17:37:32
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2023-11-10 22:18:40
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import { Span, context, trace, Tracer, SpanAttributes } from '@opentelemetry/api';
import { defaultTextMapSetter } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { KoattyContext } from "koatty_core";
import { DefaultLogger as logger } from "koatty_logger";
import { TraceOptions } from "../trace/itrace";
import { AtomicCounter } from './atomicCounter';

/**
 * Interface for active span tracking
 */
interface ActiveSpanEntry {
  span: Span;
  timer: NodeJS.Timeout;
  createdAt: number;
  requestId?: string;
}

/**
 * Enhanced SpanManager class for managing OpenTelemetry spans in a Koatty application.
 * Provides improved concurrency safety, memory management, and performance optimization.
 * 
 * Features:
 * - Thread-safe span management with atomic operations
 * - Automatic span timeout management with configurable cleanup
 * - Memory limit control with LRU eviction strategy
 * - Sampling rate configuration with performance optimization
 * - W3C trace context propagation
 * - Custom span attributes support with validation
 * - Comprehensive error handling and recovery
 * - Memory usage monitoring and alerting
 * 
 * @class SpanManager
 * @exports
 */
export class SpanManager {
  private readonly activeSpans = new Map<string, ActiveSpanEntry>();
  private span: Span | undefined;
  // ✅ 添加 WeakMap 用于存储 ctx -> span 映射
  private readonly contextSpans = new WeakMap<KoattyContext, Span>();
  private readonly propagator: W3CTraceContextPropagator;
  private readonly options: NonNullable<TraceOptions['opentelemetryConf']>;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly startTime: number;
  private isDestroyed = false;

  // ✅ 替换统计计数器为 AtomicCounter
  private readonly stats = {
    spansCreated: new AtomicCounter(),
    spansEnded: new AtomicCounter(),
    spansTimedOut: new AtomicCounter(),
    memoryEvictions: new AtomicCounter(),
    errors: new AtomicCounter()
  };

  constructor(options: TraceOptions) {
    this.propagator = new W3CTraceContextPropagator();
    this.startTime = Date.now();
    this.options = {
      spanTimeout: 30000,
      samplingRate: 1.0,
      maxActiveSpans: 1000,
      spanAttributes: undefined,
      ...options.opentelemetryConf
    };

    // Setup periodic cleanup to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.performPeriodicCleanup();
    }, Math.min(this.options.spanTimeout || 30000, 60000)); // Cleanup every minute or span timeout, whichever is smaller

    // Setup graceful shutdown
    process.once('SIGTERM', () => this.destroy());
    process.once('SIGINT', () => this.destroy());
  }

  /**
   * Perform periodic cleanup of expired spans and memory monitoring
   */
  private performPeriodicCleanup(): void {
    if (this.isDestroyed) return;

    try {
      const now = Date.now();
      const expiredSpans: string[] = [];
      
      // Find expired spans
      for (const [traceId, entry] of this.activeSpans) {
        const age = now - entry.createdAt;
        if (age > (this.options.spanTimeout || 30000)) {
          expiredSpans.push(traceId);
        }
      }

      // Clean up expired spans
      for (const traceId of expiredSpans) {
        this.forceEndSpan(traceId, 'timeout');
      }

      // Memory pressure check
      this.checkMemoryPressure();

      // Log stats periodically
      if (typeof logger.debug === 'function' && this.activeSpans.size > 0) {
        logger.debug('SpanManager stats:', {
          activeSpans: this.activeSpans.size,
          spansCreated: this.stats.spansCreated.get(),
          spansEnded: this.stats.spansEnded.get(),
          spansTimedOut: this.stats.spansTimedOut.get(),
          memoryEvictions: this.stats.memoryEvictions.get(),
          errors: this.stats.errors.get(),
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        });
      }
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error during periodic cleanup:', error);
    }
  }

  /**
   * Check memory pressure and perform eviction if necessary
   */
  private checkMemoryPressure(): void {
    const maxSpans = this.options.maxActiveSpans || 1000;
    
    if (this.activeSpans.size >= maxSpans) {
      const evictCount = Math.ceil(maxSpans * 0.1); // Evict 10% of max capacity
      this.evictOldestSpans(evictCount);
    }

    // Check system memory pressure
    const memUsage = process.memoryUsage();
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB threshold
      logger.warn('High memory usage detected, performing aggressive span cleanup');
      this.evictOldestSpans(Math.ceil(this.activeSpans.size * 0.2)); // Evict 20%
    }
  }

  /**
   * Evict oldest spans to free memory
   */
  private evictOldestSpans(count: number): void {
    const sortedEntries = Array.from(this.activeSpans.entries())
      .sort(([, a], [, b]) => a.createdAt - b.createdAt)
      .slice(0, count);

    for (const [traceId] of sortedEntries) {
      this.forceEndSpan(traceId, 'memory_pressure');
      this.stats.memoryEvictions.increment();
    }

    if (sortedEntries.length > 0) {
      logger.warn(`Evicted ${sortedEntries.length} oldest spans due to memory pressure`);
    }
  }

  /**
   * Force end a span with proper cleanup
   */
  private forceEndSpan(traceId: string, reason: string): void {
    const entry = this.activeSpans.get(traceId);
    if (!entry) return;

    try {
      clearTimeout(entry.timer);
      entry.span.addEvent('span_forced_end', { reason });
      entry.span.end();
      this.activeSpans.delete(traceId);
      
      if (reason === 'timeout') {
        this.stats.spansTimedOut.increment();
      }
      
      logger.debug(`Span force-ended: ${traceId}, reason: ${reason}`);
    } catch (error) {
      this.stats.errors.increment();
      logger.error(`Error force-ending span ${traceId}:`, error);
    }
  }

  /**
   * Create a new span with enhanced safety and performance
   */
  createSpan(tracer: Tracer, ctx: KoattyContext, serviceName: string): Span | undefined {
    if (this.isDestroyed) {
      logger.warn('SpanManager is destroyed, cannot create span');
      return undefined;
    }

    try {
      // ✅ 检查是否已存在 span (幂等性)
      if (this.contextSpans.has(ctx)) {
        logger.warn('Span already exists for this context');
        return this.contextSpans.get(ctx);
      }

      // Apply sampling
      const shouldSample = Math.random() < (this.options.samplingRate || 1.0);
      if (!shouldSample) {
        return undefined;
      }

      // Validate tracer
      if (!tracer?.startSpan) {
        logger.error('Invalid tracer provided to createSpan');
        this.stats.errors.increment();
        return undefined;
      }

      // Create span
      const span = tracer.startSpan(serviceName, {
        attributes: {
          'service.name': serviceName,
          'request.id': ctx.requestId || 'unknown'
        }
      });

      // ✅ 存储到 WeakMap
      this.contextSpans.set(ctx, span);
      // 保持向后兼容，同时设置 this.span
      this.span = span;
      
      this.stats.spansCreated.increment();
      
      // ✅ 传递 span 参数
      this.setupSpanTimeout(ctx, span);
      this.injectContext(ctx, span);
      this.setBasicAttributes(ctx, span);

      return span;
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error creating span:', error);
      return undefined;
    }
  }

  /**
   * Get current span safely
   * @param ctx - KoattyContext to get span for (optional for backward compatibility)
   */
  getSpan(ctx?: KoattyContext): Span | undefined {
    if (ctx) {
      return this.contextSpans.get(ctx);
    }
    // 向后兼容：如果没有传 ctx，返回 this.span
    return this.span;
  }

  /**
   * Setup span timeout with enhanced error handling
   * @param ctx - KoattyContext
   * @param span - Span instance
   */
  setupSpanTimeout(ctx: KoattyContext, span: Span): void {
    if (!this.options.spanTimeout || !span || this.isDestroyed) return;

    const traceId = span.spanContext().traceId;
    
    // Check if span already exists (avoid duplicates)
    if (this.activeSpans.has(traceId)) {
      logger.warn(`Span ${traceId} already exists in active spans`);
      return;
    }

    let timer: NodeJS.Timeout | null = null;
    
    try {
      timer = setTimeout(() => {
        this.forceEndSpan(traceId, 'timeout');
      }, this.options.spanTimeout);

      // Add to active spans with atomic operation
      this.activeSpans.set(traceId, { 
        span,
        timer,
        createdAt: Date.now(),
        requestId: ctx.requestId
      });

      // Check memory limits after adding (this ensures we check the current size)
      this.checkMemoryPressure();

    } catch (error) {
      if (timer) {
        clearTimeout(timer);
      }
      // Remove from activeSpans if it was added
      this.activeSpans.delete(traceId);
      this.stats.errors.increment();
      logger.error('Failed to setup span timeout:', error);
      throw error;
    }
  }

  /**
   * Inject context with error handling
   * @param ctx - KoattyContext
   * @param span - Span instance
   */
  injectContext(ctx: KoattyContext, span: Span): void {
    if (!span || this.isDestroyed) return;
    
    try {
      const carrier: { [key: string]: string } = {};
      context.with(trace.setSpan(context.active(), span), () => {
        this.propagator.inject(context.active(), carrier, defaultTextMapSetter);
        Object.entries(carrier).forEach(([key, value]) => {
          if (ctx.set && typeof ctx.set === 'function') {
            ctx.set(key, value);
          }
        });
      });
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error injecting context:', error);
    }
  }

  /**
   * Set basic attributes with validation
   * @param ctx - KoattyContext
   * @param span - Span instance
   */
  setBasicAttributes(ctx: KoattyContext, span: Span): void {
    if (!span || this.isDestroyed) return;
    
    try {
      // Set safe attributes
      const safeAttributes: SpanAttributes = {};
      
      if (ctx.requestId) {
        safeAttributes["http.request_id"] = ctx.requestId;
      }
      if (ctx.method) {
        safeAttributes["http.method"] = ctx.method;
      }
      if (ctx.path) {
        safeAttributes["http.route"] = ctx.path;
      }

      span.setAttributes(safeAttributes);

      // Apply custom attributes if provided
      if (this.options.spanAttributes && typeof this.options.spanAttributes === 'function') {
        try {
          const customAttrs = this.options.spanAttributes(ctx);
          if (customAttrs && typeof customAttrs === 'object') {
            span.setAttributes(customAttrs);
          }
        } catch (error) {
          logger.error('Error applying custom span attributes:', error);
        }
      }
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error setting basic attributes:', error);
    }
  }

  /**
   * Set span attributes safely
   * @param ctx - KoattyContext
   * @param attributes - SpanAttributes to set
   */
  setSpanAttributes(ctx: KoattyContext, attributes: SpanAttributes): this {
    const span = this.contextSpans.get(ctx);
    if (!span || this.isDestroyed) return this;
    
    try {
      span.setAttributes(attributes);
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error setting span attributes:', error);
    }
    return this;
  }

  /**
   * Add span event safely
   * @param ctx - KoattyContext
   * @param name - Event name
   * @param attributes - Optional event attributes
   */
  addSpanEvent(ctx: KoattyContext, name: string, attributes?: SpanAttributes): void {
    const span = this.contextSpans.get(ctx);
    if (!span || this.isDestroyed) return;
    
    try {
      span.addEvent(name, attributes);
    } catch (error) {
      this.stats.errors.increment();
      logger.error('Error adding span event:', error);
    }
  }

  /**
   * End span with proper cleanup
   * @param ctx - KoattyContext
   */
  endSpan(ctx: KoattyContext): void {
    const span = this.contextSpans.get(ctx);
    if (!span || this.isDestroyed) return;
    
    const traceId = span.spanContext().traceId;
    
    try {
      // Clean up from active spans
      const entry = this.activeSpans.get(traceId);
      if (entry) {
        clearTimeout(entry.timer);
        this.activeSpans.delete(traceId);
      }

      // End the span
      span.end();
      this.stats.spansEnded.increment();
      
      // Clear from WeakMap (context will be GC'd automatically)
      this.contextSpans.delete(ctx);
      
      // Clear current span reference if it matches
      if (this.span === span) {
        this.span = undefined;
      }
      
    } catch (error) {
      this.stats.errors.increment();
      logger.error("SpanManager.endSpan error:", error);
    }
  }

  /**
   * Get manager statistics
   */
  getStats() {
    return {
      spansCreated: this.stats.spansCreated.get(),
      spansEnded: this.stats.spansEnded.get(),
      spansTimedOut: this.stats.spansTimedOut.get(),
      memoryEvictions: this.stats.memoryEvictions.get(),
      errors: this.stats.errors.get(),
      activeSpansCount: this.activeSpans.size,
      uptime: Date.now() - this.startTime,
      isDestroyed: this.isDestroyed,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Graceful shutdown with cleanup
   */
  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    
    try {
      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // End all active spans
      for (const [traceId] of this.activeSpans) {
        this.forceEndSpan(traceId, 'manager_destroyed');
      }

      // End current span
      if (this.span) {
        this.span.end();
        this.span = undefined;
      }

      logger.info('SpanManager destroyed successfully', this.getStats());
    } catch (error) {
      logger.error('Error during SpanManager destruction:', error);
    }
  }
}

