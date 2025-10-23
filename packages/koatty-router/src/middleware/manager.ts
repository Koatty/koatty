/*
 * @Description: Middleware Manager Implementation
 * @Usage: Centralized middleware management and composition
 * @Author: richen
 * @Date: 2025-01-20 10:00:00
 * @LastEditTime: 2025-01-20 10:00:00
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext, KoattyNext } from "koatty_core";
import { DefaultLogger as Logger } from "koatty_logger";
import compose, { Middleware } from "koa-compose";
import { LRUCache } from "lru-cache";
import { Application } from "koatty_container";

/**
 * Middleware function type
 */
export type MiddlewareFunction = (ctx: KoattyContext, next: KoattyNext) => Promise<any> | any;

/**
 * Middleware configuration
 */
export interface MiddlewareConfig {
  name: string;
  instanceId?: string; // 中间件实例的唯一标识符
  middleware: MiddlewareFunction | Function; // 支持中间件函数或中间件类
  priority?: number;
  enabled?: boolean;
  conditions?: MiddlewareCondition[];
  metadata?: Record<string, any>;
  // 用于中间件类的配置参数
  middlewareConfig?: {
    [key: string]: any;
  };
}

/**
 * Middleware condition
 */
export interface MiddlewareCondition {
  type: 'path' | 'method' | 'header' | 'custom';
  value: string | RegExp | ((ctx: KoattyContext) => boolean);
  operator?: 'equals' | 'contains' | 'matches' | 'custom';
}

/**
 * Middleware execution context
 */
export interface MiddlewareExecutionContext {
  route?: string;
  method?: string;
  protocol?: string;
  metadata?: Record<string, any>;
}

/**
 * Path pattern cache for optimized matching with memory management
 */
interface PathPattern {
  exact: LRUCache<string, boolean>;           // 精确匹配的路径
  prefixes: LRUCache<string, boolean>;        // 前缀匹配的路径
  suffixes: LRUCache<string, boolean>;        // 后缀匹配的路径
  patterns: LRUCache<string, RegExp>;         // 复杂模式的正则表达式
}

/**
 * Router middleware manager interface
 * Defines the contract for managing router-level middleware
 */
export interface IRouterMiddlewareManager {
  register(config: MiddlewareConfig): Promise<string>;
  unregister(nameOrInstanceId: string): boolean;
  getMiddleware(nameOrInstanceId: string): MiddlewareConfig | null;
  getMiddlewareByRoute(middlewareName: string, route: string, method?: string): MiddlewareConfig | null;
  listMiddlewares(): string[];
  compose(instanceIds: string[], context?: MiddlewareExecutionContext): MiddlewareFunction;
}

/**
 * Router middleware manager implementation
 * Manages router-level middleware registration, composition, and conditional execution
 */
export class RouterMiddlewareManager implements IRouterMiddlewareManager {
  private app: Application;
  private static instance: RouterMiddlewareManager | null = null;
  private static isCreating = false;
  private readonly _instanceId: string;
  private middlewares = new Map<string, MiddlewareConfig>(); // 按实例ID存储
  private middlewaresByName = new Map<string, Set<string>>(); // 按名称索引实例ID

  // 优化的路径匹配缓存 - 使用LRU缓存防止内存泄漏
  private pathPatterns: PathPattern = {
    exact: new LRUCache<string, boolean>({ max: 200 }),
    prefixes: new LRUCache<string, boolean>({ max: 100 }),
    suffixes: new LRUCache<string, boolean>({ max: 100 }),
    patterns: new LRUCache<string, RegExp>({ max: 50 })
  };

  // 方法匹配缓存 - 限制大小
  private methodCache = new LRUCache<string, Set<string>>({ max: 100 });

  // 头部匹配缓存 - 限制大小
  private headerCache = new LRUCache<string, Map<string, string>>({ max: 100 });

  // 缓存清理定时器
  private cacheCleanupTimer?: NodeJS.Timeout;
  private readonly CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(app: Application) {
    this.app = app;
    if (RouterMiddlewareManager.instance) {
      throw new Error('RouterMiddlewareManager is a singleton. Use getInstance() instead.');
    }
    this._instanceId = Math.random().toString(36).substr(2, 9);
    Logger.Debug(`RouterMiddlewareManager instance created with ID: ${this._instanceId}`);
    this.startCacheCleanup();
  }

