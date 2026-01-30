/*
 * @Description: middleware config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:40:07
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

export default {
  // List of loaded middleware(except for the middleware loaded by default), 
  // executed in the order of elements
  list: [],
  // middleware configuration
  config: {
    // ============================================
    // Trace Middleware - 请求链路追踪中间件
    // ============================================
    // Koatty-Trace 用于追踪请求链路、记录日志、收集指标
    // 它会自动作为第一个中间件加载，无需添加到 list 中
    trace: {
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
        instrumentations: [],
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
  }
};
