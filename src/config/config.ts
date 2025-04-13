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
    port: process.env.PORT || process.env.APP_PORT || 3000, // server port
    protocol: "http", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss' | 'graphql'
    ext: { // ext configuration
      keyFile: "", // key file path
      crtFile: "", // crt file path
    }
  },
  trace: { // trace configuration
    /**
     * 自定义Span属性注入函数
     */
    // spanAttributes?: (ctx: KoattyContext) => Record<string, any>;
    /**
     * Trace状态指标上报函数
     */
    // metricsReporter?: (metrics: {
    //   duration: number;
    //   status: number;
    //   path: string;
    //   attributes: Record<string, any>;
    // }) => void;
    timeout: 10000, // response timeout in milliseconds
    requestIdHeaderName: 'X-Request-Id',
    requestIdName: "requestId",
    encoding: 'utf-8',
    enableTrace: false,
    enableTopology: false,
    asyncHooks: false,
    otlpEndpoint: "http://localhost:4318/v1/traces",
    otlpHeaders: {},
    otlpTimeout: 10000,
    spanTimeout: 30000,
    samplingRate: 1.0,
    batchMaxQueueSize: 2048,
    batchMaxExportSize: 512,
    batchDelayMillis: 5000,
    batchExportTimeout: 30000
  }
};