  /**
   * Get singleton instance
   * @returns RouterMiddlewareManager instance
   */
  public static getInstance(app: Application): RouterMiddlewareManager {
    if (RouterMiddlewareManager.instance) {
      return RouterMiddlewareManager.instance;
    }

    if (RouterMiddlewareManager.isCreating) {
      throw new Error('RouterMiddlewareManager is already being created');
    }

    RouterMiddlewareManager.isCreating = true;
    try {
      RouterMiddlewareManager.instance = new RouterMiddlewareManager(app);
      Logger.Debug('RouterMiddlewareManager singleton instance initialized');
    } finally {
      RouterMiddlewareManager.isCreating = false;
    }

    return RouterMiddlewareManager.instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static resetInstance(): void {
    if (RouterMiddlewareManager.instance) {
      RouterMiddlewareManager.instance.destroy();
    }
    RouterMiddlewareManager.instance = null;
    RouterMiddlewareManager.isCreating = false;
    Logger.Debug('RouterMiddlewareManager singleton instance reset');
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    this.cacheCleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Perform periodic cache cleanup
   */
  private performCacheCleanup(): void {
    const beforeSize = this.getCacheSize();

    const afterSize = this.getCacheSize();
    Logger.Debug(`Cache cleanup completed. Size: ${beforeSize} -> ${afterSize}`);
  }



  /**
   * Get total cache size
   */
  private getCacheSize(): number {
    return this.pathPatterns.exact.size +
      this.pathPatterns.prefixes.size +
      this.pathPatterns.suffixes.size +
      this.pathPatterns.patterns.size +
      this.methodCache.size +
      this.headerCache.size;
  }

  /**
   * Destroy manager and cleanup resources
   */
  public destroy(): void {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = undefined;
    }

    this.clearCaches();
    this.middlewares.clear();

    Logger.Debug(`RouterMiddlewareManager instance ${this._instanceId} destroyed`);
  }

  /**
   * Register middleware
   */
  public async register(config: MiddlewareConfig): Promise<string> {
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Middleware name must be a non-empty string');
    }

    if (!config.middleware || typeof config.middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }

    // 处理中间件类或中间件函数
    let actualMiddleware: MiddlewareFunction;

    // 检查是否为中间件类（有run方法）
    if (this.isMiddlewareClass(config.middleware)) {
      Logger.Debug(`Processing middleware class: ${config.name}`);
      actualMiddleware = await this.processMiddlewareClass(config);
    } else {
      // 直接使用中间件函数
      actualMiddleware = config.middleware as MiddlewareFunction;
    }

    // 生成唯一的实例ID
    const instanceId = config.instanceId || this.generateInstanceId(config.name, config.middlewareConfig);

    // Set defaults
    const middlewareConfig: MiddlewareConfig = {
      priority: 500,
      enabled: true,
      conditions: [],
      metadata: {},
      ...config,
      instanceId,
      middleware: actualMiddleware // 使用处理后的中间件函数
    };

    // 按实例ID存储
    this.middlewares.set(instanceId, middlewareConfig);

    // 按名称索引实例ID
    if (!this.middlewaresByName.has(config.name)) {
      this.middlewaresByName.set(config.name, new Set());
    }
    this.middlewaresByName.get(config.name)!.add(instanceId);

    // 预处理条件以优化匹配性能
    this.preprocessConditions(middlewareConfig);

    Logger.Debug(`Registered middleware: ${config.name} with instanceId: ${instanceId}`);
    return instanceId;
  }

  /**
   * Generate unique instance ID using middleware name and route
   */
  private generateInstanceId(name: string, config?: any): string {
    if (config && config.route) {
      // 使用中间件名和路由组合作为唯一标识
      const route = config.route.replace(/[^a-zA-Z0-9\/\-_]/g, '_'); // 清理路由中的特殊字符
      const method = config.method || 'ALL';
      return `${name}@${route}#${method}`;
    }
    
    // 如果没有路由信息，使用时间戳作为后备方案
    const timestamp = Date.now();
    return `${name}_${timestamp}`;
  }

  /**
   * Check if the provided function is a middleware class
   */
  private isMiddlewareClass(middleware: Function): boolean {
    // 检查是否为构造函数（类）
    if (middleware.prototype && middleware.prototype.constructor === middleware) {
      // 检查原型上是否有run方法
      return typeof middleware.prototype.run === 'function';
    }
    return false;
  }

