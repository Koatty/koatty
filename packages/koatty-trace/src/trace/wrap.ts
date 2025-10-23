/**
 * 
 * @Description: 
 * @Author: richen
 * @Date: 2025-03-23 01:11:24
 * @LastEditTime: 2025-03-23 10:47:44
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
/**
 * Async context tracking module
 * 
 * @Description: Provides async context tracking using async_hooks
 * @Author: richen
 * @Date: 2021-11-18 10:44:51
 * @LastEditTime: 2025-03-23 00:56:47
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 * @Usage: 
 */
import { AsyncLocalStorage, AsyncResource } from "async_hooks";
import { EventEmitter } from 'events'; // Used in type annotations

// AsyncLocalStorage
export const asyncLocalStorage = new AsyncLocalStorage();

// EventEmitter methods to wrap
const eventMethods = {
  add: ['on', 'addListener'],
  remove: ['off', 'removeListener']
}

// Lightweight wrapper cache
const wrapperCache = new Map<string, Function>();

export function createAsyncResource(key = Symbol('koatty-tracer').toString()):
 AsyncResource & { emitDestroy: () => void } {
  const resource = new AsyncResource(key);
  
  // Clean up wrapper cache on destroy
  resource.emitDestroy = () => {
    wrapperCache.clear();
    AsyncResource.prototype.emitDestroy.call(resource);
    return resource;
  };

  return resource;
}

/**
 * Wraps EventEmitter listener registration methods of the
 * given emitter, so that all listeners are run in scope of
 * the provided async resource.
 *
 * @param {*} emitter
 * @param {AsyncResource} asyncResource
 */
export function wrapEmitter(emitter: EventEmitter, asyncResource: AsyncResource) {
  for (const method of eventMethods.add) {
    wrapEmitterMethod(emitter, method, (original: Function) => function (name: string, handler: (...args: any[]) => void) {
      const cacheKey = `${name}:${handler.toString()}`;
      if (!wrapperCache.has(cacheKey)) {
        const wrappedHandler = (...args: any[]) => {
          asyncResource.runInAsyncScope(handler, emitter, ...args);
        };
        wrapperCache.set(cacheKey, wrappedHandler);
        return original.call(this, name, wrappedHandler);
      }
      return original.call(this, name, handler);
    });
  }

  for (const method of eventMethods.remove) {
    wrapEmitterMethod(emitter, method, (original: Function) => function (name: string, handler: (...args: any[]) => void) {
      const cacheKey = `${name}:${handler.toString()}`;
      if (wrapperCache.has(cacheKey)) {
        wrapperCache.delete(cacheKey);
      }
      return original.call(this, name, handler);
    });
  }
}

/**
 *
 *
 * @param {*} emitter
 * @param {string} method
 * @param {Function} wrapper
 * @returns {*}  
 */
export function wrapEmitterMethod(emitter: EventEmitter, method: string, wrapper: Function) {
  if (!(method in emitter)) {
    return;
  }

  const original = (emitter as any)[method];
  if (typeof original !== 'function') {
    return;
  }

  const wrapped = wrapper(original, method);
  (emitter as any)[method] = wrapped;
  return wrapped;
}
