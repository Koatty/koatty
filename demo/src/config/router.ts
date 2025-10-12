/*
 * @Description: 路由配置
 * @Usage: 项目统一使用koa-router，这里配置路由属性
 * @Author: xxx
 * @Date: 2020-12-22 15:24:25
 * @LastEditTime: 2025-10-07 22:27:00
 */

import * as path from 'path';

export default {
  // Used koa-router

  // prefix: string;
  // /**
  //  * Methods which should be supported by the router.
  //  */
  // methods ?: string[];
  // routerPath ?: string;
  // /**
  //  * Whether or not routing should be case-sensitive.
  //  */
  // sensitive ?: boolean;
  // /**
  //  * Whether or not routes should matched strictly.
  //  *
  //  * If strict matching is enabled, the trailing slash is taken into
  //  * account when matching routes.
  //  */
  // strict ?: boolean;

  /**
   * Protocol-specific extension configuration
   * For multi-protocol support, use protocol name as key to configure each protocol separately
   * 
   * **Important: GraphQL Protocol and Transport**
   * - GraphQL runs over HTTP/HTTP2 (not a separate transport protocol)
   * - When protocol is 'graphql', koatty automatically:
   *   • Uses HTTP as transport by default
   *   • Uses HTTP/2 when SSL certificates are configured (recommended for production)
   * 
   * **HTTP/2 Benefits for GraphQL**:
   * - Multiplexing: Multiple queries over single connection
   * - Header compression: Reduced bandwidth for large queries
   * - Server push: Prefetch related resources
   * - HTTP/1.1 fallback: Automatic downgrade for compatibility
   */
  ext: {
    // HTTP protocol config (optional, for future extensions)
    http: {},
    
    // gRPC protocol config
    grpc: {
      protoFile: path.resolve(__dirname, "../resource/proto/hello.proto"), // gRPC proto file
    },
    
    // GraphQL protocol config
    // GraphQL uses HTTP/HTTP2 as transport layer
    graphql: {
      schemaFile: path.resolve(__dirname, "../resource/graphql/User.graphql"), // GraphQL schema file
      
      // Optional: Enable HTTP/2 with SSL for GraphQL (recommended for production)
      // Uncomment the following lines to serve GraphQL over HTTP/2:
      // keyFile: path.resolve(__dirname, "../ssl/server.key"),
      // crtFile: path.resolve(__dirname, "../ssl/server.crt"),
      
      // Optional: HTTP/2 and SSL advanced configuration
      // ssl: {
      //   mode: 'auto',           // SSL mode: 'auto' | 'manual' | 'mutual_tls'
      //   allowHTTP1: true,       // Allow HTTP/1.1 fallback
      // },
      // http2: {
      //   maxConcurrentStreams: 100,     // Max concurrent streams
      //   maxSessionMemory: 10,          // Max session memory (MB)
      //   settings: {
      //     enablePush: false,           // Disable server push
      //     initialWindowSize: 65535,    // Initial window size
      //   }
      // }
    },
    
    // WebSocket protocol config (optional)
    // ws: {
    //   maxFrameSize: 1024 * 1024,
    //   heartbeatInterval: 15000,
    //   maxConnections: 1000
    // }
  }
};