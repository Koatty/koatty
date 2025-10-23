/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-04-04 12:21:48
 * @LastEditTime: 2025-04-06 12:59:31
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { IOCContainer } from "koatty_container";
import { AppEvent, Koatty, KoattyContext, KoattyNext } from "koatty_core";
import { Helper } from "koatty_lib";
import { SpanManager } from '../opentelemetry/spanManager';
import { performance } from 'node:perf_hooks';
import { HandlerFactory } from '../handler/factory';
import { ProtocolType } from '../handler/base';
import { asyncLocalStorage, createAsyncResource, wrapEmitter } from './wrap';
import { extensionOptions, TraceOptions } from "./itrace";
import { initSDK, startTracer } from "../opentelemetry/sdk";
import { TopologyAnalyzer } from "../opentelemetry/topology";
import { getRequestId, getTraceId } from '../utils/utils';
import { collectRequestMetrics } from '../opentelemetry/prometheus';
import { DefaultLogger as Logger } from "koatty_logger";

/** 
 * defaultOptions
 */
const defaultOptions = {
  // response timeout in milliseconds
  timeout: 10000,
  // request id header name
  requestIdHeaderName: 'X-Request-Id',
  // request id name
  requestIdName: "requestId",
  // id factory function
  idFactory: getTraceId,
  // encoding
  encoding: 'utf-8',
  // Whether to enable trace (default: false)
  enableTrace: false,
  // asynchooks enabled
  asyncHooks: false,
  /**
   * Metrics configuration
   */
  metricsConf: {
    /**
     * Metrics reporter function
     */
    // reporter: (metrics: {
    //   duration: number,
    //   status: number,
    //   path: string,
    //   attributes: Record<string, any>,
    // }) => void,
    /**
     * Default attributes for metrics
     */
    defaultAttributes: {},
    /**
     * Prometheus metrics endpoint (production only)
     */
    metricsEndpoint: '/metrics',
    /**
     * Metrics report interval in milliseconds (default: 5000)
     */
    reportInterval: 5000,
    /**
     * Prometheus metrics port (default: 9464)
     */
    metricsPort: 9464,
  },

  /**
   * OpenTelemetry configuration
   */
  opentelemetryConf: {
    /**
     * OTLP endpoint URL
     */
    endpoint: "http://localhost:4318/v1/traces",
    /**
     * Whether to enable topology analysis (default: same as enableTrace)
     * 
     */
    enableTopology: false,
    /**
     * OTLP headers
     */
    headers: {},
    /**
     * Resource attributes
     */
    resourceAttributes: {},
    /**
     * Instrumentations to enable
     */
    instrumentations: [] as any,
    /**
     * Exporter timeout in milliseconds
     */
    timeout: 10000,
    /**
     * Maximum lifetime for a span in milliseconds
     */
    spanTimeout: 30000,
    /**
     * Maximum number of active spans in memory (default: 1000)
     */
    maxActiveSpans: 1000,
    /**
     * Request attributes to be added to the span
     */
    // spanAttributes: (ctx: KoattyContext) => Record<string, any>,

    /**
     * Sampling rate (0.0 - 1.0)
     */
    samplingRate: 1.0,
    /**
     * Maximum number of spans in batch queue
     */
    batchMaxQueueSize: 2048,
    /**
     * Maximum number of spans to export in one batch
     */
    batchMaxExportSize: 512,
    /**
     * Delay between batch exports in milliseconds
     */
    batchDelayMillis: 5000,
    /**
     * Timeout for batch export in milliseconds
     */
    batchExportTimeout: 30000,
  },
  /**
   * Retry configuration
   */
  retryConf: {
    /**
     * Whether to enable retry mechanism (default: false)
     */
    enabled: false,
    /**
     * Max retry count when error occurs (default: 3)
     */
    count: 3,
    /**
     * Retry interval in milliseconds (default: 1000)
     */
    interval: 1000,
    /**
     * Custom function to determine if error should be retried
     */
    // conditions: (error: any) => boolean,
  },
};

/**
 * Trace middleware for Koatty framework that provides request tracing, topology analysis,
 * and request lifecycle management capabilities.
 * 
 * @param {TraceOptions} options - Configuration options for the trace middleware
 * @param {Koatty} app - Koatty application instance
 * @returns {Function} Middleware function that handles request tracing and lifecycle
 * 
 * Features:
 * - Request tracing with OpenTelemetry
 * - Request ID generation and propagation
 * - Service topology analysis
 * - Request lifecycle management
 * - Server shutdown handling
 * - Async hooks support for request context
 * 
 * @export
 */
