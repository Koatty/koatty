/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2019-09-24 11:06:12
 */
export default {
    app_port: 3000, // Listening port
    app_host: "127.0.0.1", // Hostname
    protocol: "http", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss'
    open_trace: false, // Full stack debug & trace, default: false
    http_timeout: 10, // HTTP request timeout time(seconds)
    encoding: "utf-8", // Character Encoding
    key_file: process.env.APP_PATH + "/config/ssl.key", // HTTPS certificate key
    crt_file: process.env.APP_PATH + "/config/ssl.crt", // HTTPS certificate crt

    // logs_level: "INFO", // Level log is printed to the console, "DEBUG" | "INFO" | "WARN" | "ERROR"
    // logs_console: false, // Whether to console logs
    // logs_write: false, // Whether to store logs
    // logs_write_level: "INFO", // Level log is printed to the file, "DEBUG" | "INFO" | "WARN" | "ERROR"
    logs_path: process.env.ROOT_PATH + "/logs", // Log file directory

    "test": {
        aa: '111111'
    },
};