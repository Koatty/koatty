/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-04-04 12:21:48
 * @LastEditTime: 2025-04-04 19:11:05
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { diag, DiagLogLevel, trace } from '@opentelemetry/api';
import { initPrometheusExporter } from './prometheus';
import { BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { Koatty } from 'koatty_core';
import { TraceOptions } from '../trace/itrace';
import { DefaultLogger as logger } from "koatty_logger";
import { Logger } from './logger';
import { RetryOTLPTraceExporter } from './exporter';
import { createResourceAttributes } from './resource';

// Global flag to track if logger has been set
let isLoggerSet = false;

/**
 * Initialize OpenTelemetry SDK with trace and metrics exporters
 * 
 * @param app - Koatty application instance
 * @param options - Configuration options for tracing
 * @returns NodeSDK instance configured with trace exporters and instrumentations
 * @throws Error if OTLP endpoint is not provided
 * 
 * @example
 * ```typescript
 * const sdk = initSDK(app, {
 *   opentelemetryConf: {
 *     endpoint: 'http://localhost:4318/v1/traces'
 *   }
 * });
 * ```
 */
export function initSDK(app: Koatty, options: TraceOptions) {
  const endpoint = options.opentelemetryConf?.endpoint ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    throw new Error('OTLP endpoint is required');
  }

  const traceExporter = new RetryOTLPTraceExporter({
    url: endpoint,
    headers: options.opentelemetryConf?.headers || {},
    timeoutMillis: options.opentelemetryConf?.timeout || 10000,
    maxRetries: 3,
    retryDelay: 1000
  });

  const batchOptions = {
    maxQueueSize: options.opentelemetryConf?.batchMaxQueueSize,
    maxExportBatchSize: options.opentelemetryConf?.batchMaxExportSize,
    scheduledDelayMillis: options.opentelemetryConf?.batchDelayMillis,
    exportTimeoutMillis: options.opentelemetryConf?.batchExportTimeout
  };

  // Configure logging - only set once
  if (!isLoggerSet) {
    const logLevel = logger.getLevel();
    const diagLogLevel = Object.values(DiagLogLevel).find(
      (level) => level.toString() === logLevel.toString()
    ) || DiagLogLevel.INFO;

    diag.setLogger(new Logger(), diagLogLevel as DiagLogLevel);
    isLoggerSet = true;
  }

  // Initialize Prometheus exporter
  const prometheusExporter = initPrometheusExporter(app, options);

  const sdkConfig: any = {
    resource: createResourceAttributes(app, options),
    traceExporter,
    spanProcessors: [new BatchSpanProcessor(traceExporter, batchOptions)],
    instrumentations: options.opentelemetryConf?.instrumentations || [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-grpc': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-koa': {
          enabled: true,
        }
      })
    ]
  };
  
  // Enable Prometheus exporter
  if (prometheusExporter) {
    sdkConfig.readers = [prometheusExporter];
  }

  return new NodeSDK(sdkConfig);
}

/**
 * Start and initialize OpenTelemetry SDK tracer
 * 
 * @param sdk - OpenTelemetry NodeSDK instance
 * @param app - Koatty application instance
 * @param options - Trace configuration options
 * 
 * @remarks
 * This function initializes the OpenTelemetry SDK and sets up shutdown handlers.
 * If initialization fails, it falls back to BasicTracerProvider.
 * 
 * @throws Error when SDK initialization fails
 */
export async function startTracer(sdk: NodeSDK, app: Koatty, options: TraceOptions) {
  const shutdownHandler = async () => {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      logger.error('Error shutting down OpenTelemetry SDK', error);
    } finally {
      app.off("appStop", shutdownHandler);
    }
  };

  try {
    await sdk.start();
    logger.info('OpenTelemetry SDK started successfully');
  } catch (err) {
    logger.error(`OpenTelemetry SDK initialization failed: ${err.message}`, {
      stack: err.stack,
      code: err.code,
      config: {
        endpoint: options.opentelemetryConf?.endpoint,
        serviceName: app.name
      }
    });
    trace.setGlobalTracerProvider(new BasicTracerProvider());
    return;
  } finally {
    app.on("appStop", shutdownHandler);
  }
}
