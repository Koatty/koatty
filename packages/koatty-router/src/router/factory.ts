/*
 * @Description: Router Factory Pattern Implementation
 * @Usage: Factory for creating different protocol routers
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { Koatty, KoattyRouter } from "koatty_core";
import { DefaultLogger as Logger } from "koatty_logger";
import { GraphQLRouter } from "./graphql";
import { GrpcRouter } from "./grpc";
import { HttpRouter } from "./http";
import { RouterOptions } from "./router";
import { WebsocketRouter } from "./ws";

/**
 * Router factory interface
 */
export interface IRouterFactory {
  create(protocol: string, app: Koatty, options: RouterOptions): KoattyRouter;
  register(protocol: string, routerClass: RouterConstructor): void;
  getSupportedProtocols(): string[];
}

/**
 * Router constructor type
 */
export type RouterConstructor = new (app: Koatty, options?: RouterOptions) => KoattyRouter;

/**
 * Router factory implementation
 */
export class RouterFactory implements IRouterFactory {
  private static instance: RouterFactory;
  private routerRegistry = new Map<string, RouterConstructor>();
  private activeRouters: KoattyRouter[] = [];
  private isShuttingDown: boolean = false;
  private hasShutdown: boolean = false;

  private constructor() {
    this.initializeDefaultRouters();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RouterFactory {
    if (!RouterFactory.instance) {
      RouterFactory.instance = new RouterFactory();
    }
    return RouterFactory.instance;
  }

  /**
   * Initialize default routers
   */
  private initializeDefaultRouters(): void {
    this.routerRegistry.set('http', HttpRouter);
    this.routerRegistry.set('https', HttpRouter);
    this.routerRegistry.set('http2', HttpRouter);
    this.routerRegistry.set('http3', HttpRouter);
    this.routerRegistry.set('ws', WebsocketRouter);
    this.routerRegistry.set('wss', WebsocketRouter);
    this.routerRegistry.set('grpc', GrpcRouter);
    this.routerRegistry.set('graphql', GraphQLRouter);
  }

  /**
   * Create router instance
   */
  public create(protocol: string, app: Koatty, options: RouterOptions): KoattyRouter {
    const normalizedProtocol = protocol.toLowerCase();
    const RouterClass = this.routerRegistry.get(normalizedProtocol);
    
    if (!RouterClass) {
      const supportedProtocols = Array.from(this.routerRegistry.keys()).join(', ');
      throw new Error(
        `Unsupported protocol: ${protocol}. Supported protocols: ${supportedProtocols}`
      );
    }

    try {
      const router = new RouterClass(app, options);
      this.activeRouters.push(router); // Track router instance
      Logger.Debug(`Created ${protocol.toUpperCase()} router successfully`);
      return router;
    } catch (error) {
      Logger.Error(`Failed to create ${protocol.toUpperCase()} router:`, error);
      throw error;
    }
  }

  /**
   * Register custom router
   */
  public register(protocol: string, routerClass: RouterConstructor): void {
    if (!protocol || typeof protocol !== 'string') {
      throw new Error('Protocol must be a non-empty string');
    }

    if (!routerClass || typeof routerClass !== 'function') {
      throw new Error('Router class must be a constructor function');
    }

    const normalizedProtocol = protocol.toLowerCase();
    
    if (this.routerRegistry.has(normalizedProtocol)) {
      Logger.Warn(`Overriding existing router for protocol: ${protocol}`);
    }

    this.routerRegistry.set(normalizedProtocol, routerClass);
    Logger.Debug(`Registered custom router for protocol: ${protocol}`);
  }

  /**
   * Unregister router
   */
  public unregister(protocol: string): boolean {
    const normalizedProtocol = protocol.toLowerCase();
    const result = this.routerRegistry.delete(normalizedProtocol);
    
    if (result) {
      Logger.Debug(`Unregistered router for protocol: ${protocol}`);
    } else {
      Logger.Warn(`No router found for protocol: ${protocol}`);
    }
    
    return result;
  }

  /**
   * Get supported protocols
   */
  public getSupportedProtocols(): string[] {
    return Array.from(this.routerRegistry.keys());
  }

  /**
   * Check if protocol is supported
   */
  public isSupported(protocol: string): boolean {
    return this.routerRegistry.has(protocol.toLowerCase());
  }

  /**
   * Get router class for protocol
   */
  public getRouterClass(protocol: string): RouterConstructor | undefined {
    return this.routerRegistry.get(protocol.toLowerCase());
  }

  /**
   * Clear all registered routers (for testing)
   */
  public clear(): void {
    this.routerRegistry.clear();
    Logger.Debug('Cleared all registered routers');
  }

  /**
   * Reset to default routers
   */
  public reset(): void {
    this.clear();
    this.initializeDefaultRouters();
    Logger.Debug('Reset to default routers');
  }

  /**
   * Shutdown all active routers (for graceful shutdown)
   * This method should be called when the application receives termination signal
   * 
   * IMPORTANT: This method uses flags to ensure it only runs once even if called
   * multiple times in multi-protocol environments where each NewRouter() call
   * registers an appStop listener.
   */
  public async shutdownAll(): Promise<void> {
    // Prevent concurrent shutdown attempts
    if (this.isShuttingDown) {
      Logger.Debug('Shutdown already in progress, skipping duplicate call');
      return;
    }
    
    // Prevent multiple shutdown attempts
    if (this.hasShutdown) {
      Logger.Debug('Shutdown already completed, skipping duplicate call');
      return;
    }
    
    this.isShuttingDown = true;
    
    try {
      const routerCount = this.activeRouters.length;
      if (routerCount === 0) {
        Logger.Debug('No active routers to shutdown');
        this.hasShutdown = true;
        return;
      }

      Logger.Info(`Starting graceful shutdown for ${routerCount} router(s)...`);
      
      const shutdownPromises = this.activeRouters.map(async (router) => {
        const routerAny = router as any;
        const protocol = routerAny.protocol || 'unknown';
        try {
          if (typeof routerAny.cleanup === 'function') {
            await routerAny.cleanup();
            Logger.Debug(`Router ${protocol} shutdown completed`);
          }
        } catch (error) {
          Logger.Error(`Error shutting down ${protocol} router:`, error);
        }
      });

      await Promise.all(shutdownPromises);
      this.activeRouters = [];
      this.hasShutdown = true;
      Logger.Info('All routers shutdown completed');
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Get count of active routers
   */
  public getActiveRouterCount(): number {
    return this.activeRouters.length;
  }

  /**
   * Get active routers list
   */
  public getActiveRouters(): KoattyRouter[] {
    return [...this.activeRouters];
  }
}

/**
 * Router factory builder for advanced configuration
 */
export class RouterFactoryBuilder {
  private customRouters = new Map<string, RouterConstructor>();
  private excludeDefaults: string[] = [];

  /**
   * Add custom router
   */
  public addRouter(protocol: string, routerClass: RouterConstructor): this {
    this.customRouters.set(protocol.toLowerCase(), routerClass);
    return this;
  }

  /**
   * Exclude default router
   */
  public excludeDefault(protocol: string): this {
    this.excludeDefaults.push(protocol.toLowerCase());
    return this;
  }

  /**
   * Build factory with custom configuration
   */
  public build(): IRouterFactory {
    const factory = RouterFactory.getInstance();
    
    // Remove excluded defaults
    for (const protocol of this.excludeDefaults) {
      factory.unregister(protocol);
    }
    
    // Add custom routers
    for (const [protocol, routerClass] of this.customRouters) {
      factory.register(protocol, routerClass);
    }
    
    return factory;
  }
}

/**
 * Decorator for auto-registering custom routers
 */
export function RegisterRouter(protocol: string) {
  return function <T extends RouterConstructor>(target: T): T {
    const factory = RouterFactory.getInstance();
    factory.register(protocol, target);
    return target;
  };
} 