  /**
   * Process middleware class to get actual middleware function
   */
  private async processMiddlewareClass(config?: MiddlewareConfig): Promise<MiddlewareFunction> {
    const MiddlewareClass = config?.middleware as any;
    try {
      // 实例化中间件类
      const middlewareInstance = new MiddlewareClass();

      // 检查实例是否有run方法
      if (!middlewareInstance.run || typeof middlewareInstance.run !== 'function') {
        throw new Error(`Middleware class ${MiddlewareClass.name} does not have a run method`);
      }

      // 调用run方法获取真正的Koa中间件函数
      const appConfig = this.app.config("config", "middleware") || {};
      const middlewareBusinessConfig = appConfig[MiddlewareClass?.name] || {};
      
      // 合并装饰器配置和应用配置
      const decoratorConfig = config?.middlewareConfig?.decoratorConfig || {};
      const finalConfig = {
        ...middlewareBusinessConfig,
        ...decoratorConfig // 装饰器配置优先级更高
      };
      
      Logger.Debug(`Processing middleware ${MiddlewareClass.name} with config:`, finalConfig);
      
      // 调用run方法，传递合并后的配置和app实例
      const koaMiddleware = await middlewareInstance.run(finalConfig, this.app);

      // 验证返回的是否为函数
      if (typeof koaMiddleware !== 'function') {
        throw new Error(`Middleware ${MiddlewareClass.name}.run() must return a function, got ${typeof koaMiddleware}`);
      }

      Logger.Debug(`Successfully processed middleware class: ${MiddlewareClass.name}`);
      return koaMiddleware;

    } catch (error) {
      Logger.Error(`Error processing middleware class ${MiddlewareClass.name}:`, error);
      throw error;
    }
  }

  /**
   * Preprocess conditions for optimized matching
   */
  private preprocessConditions(config: MiddlewareConfig): void {
    if (!config.conditions || config.conditions.length === 0) {
      return;
    }

    for (const condition of config.conditions) {
      switch (condition.type) {
        case 'path':
          this.preprocessPathCondition(condition);
          break;
        case 'method':
          this.preprocessMethodCondition(condition);
          break;
        case 'header':
          this.preprocessHeaderCondition(condition);
          break;
      }
    }
  }

  /**
   * Preprocess path conditions
   */
  private preprocessPathCondition(condition: MiddlewareCondition): void {
    if (typeof condition.value !== 'string') {
      return;
    }

    const path = condition.value;
    const operator = condition.operator || 'equals';

    switch (operator) {
      case 'equals':
        this.pathPatterns.exact.set(path, true);
        break;
      case 'contains':
        // 对于包含匹配，我们可以优化为前缀或后缀匹配
        if (path.startsWith('/') && !path.includes('*')) {
          this.pathPatterns.prefixes.set(path, true);
        }
        break;
      case 'matches':
        // 只有在必要时才使用正则表达式
        try {
          this.pathPatterns.patterns.set(path, new RegExp(path));
        } catch {
          Logger.Warn(`Invalid regex pattern: ${path}`);
        }
        break;
    }
  }

  /**
   * Preprocess method conditions
   */
  private preprocessMethodCondition(condition: MiddlewareCondition): void {
    if (typeof condition.value === 'string') {
      const method = condition.value.toUpperCase();
      if (!this.methodCache.has(method)) {
        this.methodCache.set(method, new Set());
      }
    }
  }

  /**
   * Preprocess header conditions
   */
  private preprocessHeaderCondition(condition: MiddlewareCondition): void {
    if (typeof condition.value === 'string') {
      const [headerName, expectedValue] = condition.value.split(':');
      if (headerName) {
        if (!this.headerCache.has(headerName.toLowerCase())) {
          this.headerCache.set(headerName.toLowerCase(), new Map());
        }
        if (expectedValue) {
          this.headerCache.get(headerName.toLowerCase())!.set(expectedValue, expectedValue);
        }
      }
    }
  }

  /**
   * Unregister middleware by name or instance ID
   */
  public unregister(nameOrInstanceId: string): boolean {
    // 首先尝试按实例ID删除
    if (this.middlewares.has(nameOrInstanceId)) {
      const config = this.middlewares.get(nameOrInstanceId)!;
      this.middlewares.delete(nameOrInstanceId);
      
      // 从名称索引中移除
      const instanceIds = this.middlewaresByName.get(config.name);
      if (instanceIds) {
        instanceIds.delete(nameOrInstanceId);
        if (instanceIds.size === 0) {
          this.middlewaresByName.delete(config.name);
        }
      }
      
      Logger.Debug(`Unregistered middleware: ${config.name} (instanceId: ${nameOrInstanceId})`);
      return true;
    }

    // 然后尝试按名称删除所有实例
    const instanceIds = this.middlewaresByName.get(nameOrInstanceId);
    if (instanceIds && instanceIds.size > 0) {
      let deletedCount = 0;
      for (const instanceId of instanceIds) {
        if (this.middlewares.delete(instanceId)) {
          deletedCount++;
        }
      }
      this.middlewaresByName.delete(nameOrInstanceId);
      Logger.Debug(`Unregistered ${deletedCount} instances of middleware: ${nameOrInstanceId}`);
      return deletedCount > 0;
    }

    Logger.Warn(`Middleware not found: ${nameOrInstanceId}`);
    return false;
  }

