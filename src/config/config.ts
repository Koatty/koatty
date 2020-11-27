/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-01-19 15:41:30
 */
export default {
    /*app config*/
    app_port: 3000, // 监听端口
    app_hostname: "", // Hostname
    serve_mod: "http", // 服务模式 'http' | 'http2' | 'websocket' | 'rpc'
    open_trace: false, // full stack debug & trace, default: false
    // https certificate
    key_file: "",
    crt_file: "",
    encoding: "utf-8", //输出数据的编码

    logs_write: true, //是否存储日志
    logs_path: process.env.ROOT_PATH + "/logs", //存储日志文件目录
    logs_level: "WARN" //日志存储级别, "DEBUG" | "INFO" | "WARN" | "ERROR"

};