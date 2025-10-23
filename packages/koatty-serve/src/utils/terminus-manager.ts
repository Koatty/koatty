/*
 * @Description: Singleton Terminus Manager for multi-server coordination
 * @Usage: Manages graceful shutdown across multiple server instances
 * @Author: richen
 * @Date: 2025-01-14
 * @LastEditTime: 2025-01-14
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import EventEmitter from "events";
import { KoattyApplication, KoattyServer } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";

// async event listener
const asyncEvent = async (event: EventEmitter, eventName: string) => {
  for (const func of event.listeners(eventName)) {
    if (Helper.isFunction(func)) {
      await func();
    }
  }
  return event.removeAllListeners(eventName);
};

/**
 * Singleton Terminus Manager
 * 
 * Ensures that signal handlers (SIGTERM, SIGINT, etc.) are only registered once,
 * even when multiple server instances are created. Coordinates graceful shutdown
 * across all registered servers.
 */
export class TerminusManager {
  private static instance: TerminusManager | null = null;
  private servers: Map<string, KoattyServer> = new Map();
  private isShuttingDown = false;
  private app: KoattyApplication | null = null;
  private signalsRegistered = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TerminusManager {
    if (!TerminusManager.instance) {
      TerminusManager.instance = new TerminusManager();
    }
    return TerminusManager.instance;
  }

  /**
   * Register a server instance
   * 
   * @param app - Koatty application instance
   * @param server - Server instance to register
   * @param serverId - Unique identifier for the server
   */
  registerServer(app: KoattyApplication, server: KoattyServer, serverId: string): void {
    this.app = app;
    this.servers.set(serverId, server);
    
    Logger.Info(`Server registered in TerminusManager: ${serverId}`);
    
    // 只在第一次注册时设置信号处理器
    if (!this.signalsRegistered) {
      this.setupSignalHandlers();
      this.signalsRegistered = true;
    }
  }

  /**
   * Setup signal handlers (only once)
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.shutdownAll(signal).catch(err => {
          Logger.Error('Error during shutdown', err);
          process.exit(1);
        });
      });
    });

    Logger.Info('Global signal handlers registered');
  }

  /**
   * Shutdown all registered servers
   * 
   * @param signal - Signal that triggered the shutdown
   */
  private async shutdownAll(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      Logger.Warn('Shutdown already in progress, ignoring signal');
      return;
    }
    
    this.isShuttingDown = true;
    Logger.Warn(`Received kill signal (${signal}), shutting down all servers...`);

    // 设置全局超时
    const forceTimeout = setTimeout(() => {
      Logger.Error('Could not close all servers in time, forcefully shutting down');
      process.exit(1);
    }, 60000);

    try {
      // 触发应用层清理（只触发一次）
      if (this.app) {
        Logger.Info('Triggering application stop events');
        await asyncEvent(this.app, 'appStop');
        await asyncEvent(process, 'beforeExit');
      }

      // 并发关闭所有服务器
      const shutdownPromises = Array.from(this.servers.entries()).map(
        async ([serverId, server]) => {
          try {
            Logger.Info(`Shutting down server: ${serverId}`);
            
            // 优先使用 destroy 方法
            if (typeof (server as any).destroy === 'function') {
              await (server as any).destroy();
            } 
            // 降级到 Stop 方法
            else if (typeof server.Stop === 'function') {
              await new Promise<void>((resolve, reject) => {
                server.Stop((err?: Error) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            }
            
            Logger.Info(`Server shutdown completed: ${serverId}`);
          } catch (error) {
            Logger.Error(`Error shutting down server ${serverId}`, error);
            // 不抛出错误，继续关闭其他服务器
          }
        }
      );

      await Promise.all(shutdownPromises);
      
      clearTimeout(forceTimeout);
      Logger.Warn('All servers closed gracefully');
      process.exit(0);
      
    } catch (error) {
      clearTimeout(forceTimeout);
      Logger.Error('Error during shutdown', error);
      process.exit(1);
    }
  }

  /**
   * Reset instance (for testing purposes)
   */
  static resetInstance(): void {
    if (TerminusManager.instance) {
      TerminusManager.instance.servers.clear();
      TerminusManager.instance.isShuttingDown = false;
      TerminusManager.instance.signalsRegistered = false;
      TerminusManager.instance = null;
    }
  }

  /**
   * Get number of registered servers (for testing)
   */
  getServerCount(): number {
    return this.servers.size;
  }
}

