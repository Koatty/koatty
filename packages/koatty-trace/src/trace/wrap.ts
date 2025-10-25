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

// ✅ 使用 WeakMap 存储 emitter -> { resource, wrappedHandlers } 映射
const emitterResourceMap = new WeakMap<EventEmitter, {
  resource: AsyncResource;
  wrappedHandlers: WeakMap<Function, Function>;
}>();

export function createAsyncResource(key = Symbol('koatty-tracer').toString()):
 AsyncResource & { emitDestroy: () => void } {
  const resource = new AsyncResource(key);
  
  // ✅ WeakMap 会自动清理，无需手动 clear
  resource.emitDestroy = () => {
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
  // ✅ 防止重复包装
  if (emitterResourceMap.has(emitter)) {
    return;
  }

  // ✅ 为此 emitter 创建独立的 handler 映射
  const wrappedHandlers = new WeakMap<Function, Function>();
  emitterResourceMap.set(emitter, { resource: asyncResource, wrappedHandlers });

  // 包装 add 方法
  for (const method of eventMethods.add) {
    wrapEmitterMethod(emitter, method, (original: Function) => 
      function (this: EventEmitter, name: string, handler: (...args: any[]) => void) {
        // ✅ 使用 WeakMap 存储 handler -> wrappedHandler 映射
        let wrappedHandler = wrappedHandlers.get(handler);
        
        if (!wrappedHandler) {
          wrappedHandler = (...args: any[]) => {
            asyncResource.runInAsyncScope(handler, emitter, ...args);
          };
          wrappedHandlers.set(handler, wrappedHandler);
        }
        
        return original.call(this, name, wrappedHandler);
      }
    );
  }

  // 包装 remove 方法
  for (const method of eventMethods.remove) {
    wrapEmitterMethod(emitter, method, (original: Function) => 
      function (this: EventEmitter, name: string, handler: (...args: any[]) => void) {
        const wrappedHandler = wrappedHandlers.get(handler);
        
        if (wrappedHandler) {
          wrappedHandlers.delete(handler);
          return original.call(this, name, wrappedHandler);
        }
        
        return original.call(this, name, handler);
      }
    );
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