  /**
   * Get middleware configuration by name or instance ID
   */
  public getMiddleware(nameOrInstanceId: string): MiddlewareConfig | null {
    // 首先尝试按实例ID查找
    if (this.middlewares.has(nameOrInstanceId)) {
      return this.middlewares.get(nameOrInstanceId)!;
    }

    // 然后尝试按名称查找第一个实例
    const instanceIds = this.middlewaresByName.get(nameOrInstanceId);
    if (instanceIds && instanceIds.size > 0) {
      const firstInstanceId = instanceIds.values().next().value;
      return this.middlewares.get(firstInstanceId) || null;
    }

    return null;
  }

  /**
   * Get middleware by route and middleware name
   */
  public getMiddlewareByRoute(middlewareName: string, route: string, method?: string): MiddlewareConfig | null {
    // 生成预期的实例ID
    const cleanRoute = route.replace(/[^a-zA-Z0-9\/\-_]/g, '_');
    const targetMethod = method || 'ALL';
    const expectedInstanceId = `${middlewareName}@${cleanRoute}#${targetMethod}`;
    
    // 直接通过实例ID查找
    const config = this.middlewares.get(expectedInstanceId);
    if (config) {
      Logger.Debug(`Found middleware by route: ${middlewareName}@${route}#${targetMethod}`);
      return config;
    }

    // 如果没找到，尝试查找该中间件的所有实例，匹配路由
    const instanceIds = this.middlewaresByName.get(middlewareName);
    if (instanceIds && instanceIds.size > 0) {
      for (const instanceId of instanceIds) {
        const middlewareConfig = this.middlewares.get(instanceId);
        if (middlewareConfig && 
            middlewareConfig.middlewareConfig?.route === route &&
            (middlewareConfig.middlewareConfig?.method === method || 
             middlewareConfig.middlewareConfig?.method === 'ALL' || 
             !method)) {
          Logger.Debug(`Found middleware by route match: ${middlewareName}@${route}`);
          return middlewareConfig;
        }
      }
    }

    Logger.Debug(`Middleware not found by route: ${middlewareName}@${route}#${targetMethod}`);
    return null;
  }

  /**
   * Get all middleware instances by name
   */
  public getMiddlewareInstances(name: string): MiddlewareConfig[] {
    const instanceIds = this.middlewaresByName.get(name);
    if (!instanceIds || instanceIds.size === 0) {
      return [];
    }

    return Array.from(instanceIds)
      .map(instanceId => this.middlewares.get(instanceId))
      .filter((config): config is MiddlewareConfig => config !== undefined);
  }

  /**
   * List all middlewares
   */
  public listMiddlewares(): string[] {
    return Array.from(this.middlewares.keys());
  }

  /**
   * Enable/disable middleware by name or instance ID
   */
  public setEnabled(nameOrInstanceId: string, enabled: boolean): void {
    // 首先尝试按实例ID查找
    const middleware = this.middlewares.get(nameOrInstanceId);
    if (middleware) {
      middleware.enabled = enabled;
      Logger.Debug(`${enabled ? 'Enabled' : 'Disabled'} middleware: ${nameOrInstanceId}`);
      return;
    }

    // 然后尝试按名称查找所有实例
    const instanceIds = this.middlewaresByName.get(nameOrInstanceId);
    if (instanceIds && instanceIds.size > 0) {
      let updatedCount = 0;
      for (const instanceId of instanceIds) {
        const config = this.middlewares.get(instanceId);
        if (config) {
          config.enabled = enabled;
          updatedCount++;
        }
      }
      Logger.Debug(`${enabled ? 'Enabled' : 'Disabled'} ${updatedCount} instances of middleware: ${nameOrInstanceId}`);
      return;
    }

    Logger.Warn(`Middleware not found: ${nameOrInstanceId}`);
  }

