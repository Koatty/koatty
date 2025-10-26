/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-01-14
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import EventEmitter from "events";
import { KoattyApplication, KoattyServer } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import { TerminusManager } from "./terminus-manager";

export interface TerminusOptions {
  timeout: number;
  signals?: string[];
  onSignal?: (event: string, app: KoattyApplication, server: KoattyServer, forceTimeout: number) => Promise<any>;
}

// 存储信号处理器以便清理
const signalHandlers = new Map<string, (() => void)[]>();

// 增加进程监听器限制以避免测试时的警告
process.setMaxListeners(0); // 0 表示无限制

/**
 * Create terminus event
 * 
 * Now uses TerminusManager singleton to prevent duplicate signal handler registration
 * when multiple server instances are created.
 *
 * @export
 * @param {KoattyApplication} app
 * @param {(Server | Http2SecureServer)} server
 * @param {TerminusOptions} [options]
 */
export function CreateTerminus(app: KoattyApplication, server: KoattyServer, _options?: TerminusOptions): void {
  // Generate unique server ID
  const serverId = (server as any).serverId || `server_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // Register server with TerminusManager singleton
  TerminusManager.getInstance().registerServer(app, server, serverId);
}
// processEvent
type processEvent = "beforeExit" | "exit" | NodeJS.Signals;
/**
 * Bind event to the process
 *
 * @param {EventEmitter} event
 * @param {string} originEventName
 * @param {string} [targetEventName]
 */
export function BindProcessEvent(event: EventEmitter, originEventName: string, targetEventName: processEvent = "beforeExit") {
  event.listeners(originEventName).forEach(func => {
    if (Helper.isFunction(func)) {
      process.addListener(<any>targetEventName, func);
    }
  });
  event.removeAllListeners(originEventName);
}

/**
 * Execute event as async
 *
 * @param {Koatty} event
 * @param {string} eventName
 */
const asyncEvent = async (event: EventEmitter, eventName: string) => {
  for (const func of event.listeners(eventName)) {
    if (Helper.isFunction(func)) {
      await func();
    }
  }
  return event.removeAllListeners(eventName);
};

/**
 * cleanup function, returning a promise (used to be onSigterm)
 *
 * @returns {*}  
 */
export async function onSignal(event: string, app: KoattyApplication, server: KoattyServer, forceTimeout: number) {
  Logger.Warn(`Received kill signal (${event}), shutting down...`);
  // Set status to service unavailable (if server has status property)
  (server as any).status = 503;
  
  // 清理所有 terminus 事件监听器
  for (const [signalName, handlers] of signalHandlers) {
    handlers.forEach(handler => {
      process.removeListener(signalName, handler);
    });
  }
  signalHandlers.clear();
  
  // 触发 appStop 事件，确保应用层清理逻辑执行
  await asyncEvent(app, 'appStop');
  await asyncEvent(process, 'beforeExit');

  // 设置强制关闭超时
  const forceShutdown = setTimeout(() => {
    Logger.Fatal('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, forceTimeout);

  try {
    // 调用服务器的销毁方法（内部会执行 gracefulShutdown）
    if (typeof (server as any).destroy === 'function') {
      Logger.Info('Starting server destroy (graceful shutdown)');
      await (server as any).destroy();
      Logger.Info('Server destroy completed');
    } 
    // 降级到 Stop 方法（向后兼容）
    else if (typeof server.Stop === 'function') {
      Logger.Info('Starting graceful shutdown with Stop method');
      await new Promise<void>((resolve, reject) => {
        server.Stop((err?: Error) => {
          if (err) {
            Logger.Error('Server Stop failed', err);
            reject(err);
          } else {
            Logger.Info('Server Stop completed');
            resolve();
          }
        });
      });
    } else {
      Logger.Warn('Server has no destroy or Stop method');
    }

    clearTimeout(forceShutdown);
    Logger.Fatal('Closed out remaining connections, exiting gracefully');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdown);
    Logger.Fatal('Server destroy error, forcing exit', error);
    process.exit(1);
  }
}

// 导出 TerminusManager 供测试使用
export { TerminusManager } from "./terminus-manager";
