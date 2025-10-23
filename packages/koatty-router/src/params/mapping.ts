/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2024-10-31 14:16:50
 * @LastEditTime: 2025-01-26 12:04:42
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { IOC } from 'koatty_container';
import { MiddlewareCondition } from "../middleware/manager";

// used for request mapping metadata
export const MAPPING_KEY = 'MAPPING_KEY';

/**
 * Enhanced middleware configuration for decorators
 */
export interface MiddlewareDecoratorConfig {
  middleware: Function;
  priority?: number;
  enabled?: boolean;
  conditions?: MiddlewareCondition[];
  metadata?: Record<string, any>;
}

/**
 * Koatty router options with enhanced middleware support
 *
 * @export
 * @interface RouterOption
 */
export interface RouterOption {
  path?: string;
  requestMethod: string;
  routerName?: string;
  method: string;
  middleware?: Function[] | MiddlewareDecoratorConfig[];
}

/**
 * http request methods
 *
 * @export
 * @var RequestMethod
 */
export enum RequestMethod {
  "GET" = "get",
  "POST" = "post",
  "PUT" = "put",
  "DELETE" = "delete",
  "PATCH" = "patch",
  "ALL" = "all",
  "OPTIONS" = "options",
  "HEAD" = "head"
}

/**
 * Routes HTTP requests to the specified path with enhanced middleware support.
 *
 * @param {string} [path="/"]
 * @param {RequestMethod} [reqMethod=RequestMethod.GET]
 * @param {{
 *         routerName?: string;
 *         middleware?: Function[] | MiddlewareDecoratorConfig[];
 *     }} [routerOptions={}]
 * @returns {*}  {MethodDecorator}
 */
export const RequestMapping = (
  path = "/",
  reqMethod: RequestMethod = RequestMethod.GET,
  routerOptions: {
    routerName?: string;
    middleware?: Function[] | MiddlewareDecoratorConfig[];
  } = {}
): MethodDecorator => {
  const routerName = routerOptions.routerName ?? "";
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const targetType = IOC.getType(target);
    if (targetType !== "CONTROLLER") {
      throw Error("RequestMapping decorator is only used in controllers class.");
    }

    // 处理中间件配置
    let middlewareConfigs: MiddlewareDecoratorConfig[] = [];
    
    if (routerOptions.middleware) {
      middlewareConfigs = routerOptions.middleware.map(item => {
        if (typeof item === 'function') {
          // 兼容旧的简单中间件配置
          if (!('run' in item.prototype)) {
            throw new Error(`Middleware must be a class implementing IMiddleware`);
          }
          return {
            middleware: item,
            priority: 50, // 默认优先级
            enabled: true,
            conditions: [],
            metadata: {}
          } as MiddlewareDecoratorConfig;
        } else {
          // 新的高级中间件配置
          if (typeof item.middleware !== 'function' || !('run' in item.middleware.prototype)) {
            throw new Error(`Middleware must be a class implementing IMiddleware`);
          }
          return {
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: {},
            ...item
          } as MiddlewareDecoratorConfig;
        }
      });
    }

    // tslint:disable-next-line: no-object-literal-type-assertion
    IOC.attachPropertyData(MAPPING_KEY, {
      path,
      requestMethod: reqMethod,
      routerName,
      method: key,
      middlewareConfigs // 存储完整的中间件配置
    }, target, key);

    return descriptor;
  };
};

/**
 * Routes HTTP POST requests to the specified path.
 */
export const PostMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.POST, routerOptions);
};

/**
 * Routes HTTP GET requests to the specified path.
 */
export const GetMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.GET, routerOptions);
};

/**
 * Routes HTTP DELETE requests to the specified path.
 */
export const DeleteMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.DELETE, routerOptions);
};
/**
 * Routes HTTP PUT requests to the specified path.
 */
export const PutMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.PUT, routerOptions);
};

/**
 * Routes HTTP PATCH requests to the specified path.
 */
export const PatchMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.PATCH, routerOptions);
};

/**
 * Routes HTTP OPTIONS requests to the specified path.
 */
export const OptionsMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.OPTIONS, routerOptions);
};

/**
 * Routes HTTP HEAD requests to the specified path.
 */
export const HeadMapping = (path = "/", routerOptions?: RouterOption) => {
  return RequestMapping(path, RequestMethod.HEAD, routerOptions);
};

/**
 * Helper function to create middleware configuration with advanced features
 * 
 * @param middleware - The middleware class
 * @param options - Advanced configuration options
 * @returns MiddlewareDecoratorConfig
 * 
 * @example
 * ```typescript
 * @GetMapping('/api/users', {
 *   middleware: [
 *     withMiddleware(AuthMiddleware, { 
 *       priority: 100,
 *       conditions: [{ type: 'header', value: 'authorization', operator: 'contains' }]
 *     }),
 *     withMiddleware(RateLimitMiddleware, { 
 *       priority: 90,
 *       metadata: { limit: 100, window: 60000 }
 *     })
 *   ]
 * })
 * ```
 */
export function withMiddleware(
  middleware: Function,
  options: {
    priority?: number;
    enabled?: boolean;
    conditions?: MiddlewareCondition[];
    metadata?: Record<string, any>;
  } = {}
): MiddlewareDecoratorConfig {
  if (typeof middleware !== 'function' || !('run' in middleware.prototype)) {
    throw new Error(`Middleware must be a class implementing IMiddleware`);
  }

  return {
    middleware,
    priority: options.priority ?? 50,
    enabled: options.enabled ?? true,
    conditions: options.conditions ?? [],
    metadata: options.metadata ?? {}
  };
}
