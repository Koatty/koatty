/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-01-19 15:41:30
 */
export default {
    /*app config*/
    app_port: 3000, // Listening port
    app_hostname: "", // Hostname
    serve_mod: "http", // Serve mode 'http' | 'http2' | 'websocket' | 'rpc'
    open_trace: false, // Full stack debug & trace, default: false
    http_timeout: 10, // HTTP request timeout time(seconds)
    key_file: "", // HTTPS certificate key
    crt_file: "", // HTTPS certificate crt
    encoding: "utf-8", // Character Encoding

    // logs_level: "DEBUG", // Level log is printed to the console, "DEBUG" | "INFO" | "WARN" | "ERROR"
    logs_console: true, // Whether to console logs
    logs_write: false, // Whether to store logs
    logs_write_level: "WARN", // Level log is printed to the file, "DEBUG" | "INFO" | "WARN" | "ERROR"
    logs_path: process.env.ROOT_PATH + "/logs", // Log file directory

};