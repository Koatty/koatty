/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { Koatty, KoattyRouter } from "koatty_core";
import { Helper } from "koatty_lib";
import { RouterFactory } from "./factory";
import { PayloadOptions } from "../payload/interface";
import { payload } from "../payload/payload";

/**
 * RouterOptions
 *
 * @export
 * @interface RouterOptions
 */
export interface RouterOptions {
  /** 路由前缀 */
  prefix: string;
  /**
   * Methods which should be supported by the router.
   */
  methods?: string[];
  routerPath?: string;
  /**
   * Whether or not routing should be case-sensitive.
   */
  sensitive?: boolean;
  /**
   * Whether or not routes should matched strictly.
   *
   * If strict matching is enabled, the trailing slash is taken into
   * account when matching routes.
   */
  strict?: boolean;
  /** server protocol */
  protocol?: string;

  /**
   * payload options
   */
  payload?: PayloadOptions;
  /**
   * 协议特定的扩展配置
   * 
   * 各协议的特定参数都放在此字段中：
   * - WebSocket: { maxFrameSize, heartbeatInterval, maxConnections, ... }
   * - gRPC: { protoFile, poolSize, batchSize, streamConfig, ... }
   * - GraphQL: { schemaFile, playground, introspection, ... }
   * - HTTP/HTTPS: 预留扩展字段
   * 
   * @example
   * ```typescript
   * // WebSocket 配置
   * ext: {
   *   maxFrameSize: 1024 * 1024,
   *   heartbeatInterval: 15000,
   *   maxConnections: 1000
   * }
   * 
   * // gRPC 配置
   * ext: {
   *   protoFile: "./proto/service.proto",
   *   poolSize: 10,
   *   streamConfig: { maxConcurrentStreams: 50 }
   * }
   * 
   * // GraphQL 配置
   * ext: {
   *   schemaFile: "./schema/schema.graphql",
   *   playground: true
   * }
   * ```
   */
  ext?: Record<string, any>;
}

/**
 * get instance of Router using Factory Pattern
 *
 * @export
 * @param {Koatty} app
 * @param {RouterOptions} options
 * @returns {*}  {KoattyRouter}
 */
export function NewRouter(app: Koatty, opt?: RouterOptions): KoattyRouter {
  const options: RouterOptions = { protocol: "http", prefix: "", ...opt };
  
  // Use RouterFactory to create router instance
  const factory = RouterFactory.getInstance();
  const router = factory.create(options.protocol!, app, options);

  Helper.define(router, "protocol", options.protocol);
  
  // inject payload middleware
  // IMPORTANT: Use app.once() to prevent duplicate middleware registration
  // in multi-protocol environments where each NewRouter() is called separately
  app.once("appReady", () => {
    app.use(payload(options.payload));
  });
  
  // Register cleanup handler on app stop event
  // The upper layer framework (Koatty) will emit 'stop' event when receiving SIGTERM/SIGINT
  // 
  // NOTE: In multi-protocol environments (e.g., HTTP + WS + gRPC + GraphQL),
  // each NewRouter() call will register this listener, causing shutdownAll() 
  // to be called multiple times. However, RouterFactory.shutdownAll() uses
  // flags (isShuttingDown/hasShutdown) to ensure it only executes once.
  app.once("appStop", async () => {
    await factory.shutdownAll();
  });
  
  return router;
}