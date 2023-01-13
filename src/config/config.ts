/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-01-19 15:41:30
 */
export default {
  /*app config*/
  app_port: 3000, // Listening port
  app_host: "", // Hostname
  protocol: "http", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss'
  open_trace: false, // Full stack debug & trace, default: false
  http_timeout: 10, // HTTP request timeout time(seconds)
  key_file: "", // HTTPS certificate key
  crt_file: "", // HTTPS certificate crt
  encoding: "utf-8", // Character Encoding

  logs_level: "debug", // Level log is printed to the console, "debug" | "info" | "warning" | "error"
  // logs_path: "./logs", // Log file directory
  // sens_fields: ["password"] // Sensitive words

};