/*
 * @Description: router config
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 22:38:08
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

export default {
  /**
   * prefix of the router
   */
  // prefix: string,
  
  /**
   * Methods which should be supported by the router.
   */
  // methods?: string[];
  // routerPath?: string;
  /**
   * Whether or not routing should be case-sensitive.
   */
  // sensitive?: boolean;
  /**
   * Whether or not routes should matched strictly.
   *
   * If strict matching is enabled, the trailing slash is taken into
   * account when matching routes.
   */
  // strict?: boolean;

  /**
   * payload options
   * 
   */
  // payload?: PayloadOptions;
  // payload: {
  //   extTypes: {
  //     json: ['application/json'],
  //     form: ['application/x-www-form-urlencoded'],
  //     text: ['text/plain'],
  //     multipart: ['multipart/form-data'],
  //     xml: ['text/xml'],
  //     grpc: ['application/grpc'],
  //     graphql: ['application/graphql+json'],
  //     websocket: ['application/websocket']
  //   },
  //   limit: '20mb',
  //   encoding: 'utf-8',
  //   multiples: true,
  //   keepExtensions: true,
  // },

  
  /**
   * protocol specific extension config
   * 
   * all protocol specific parameters are placed in this field:
   * - WebSocket: { maxFrameSize, heartbeatInterval, maxConnections, ... }
   * - gRPC: { protoFile, poolSize, batchSize, streamConfig, ... }
   * - GraphQL: { schemaFile, playground, introspection, ... }
   * - HTTP/HTTPS: reserved extension fields
   * 
   * @example
   * ```typescript
   * // WebSocket config
   * ext: {
   *   maxFrameSize: 1024 * 1024,
   *   heartbeatInterval: 15000,
   *   maxConnections: 1000
   * }
   * 
   * // gRPC config
   * ext: {
   *   protoFile: "./proto/service.proto",
   *   poolSize: 10,
   *   streamConfig: { maxConcurrentStreams: 50 }
   * }
   * 
   * // GraphQL config
   * ext: {
   *   schemaFile: "./schema/schema.graphql",
   *   playground: true
   * }
   * ```
   */
  // ext?: Record<string, any>;
};