  /**
   * Compose middlewares by instance IDs
   */
  public compose(instanceIds: string[], context?: MiddlewareExecutionContext): MiddlewareFunction {
    // 获取有效的中间件配置并按优先级排序
    const validConfigs = instanceIds
      .map(instanceId => this.middlewares.get(instanceId))
      .filter((config): config is MiddlewareConfig =>
        config !== undefined && config.enabled !== false
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (validConfigs.length === 0) {
      return async (ctx: KoattyContext, next: KoattyNext) => {
        await next();
      };
    }

    // 创建中间件函数数组
    const middlewareFunctions = validConfigs.map(config => {
      // 如果有条件，创建条件中间件
      if (config.conditions && config.conditions.length > 0) {
        return this.createConditionalMiddleware(config, context);
      } else {
        return this.wrapMiddleware(config);
      }
    });

    return compose(middlewareFunctions);
  }

  /**
   * Create conditional middleware
   */
  private createConditionalMiddleware(
    config: MiddlewareConfig,
    context?: MiddlewareExecutionContext
  ): Middleware<KoattyContext> {
    return async (ctx: KoattyContext, next: KoattyNext) => {
      const shouldExecute = this.evaluateConditions(config.conditions!, ctx, context);

      if (shouldExecute) {
        await this.wrapMiddleware(config)(ctx, next);
      } else {
        await next();
      }
    };
  }

  /**
   * Evaluate middleware conditions
   */
  private evaluateConditions(
    conditions: MiddlewareCondition[],
    ctx: KoattyContext,
    context?: MiddlewareExecutionContext
  ): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'path':
          return this.evaluatePathCondition(condition, ctx.path);
        case 'method':
          return this.evaluateMethodCondition(condition, ctx.method);
        case 'header':
          return this.evaluateHeaderCondition(condition, ctx);
        case 'custom':
          return this.evaluateCustomCondition(condition, ctx, context);
        default:
          Logger.Warn(`Unknown condition type: ${condition.type}`);
          return true;
      }
    });
  }

  /**
   * Evaluate path condition with optimized matching
   */
  private evaluatePathCondition(condition: MiddlewareCondition, path: string): boolean {
    const { value, operator = 'equals' } = condition;

    if (typeof value === 'string') {
      switch (operator) {
        case 'equals':
          // 使用LRU缓存进行O(1)查找
          const exactMatch = this.pathPatterns.exact.get(value);
          if (exactMatch !== undefined) {
            return path === value;
          }
          // 如果缓存中没有，检查并缓存结果
          const isMatch = path === value;
          this.pathPatterns.exact.set(value, isMatch);
          return isMatch;

        case 'contains':
          // 优先使用前缀匹配缓存
          const prefixMatch = this.pathPatterns.prefixes.get(value);
          if (prefixMatch !== undefined) {
            return path.startsWith(value);
          }
          // 检查并缓存前缀匹配结果
          const isPrefixMatch = path.startsWith(value) || path.includes(value);
          this.pathPatterns.prefixes.set(value, isPrefixMatch);
          return isPrefixMatch;

        case 'matches':
          // 使用预编译的正则表达式缓存
          let regex = this.pathPatterns.patterns.get(value);
          if (!regex) {
            try {
              regex = new RegExp(value);
              this.pathPatterns.patterns.set(value, regex);
            } catch {
              return false;
            }
          }
          return regex.test(path);

        default:
          return false;
      }
    } else if (value instanceof RegExp) {
      return value.test(path);
    }

    return false;
  }

  /**
   * Evaluate method condition with caching
   */
  private evaluateMethodCondition(condition: MiddlewareCondition, method: string): boolean {
    const { value, operator = 'equals' } = condition;

    if (typeof value === 'string') {
      const targetMethod = value.toUpperCase();
      const currentMethod = method.toUpperCase();

      // 使用缓存检查方法匹配
      let methodSet = this.methodCache.get(targetMethod);
      if (!methodSet) {
        methodSet = new Set<string>();
        this.methodCache.set(targetMethod, methodSet);
      }

      if (methodSet.has(currentMethod)) {
        return true;
      }

      const isMatch = operator === 'equals' ?
        currentMethod === targetMethod :
        currentMethod.includes(targetMethod);

      if (isMatch) {
        methodSet.add(currentMethod);
      }

      return isMatch;
    }

    return false;
  }

  /**
   * Evaluate header condition with caching
   */
  private evaluateHeaderCondition(condition: MiddlewareCondition, ctx: KoattyContext): boolean {
    const { value, operator = 'equals' } = condition;

    if (typeof value === 'string') {
      const [headerName, expectedValue] = value.split(':');
      if (!headerName) return false;

      const normalizedHeaderName = headerName.toLowerCase();
      const actualValue = ctx.headers[normalizedHeaderName];

      if (!actualValue) return false;

      // 处理头部值可能是数组的情况
      const actualValueStr = Array.isArray(actualValue) ? actualValue[0] : actualValue;
      if (!actualValueStr) return false;

      // 使用缓存检查头部匹配
      let headerMap = this.headerCache.get(normalizedHeaderName);
      if (!headerMap) {
        headerMap = new Map<string, string>();
        this.headerCache.set(normalizedHeaderName, headerMap);
      }

      if (expectedValue) {
        const cachedResult = headerMap.get(expectedValue);
        if (cachedResult !== undefined) {
          return actualValueStr === expectedValue;
        }

        const isMatch = operator === 'equals' ?
          actualValueStr === expectedValue :
          operator === 'contains' ?
            actualValueStr.includes(expectedValue) :
            false;

        if (isMatch) {
          headerMap.set(expectedValue, actualValueStr);
        }

        return isMatch;
      } else {
        // 只检查头部是否存在
        return true;
      }
    } else if (typeof value === 'function') {
      return value(ctx);
    }

    return false;
  }

  /**
   * Evaluate custom condition
   */
  private evaluateCustomCondition(
    condition: MiddlewareCondition,
    ctx: KoattyContext,
    _context?: MiddlewareExecutionContext
  ): boolean {
    const { value } = condition;

    if (typeof value === 'function') {
      try {
        return value(ctx);
      } catch (error) {
        Logger.Error('Error evaluating custom condition:', error);
        return false;
      }
    }

    return false;
  }

  /**
   * Wrap middleware
   */
  private wrapMiddleware(config: MiddlewareConfig): Middleware<KoattyContext> {
    return async (ctx: KoattyContext, next: KoattyNext) => {
      await config.middleware(ctx, next);
    };
  }



  /**
   * Clear all caches with proper cleanup
   */
  public clearCaches(): void {
    this.pathPatterns.exact.clear();
    this.pathPatterns.prefixes.clear();
    this.pathPatterns.suffixes.clear();
    this.pathPatterns.patterns.clear();
    this.methodCache.clear();
    this.headerCache.clear();

    Logger.Debug('All caches cleared');
  }



  /**
   * Create middleware group
   */
  public createGroup(groupName: string, middlewareNames: string[]): void {
    const groupMiddleware = this.compose(middlewareNames);

    this.register({
      name: groupName,
      middleware: groupMiddleware,
      metadata: {
        type: 'group',
        members: middlewareNames
      }
    });
  }
}

