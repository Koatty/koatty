/*
 * @Description: app config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2025-03-15 17:18:20
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
export default {
  /*app config*/
  logsLevel: "debug", // Level log is printed to the console, "debug" | "info" | "warning" | "error"
  // logsPath: "./logs", // Log file directory
  // sensFields: ["password"] // Defined privacy fields will not be printed in logs.

  server: { // server configuration
    hostname: process.env.IP || '127.0.0.1', // server hostname
    // server port: single value (e.g. 3000) or array (e.g. [3000, 3001])
    // For multi-protocol: if port is array, each port maps to corresponding protocol
    // If port is single value, first protocol uses it, others auto-increment (3000, 3001, 3002...)
    port: process.env.PORT || process.env.APP_PORT || 3000,
    protocol: ["http","grpc"], // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss' | 'graphql'
    trace: false, // Full stack debug & trace, default: false
    ext: { // ext configuration
      keyFile: "", // key file path
      crtFile: "", // crt file path
    }
  },
  trace: { // trace configuration
    // response timeout in milliseconds
    timeout: 10000,
    // request id header name
    requestIdHeaderName: 'X-Request-Id',
    // request id name
    requestIdName: "requestId",
    // id generator function
    // idFactory: Function,
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
  }
};