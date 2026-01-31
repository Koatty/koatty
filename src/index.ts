/*
 * @Description: Koatty framework main entry
 * @Usage: import { Koatty, Controller, Service, ... } from 'koatty';
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2026-01-30 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

// ============================================================
// Core Exports
// ============================================================

export { Config } from "koatty_config";

// Export IOC container capabilities (dependency injection, AOP, etc.)
// Note: Component decorator is now provided by koatty_core for better layering
export * from "koatty_container";

// Export framework core capabilities (Component, Controller, Service, Middleware, etc.)
// This also exports ComponentManager for unified component management
export * from "koatty_core";

export * from "koatty_exception";
export { Helper } from "koatty_lib";

// ============================================================
// Component Exports (Self-registering)
// 
// Design Philosophy:
// - Components register themselves via @Component decorator
// - Import triggers IOC registration automatically (side-effect import)
// - ComponentManager discovers and manages all components uniformly
// - No hardcoded component list in framework
// ============================================================

// Router component: HTTP/gRPC/WebSocket routing
export * from "koatty_router";

// Serve component: HTTP/HTTPS/HTTP2/gRPC/WebSocket server
export * from "koatty_serve";

// ============================================================
// Bootstrap & Utilities
// ============================================================

export * from "./core/Bootstrap";
export { Logger } from "./util/Logger";