export function Trace(options: TraceOptions, app: Koatty) {
  options = { ...defaultOptions, ...options };
  const geh: any = IOCContainer.getClass("ExceptionHandler", "COMPONENT");

  let spanManager: SpanManager | undefined;
  let tracer: any;

  if (options.enableTrace) {
    spanManager = app.getMetaData("spanManager")[0] || new SpanManager(options);
    tracer = app.getMetaData("tracer")[0] || initSDK(app, options);
    app.once(AppEvent.appStart, async () => {
      await startTracer(tracer, app, options);
    });
  }

  return async (ctx: KoattyContext, next: KoattyNext) => {
    Helper.define(ctx, 'startTime', Date.now());

    // Handle server shutdown case
    if ((app.server as any)?.status === 503) {
      ctx.status = 503;
      ctx.set('Connection', 'close');
      ctx.body = 'Server is in the process of shutting down';
      return;
    }

    // Generate or get request ID
    const requestId = getRequestId(ctx, options);
    Helper.define(ctx, 'requestId', requestId);

    // Create span if tracing is enabled
    if (options.enableTrace && tracer) {
      const serviceName = app.name || "unknownKoattyProject";
      spanManager.createSpan(tracer, ctx, serviceName);
      app.once(AppEvent.appStop, () => {
        spanManager?.endSpan();
      })
    }

    // Record topology if enabled
    if (options.opentelemetryConf?.enableTopology ?? options.enableTrace) {
      const topology = TopologyAnalyzer.getInstance();
      const serviceName = Array.isArray(ctx.headers['service'])
        ? ctx.headers['service'][0]
        : ctx.headers['service'] || 'unknown';
      topology.recordServiceDependency(app.name, serviceName);
    }

    const ext = {
      debug: app.appDebug,
      timeout: options.timeout,
      encoding: options.encoding,
      requestId,
      terminated: false,
      spanManager,
      globalErrorHandler: geh,
    };

    // Handle async hooks if enabled
    if (options.asyncHooks && (ctx.req || ctx.res)) {
      const asyncResource = createAsyncResource();
      return asyncLocalStorage.run(requestId, () => {
        if (ctx.req) wrapEmitter(ctx.req, asyncResource);
        if (ctx.res) wrapEmitter(ctx.res, asyncResource);
        return handleRequest(ctx, next, options, ext);
      });
    }

    return handleRequest(ctx, next, options, ext);
  };
}

/**
 * Handle HTTP request with tracing and metrics reporting
 * 
 * @param ctx - Koatty context object
 * @param next - Next middleware function
 * @param options - Trace configuration options
 * @param ext - Extension options containing span information
 * @returns Promise with the request handling result
 * 
 * @description
 * Wraps request handling with tracing functionality:
 * - Measures request duration
 * - Reports metrics if configured
 * - Manages span lifecycle
 * - Handles request response
 */
async function handleRequest(
  ctx: KoattyContext,
  next: KoattyNext,
  options: TraceOptions,
  ext: extensionOptions
) {
  const startTime = performance.now();
  let result;
  const retryConf = options.retryConf || { enabled: false };

  try {
    if (retryConf.enabled) {
      const maxRetries = retryConf.count || 3;
      const interval = retryConf.interval || 1000;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          result = await respWarper(ctx, next, options, ext);
          break;
        } catch (error) {
          // Check if error should be retried
          const shouldRetry = retryConf.conditions
            ? retryConf.conditions(error)
            : true;

          if (!shouldRetry || attempt === maxRetries) {
            throw error;
          }

          // Wait before next retry
          if (interval > 0) {
            await new Promise(resolve => setTimeout(resolve, interval));
          }
        }
      }
    } else {
      result = await respWarper(ctx, next, options, ext);
    }
  } finally {
    // Calculate request duration
    const duration = performance.now() - startTime;
    
    // Collect request metrics using the new metrics collector
    collectRequestMetrics(ctx, duration);
    
    // Legacy metrics reporter support (for backward compatibility)
    const metricsConf = options.metricsConf || {};
    if (metricsConf.reporter) {
      try {
        metricsConf.reporter({
          duration,
          status: ctx.status || 200,
          path: ctx.path,
          attributes: {
            ...(metricsConf.defaultAttributes || {}),
            requestId: ctx.requestId,
            method: ctx.method,
            protocol: ctx.protocol
          }
        });
      } catch (error) {
        // Don't let metrics reporting errors affect the request
        Logger.warn('Metrics reporter error:', error);
      }
    }
  }

  return result;
}

/**
 * Wraps the response handling process with trace functionality.
 * 
 * @param ctx - Koatty context object
 * @param next - Next middleware function
 * @param options - Trace configuration options
 * @param ext - Extension options for tracing
 * @returns Promise that resolves after handling the request
 * @throws Rethrows any errors that occur during handling
 */
async function respWarper(
  ctx: KoattyContext,
  next: KoattyNext,
  options: TraceOptions,
  ext: extensionOptions
) {
  if (options.requestIdName && ctx.setMetaData) {
    ctx.setMetaData(options.requestIdName, ctx.requestId);
  }

  const protocol = (ctx?.protocol || "http").toLowerCase();
  if (protocol === "grpc" || protocol === "ws" || protocol === "wss") {
    ctx.respond = false;
  }

  if (options.requestIdHeaderName) {
    ctx.set(options.requestIdHeaderName, ctx.requestId);
  }

  if (ctx.rpc?.call?.metadata && options.requestIdName) {
    ctx.rpc.call.metadata.set(options.requestIdName, ctx.requestId);
  }

  const handler = HandlerFactory.getHandler(protocol as ProtocolType);
  return handler.handle(ctx, next, ext);
}
