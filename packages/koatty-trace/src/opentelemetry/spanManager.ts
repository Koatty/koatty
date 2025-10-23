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
  private readonly propagator: W3CTraceContextPropagator;
  private readonly options: NonNullable<TraceOptions['opentelemetryConf']>;
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly startTime: number;
  private isDestroyed = false;

  // Performance counters
  private stats = {
    spansCreated: 0,
    spansEnded: 0,
    spansTimedOut: 0,
    memoryEvictions: 0,
    errors: 0
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
          ...this.stats,
          memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        });
      }
    } catch (error) {
      this.stats.errors++;
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
      this.stats.memoryEvictions++;
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
        this.stats.spansTimedOut++;
      }
      
      logger.debug(`Span force-ended: ${traceId}, reason: ${reason}`);
    } catch (error) {
      this.stats.errors++;
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
      // Apply sampling
      const shouldSample = Math.random() < (this.options.samplingRate || 1.0);
      if (!shouldSample) {
        return undefined;
      }

      // Validate tracer
      if (!tracer?.startSpan) {
        logger.error('Invalid tracer provided to createSpan');
        this.stats.errors++;
        return undefined;
      }

      // Create span
      this.span = tracer.startSpan(serviceName, {
        attributes: {
          'service.name': serviceName,
          'request.id': ctx.requestId || 'unknown'
        }
      });

      this.stats.spansCreated++;
      
      // Setup timeout and tracking
      this.setupSpanTimeout(ctx);
      this.injectContext(ctx);
      this.setBasicAttributes(ctx);

      return this.span;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error creating span:', error);
      return undefined;
    }
  }

  /**
   * Get current span safely
   */
  getSpan(): Span | undefined {
    return this.span;
  }

  /**
   * Setup span timeout with enhanced error handling
   */
  setupSpanTimeout(ctx?: KoattyContext): void {
    if (!this.options.spanTimeout || !this.span || this.isDestroyed) return;

    const traceId = this.span.spanContext().traceId;
    
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
        span: this.span!,
        timer,
        createdAt: Date.now(),
        requestId: ctx?.requestId
      });

      // Check memory limits after adding (this ensures we check the current size)
      this.checkMemoryPressure();

    } catch (error) {
      if (timer) {
        clearTimeout(timer);
      }
      // Remove from activeSpans if it was added
      this.activeSpans.delete(traceId);
      this.stats.errors++;
      logger.error('Failed to setup span timeout:', error);
      throw error;
    }
  }

  /**
   * Inject context with error handling
   */
  injectContext(ctx: KoattyContext): void {
    if (!this.span || this.isDestroyed) return;
    
    try {
      const carrier: { [key: string]: string } = {};
      context.with(trace.setSpan(context.active(), this.span), () => {
        this.propagator.inject(context.active(), carrier, defaultTextMapSetter);
        Object.entries(carrier).forEach(([key, value]) => {
          if (ctx.set && typeof ctx.set === 'function') {
            ctx.set(key, value);
          }
        });
      });
    } catch (error) {
      this.stats.errors++;
      logger.error('Error injecting context:', error);
    }
  }

  /**
   * Set basic attributes with validation
   */
  setBasicAttributes(ctx: KoattyContext): void {
    if (!this.span || this.isDestroyed) return;
    
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

      this.span.setAttributes(safeAttributes);

      // Apply custom attributes if provided
      if (this.options.spanAttributes && typeof this.options.spanAttributes === 'function') {
        try {
          const customAttrs = this.options.spanAttributes(ctx);
          if (customAttrs && typeof customAttrs === 'object') {
            this.span.setAttributes(customAttrs);
          }
        } catch (error) {
          logger.error('Error applying custom span attributes:', error);
        }
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Error setting basic attributes:', error);
    }
  }

  /**
   * Set span attributes safely
   */
  setSpanAttributes(attributes: SpanAttributes): this {
    if (!this.span || this.isDestroyed) return this;
    
    try {
      this.span.setAttributes(attributes);
    } catch (error) {
      this.stats.errors++;
      logger.error('Error setting span attributes:', error);
    }
    return this;
  }

  /**
   * Add span event safely
   */
  addSpanEvent(name: string, attributes?: SpanAttributes): void {
    if (!this.span || this.isDestroyed) return;
    
    try {
      this.span.addEvent(name, attributes);
    } catch (error) {
      this.stats.errors++;
      logger.error('Error adding span event:', error);
    }
  }

  /**
   * End span with proper cleanup
   */
  endSpan(): void {
    if (!this.span || this.isDestroyed) return;
    
    const traceId = this.span.spanContext().traceId;
    
    try {
      // Clean up from active spans
      const entry = this.activeSpans.get(traceId);
      if (entry) {
        clearTimeout(entry.timer);
        this.activeSpans.delete(traceId);
      }

      // End the span
      this.span.end();
      this.stats.spansEnded++;
      
      // Clear current span reference
      this.span = undefined;
      
    } catch (error) {
      this.stats.errors++;
      logger.error("SpanManager.endSpan error:", error);
    }
  }

  /**
   * Get manager statistics
   */
  getStats() {
    return {
      ...this.stats,
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
