/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2019-09-24 11:06:12
 */
export default {
    "test": {
        aa: '111111'
    },
    protocol: "ws", // Server protocol 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss'
    open_trace: true, // Full stack debug & trace, default: false
    http_timeout: 10, // HTTP request timeout time(seconds)
    encoding: "utf-8", // Character Encoding
    key_file: process.env.APP_PATH + "/config/ssl.key", // HTTPS certificate key
    crt_file: process.env.APP_PATH + "/config/ssl.crt", // HTTPS certificate crt

    // logs_level: "DEBUG", // Level log is printed to the console, "DEBUG" | "INFO" | "WARN" | "ERROR"
    logs_console: true, // Whether to console logs
    logs_write: false, // Whether to store logs
    logs_write_level: "WARN", // Level log is printed to the file, "DEBUG" | "INFO" | "WARN" | "ERROR"
    logs_path: process.env.ROOT_PATH + "/logs", // Log file directory
};