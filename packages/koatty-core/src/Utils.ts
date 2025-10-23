/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2024-11-06 23:01:21
 * @LastEditTime: 2024-11-10 23:04:57
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import EventEmitter from "events";
import { Helper } from "koatty_lib";
import { KoattyContext, KoattyNext } from "./IContext";


/**
 * Convert express middleware for koa
 *
 * @param {function} fn
 * @returns
 * @memberof Koatty
 */
export function parseExp(fn: Function) {
  return function (ctx: KoattyContext, next: Function) {
    if (fn.length < 3) {
      fn(ctx.req, ctx.res);
      return next();
    }
    return new Promise((resolve, reject) => {
      fn(ctx.req, ctx.res, (err: Error) => {
        if (err) return reject(err);
        resolve(next());
      });
    });
  };
}
/**
 * Execute event as async
 * 
 * @param {EventEmitter} event
 * @param {string} eventName
 * @return {*}
 */
export async function asyncEvent(event: EventEmitter, eventName: string): Promise<void> {
  const listeners = event.listeners(eventName);
  for (const func of listeners) {
    if (Helper.isFunction(func)) await func();
  }
  event.removeAllListeners(eventName);
}

/**
 * Check is prevent error
 *
 * @param {Error} err
 * @returns {boolean}
 */
export function isPrevent(err: Error): boolean {
  return Helper.isError(err) && err.message === "PREVENT_NEXT_PROCESS";
}
/**
 * Bind event to the process
 *
 * @param {EventEmitter} event
 * @param {string} originEventName
 * @param {string} [targetEventName]
 */
export function bindProcessEvent(event: EventEmitter, originEventName: string, targetEventName = "beforeExit") {
  event.listeners(originEventName).forEach(func => {
    if (Helper.isFunction(func)) {
      process.addListener(<any>targetEventName, func);
    }
  });
  event.removeAllListeners(originEventName);
}

/**
 * Check if context is HTTP or HTTPS protocol
 * @param ctx Koatty context
 * @returns true if HTTP/HTTPS
 */
export function isHttpProtocol(ctx: KoattyContext): ctx is KoattyContext & { protocol: 'http' | 'https' } {
  return ctx.protocol === 'http' || ctx.protocol === 'https';
}

/**
 * Check if context is WebSocket protocol
 * @param ctx Koatty context
 * @returns true if WS/WSS
 */
export function isWebSocketProtocol(ctx: KoattyContext): ctx is KoattyContext & { 
  protocol: 'ws' | 'wss';
  websocket: NonNullable<KoattyContext['websocket']>;
} {
  return (ctx.protocol === 'ws' || ctx.protocol === 'wss') && !!ctx.websocket;
}

/**
 * Check if context is gRPC protocol
 * @param ctx Koatty context
 * @returns true if gRPC
 */
export function isGrpcProtocol(ctx: KoattyContext): ctx is KoattyContext & { 
  protocol: 'grpc';
  rpc: NonNullable<KoattyContext['rpc']>;
} {
  return ctx.protocol === 'grpc' && !!ctx.rpc;
}

/**
 * Check if context is GraphQL protocol
 * @param ctx Koatty context
 * @returns true if GraphQL
 */
export function isGraphQLProtocol(ctx: KoattyContext): ctx is KoattyContext & { 
  protocol: 'graphql';
} {
  return ctx.protocol === 'graphql';
}

/**
 * Check if context matches any of the specified protocols
 * @param ctx Koatty context
 * @param protocols Array of protocol names to check
 * @returns true if context protocol matches any in the array
 */
export function matchProtocol(ctx: KoattyContext, protocols: string[]): boolean {
  return protocols.includes(ctx.protocol);
}

/**
 * Wrap middleware to only execute on specific protocol(s)
 * @param protocol Protocol name or array of protocol names
 * @param middleware Middleware function to wrap
 * @returns Wrapped middleware that checks protocol
 */
export function protocolMiddleware(
  protocol: string | string[],
  middleware: (ctx: KoattyContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  const protocols = Array.isArray(protocol) ? protocol : [protocol];
  
  return async (ctx: KoattyContext, next: KoattyNext) => {
    if (matchProtocol(ctx, protocols)) {
      return middleware(ctx, next);
    }
    return next();
  };
}

/**
 * Create a middleware that executes different handlers based on protocol
 * @param handlers Map of protocol to middleware function
 * @param defaultHandler Optional default handler for unmatched protocols
 * @returns Middleware that routes to protocol-specific handlers
 */
export function protocolRouter(
  handlers: Record<string, (ctx: KoattyContext, next: KoattyNext) => Promise<any>>,
  defaultHandler?: (ctx: KoattyContext, next: KoattyNext) => Promise<any>
): (ctx: KoattyContext, next: KoattyNext) => Promise<any> {
  return async (ctx: KoattyContext, next: KoattyNext) => {
    const handler = handlers[ctx.protocol];
    if (handler) {
      return handler(ctx, next);
    }
    if (defaultHandler) {
      return defaultHandler(ctx, next);
    }
    return next();
  };
}
