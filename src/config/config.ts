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

    logs_write: true, // Whether to store logs
    logs_path: process.env.ROOT_PATH + "/logs", // Log file directory
    logs_level: "WARN" // Log storage level, "DEBUG" | "INFO" | "WARN" | "ERROR"

};