/**
 * Middleware builder for fluent API
 */
export class MiddlewareBuilder {
  private config: Partial<MiddlewareConfig> = {};

  public name(name: string): this {
    this.config.name = name;
    return this;
  }

  public priority(priority: number): this {
    this.config.priority = priority;
    return this;
  }

  public enabled(enabled: boolean): this {
    this.config.enabled = enabled;
    return this;
  }

  public middleware(middleware: MiddlewareFunction): this {
    this.config.middleware = middleware;
    return this;
  }

  public condition(condition: MiddlewareCondition): this {
    if (!this.config.conditions) {
      this.config.conditions = [];
    }
    this.config.conditions.push(condition);
    return this;
  }

  public metadata(key: string, value: any): this {
    if (!this.config.metadata) {
      this.config.metadata = {};
    }
    this.config.metadata[key] = value;
    return this;
  }

  public build(): MiddlewareConfig {
    if (!this.config.name || !this.config.middleware) {
      throw new Error('Middleware name and function are required');
    }

    return this.config as MiddlewareConfig;
  }

  public register(app: Application): void {
    const manager = RouterMiddlewareManager.getInstance(app);
    manager.register(this.build());
  }
}

/**
 * Decorator for auto-registering middlewares
 */
export function RegisterMiddleware(app: Application, config: Omit<MiddlewareConfig, 'middleware'>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const middleware = descriptor.value;

    if (typeof middleware !== 'function') {
      throw new Error('Decorated method must be a function');
    }

    const manager = RouterMiddlewareManager.getInstance(app);
    manager.register({
      ...config,
      middleware
    });

    return descriptor;
  };
} 