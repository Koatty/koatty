/**
 * @Description: server配置
 * @Usage: 项目统一使用koatty-server，这里配置server属性
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2025-03-12 17:40:08
 */

export default {
  hostname: process.env.IP || '127.0.0.1', // server hostname
  // server port: single value (e.g. 3000) or array (e.g. [3000, 3001])
  // For multi-protocol: if port is array, each port maps to corresponding protocol
  // If port is single value, first protocol uses it, others auto-increment (3000, 3001, 3002...)
  port: process.env.PORT || process.env.APP_PORT || 3000,
  // Server protocol: 'http' | 'https' | 'http2' | 'grpc' | 'ws' | 'wss' | 'graphql'
  // For multi-protocol: use array like ["http", "grpc"] and configure ext below
  protocol: ["http", "grpc"],
  trace: false, // Full stack debug & trace, default: false
  ssl: {
    mode: 'auto', // 'auto' | 'manual' | 'mutual_tls'
    key: '',  // key file path
    cert: '',  // crt file path
    ca: ''  // ca file path
  },
  // Protocol-specific configuration (required for grpc, ws, graphql)
  // ext: {
  //   grpc: { protoFile: "./proto/service.proto", poolSize: 10 },
  //   ws: { maxConnections: 1000, heartbeatInterval: 30000 },
  //   graphql: { schemaFile: "./schema.graphql", playground: true }
  // }
}