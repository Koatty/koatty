/*
 * @Description: 配置数据
 * @Usage: 静态配置数据信息
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2025-03-15 17:22:27
 */
export default {
  /*app config*/
  logsLevel: "debug", // Level log is printed to the console, "debug" | "info" | "warning" | "error"

  server: { // server configuration
    hostname: '127.0.0.1', // server hostname
    port: 3000, // server port
    protocol: ["http", "grpc"], // Server protocol 'http' | 'https' | 'http2' |   'http3' | 'grpc' | 'ws' | 'wss' | 'graphql'
    // Note: GraphQL temporarily disabled due to router loading issue
    trace: false, // Full stack debug & trace, default: false
  },
};