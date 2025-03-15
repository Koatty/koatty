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
  app_port: 3000, // Listening port
  app_host: "", // Hostname
  protocol: "http", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss' | 'graphql'
  open_trace: false, // Full stack opentracing, default: false
  trace_id: "requestId",
  trace_header: "X-Request-Id",
  async_hooks: false, // Provides an API to track asynchronous resources, default: false
  timeout: 10, // request timeout time(seconds)
  key_file: "", // HTTPS certificate key
  crt_file: "", // HTTPS certificate crt
  encoding: "utf-8", // Character Encoding

  logs_level: "debug", // Level log is printed to the console, "debug" | "info" | "warning" | "error"
  // logs_path: "./logs", // Log file directory
  // sens_fields: ["password"] // Defined privacy fields will not be printed in logs.

};