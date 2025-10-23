/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 12:02:29
 * @LastEditTime: 2025-03-15 22:21:29
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import "reflect-metadata";
import {
  getOriginMetadata, IOC, recursiveGetMetadata,
  TAGGED_PARAM
} from "koatty_container";
import { CONTROLLER_ROUTER, Koatty } from "koatty_core";
import { Helper } from "koatty_lib";
import { DefaultLogger as Logger } from "koatty_logger";
import { Project } from "ts-morph";
import { MAPPING_KEY, MiddlewareDecoratorConfig } from "../params/mapping";
import {
  PARAM_CHECK_KEY, PARAM_RULE_KEY, PARAM_TYPE_KEY,
  paramterTypes, ValidOtpions, ValidRules
} from "koatty_validation";
import { RouterMiddlewareManager } from "../middleware/manager";
import { PayloadOptions } from "../payload/interface";

/**
 *
 *
 * @interface RouterMetadata
 */
export interface RouterMetadata {
  method: string;
  path: string;
  ctlPath: string;
  requestMethod: string;
  routerName: string;
  middlewareConfigs?: MiddlewareDecoratorConfig[]; // 更新为新的配置格式
  composedMiddleware?: Function;
}

/**
 *
 *
 * @interface RouterMetadataObject
 */
export interface RouterMetadataObject {
  [key: string]: RouterMetadata;
}

/**
 * Inject router metadata for a controller class.
 * 
 * @param app - The Koatty application instance
 * @param target - The controller class target
 * @param protocol - The protocol type, defaults to 'http'
 * @returns RouterMetadataObject containing route mappings, or null if protocol doesn't match
 * 
 * @description
 * This function processes controller class metadata to generate router mappings.
 * It extracts the controller path, validates method scopes in debug mode,
 * and combines controller and method level route configurations.
 * Additionally, it registers middleware classes to RouterMiddlewareManager for unified management.
 * Now supports advanced middleware features like priority, conditions, and metadata.
 */
export async function injectRouter(app: Koatty, target: any, protocol = 'http'): Promise<RouterMetadataObject | null> {
  const ctlName = IOC.getIdentifier(target);
  const options = IOC.getPropertyData(CONTROLLER_ROUTER, target, ctlName) ||
    { path: "", protocol: 'http' };
  options.path = options.path.startsWith("/") || options.path === "" ? options.path : `/${options.path}`;
  if (options.protocol !== protocol) return null;

  const rmetaData = recursiveGetMetadata(IOC, MAPPING_KEY, target);
  const router: RouterMetadataObject = {};
  const methods: string[] = [];
  const middlewareManager = RouterMiddlewareManager.getInstance(app);

  Logger.Debug(`injectRouter: RouterMiddlewareManager instance ID: ${(middlewareManager as any)._instanceId}`);

  if (app.appDebug) {
    const ctlPath = getControllerPath(ctlName);
    methods.push(...getPublicMethods(ctlPath, ctlName));
  }

  for (const metaKey in rmetaData) {
    // Logger.Debug(`Register inject method Router key: ${metaKey} =>
    // value: ${ JSON.stringify(rmetaData[metaKey]) }`);
    //.sort((a, b) => b.priority - a.priority) 
    if (app.appDebug && !methods.includes(metaKey)) {
      Logger.Debug(`The method ${metaKey} is bound to the route, but the scope of this method is not public.`);
      continue;
    }
    for (const val of rmetaData[metaKey]) {
      // 处理控制器级别和方法级别的中间件配置
      const controllerMiddlewareConfigs: MiddlewareDecoratorConfig[] = [];
      const methodMiddlewareConfigs: MiddlewareDecoratorConfig[] = val.middlewareConfigs || [];

      // 处理控制器级别的中间件（如果有的话）
      if (options.middleware) {
        for (const middlewareItem of options.middleware) {
          let config: MiddlewareDecoratorConfig;
          if (typeof middlewareItem === 'function') {
            config = {
              middleware: middlewareItem,
              priority: 50,
              enabled: true,
              conditions: [],
              metadata: { source: 'controller' }
            };
          } else {
            config = {
              priority: 50,
              enabled: true,
              conditions: [],
              metadata: { source: 'controller' },
              ...middlewareItem
            };
          }
          
          // 控制器级别的中间件都会被添加到配置中，包括enabled: false的
          controllerMiddlewareConfigs.push(config);
        }
      }

      // 创建控制器级别中间件的映射，用于方法级别的禁用检查
      const controllerMiddlewareMap = new Map<Function, MiddlewareDecoratorConfig>();
      controllerMiddlewareConfigs.forEach(config => {
        if (config.middleware) {
          controllerMiddlewareMap.set(config.middleware, config);
        }
      });

      // 处理方法级别的中间件配置
      const methodDisabledMiddlewares = new Set<Function>();
      const methodAddedMiddlewares: MiddlewareDecoratorConfig[] = [];
      
      // 分析方法级别的中间件配置
      for (const methodConfig of methodMiddlewareConfigs) {
        if (methodConfig.enabled === false && methodConfig.middleware) {
          // enabled: false 只对控制器已声明的中间件有效
          if (controllerMiddlewareMap.has(methodConfig.middleware)) {
            methodDisabledMiddlewares.add(methodConfig.middleware);
            Logger.Debug(`injectRouter: Method-level disabling middleware: ${methodConfig.middleware.name}`);
          } else {
            Logger.Debug(`injectRouter: Invalid configuration - middleware ${methodConfig.middleware.name} not declared at controller level, ignoring enabled: false`);
          }
        } else if (methodConfig.enabled !== false && methodConfig.middleware) {
          // enabled: true 或未设置，添加到方法级别中间件（无论控制器是否声明）
          methodAddedMiddlewares.push({
            priority: 50,
            enabled: true,
            conditions: [],
            metadata: { source: 'method' },
            ...methodConfig
          });
          Logger.Debug(`injectRouter: Method-level adding middleware: ${methodConfig.middleware.name}`);
        }
      }

      // 过滤控制器级别的中间件：移除enabled: false的和被方法级别禁用的
      const filteredControllerMiddlewares = controllerMiddlewareConfigs.filter(config => {
        // 如果控制器级别就是enabled: false，则忽略
        if (config.enabled === false) {
          Logger.Debug(`injectRouter: Controller-level middleware disabled: ${config.middleware?.name}`);
          return false;
        }
        
        // 如果被方法级别禁用，则移除
        if (config.middleware && methodDisabledMiddlewares.has(config.middleware)) {
          Logger.Debug(`injectRouter: Controller middleware disabled by method-level config: ${config.middleware.name}`);
          return false;
        }
        
        return true;
      });

      // 合并中间件配置：控制器启用的 + 方法级别添加的
      // 使用 Map 来去重，避免同一个中间件被重复添加
      const middlewareMap = new Map<Function, MiddlewareDecoratorConfig>();
      
      // 先添加控制器级别的中间件
      filteredControllerMiddlewares.forEach(config => {
        if (config.middleware) {
          middlewareMap.set(config.middleware, config);
        }
      });
      
      // 再添加方法级别的中间件（会覆盖同名的控制器中间件配置）
      methodAddedMiddlewares.forEach(config => {
        if (config.middleware) {
          middlewareMap.set(config.middleware, config);
        }
      });
      
      // 转换为数组并按优先级排序
      const allMiddlewareConfigs = Array.from(middlewareMap.values());

      // 按优先级排序（高优先级先执行）
      allMiddlewareConfigs.sort((a, b) => (b.priority || 50) - (a.priority || 50));

      // 将装饰器声明的中间件类注册到RouterMiddlewareManager
      const middlewareInstanceIds: string[] = [];
      for (const middlewareConfig of allMiddlewareConfigs) {
        if (!middlewareConfig.enabled) {
          Logger.Debug(`injectRouter: Skipping disabled middleware: ${middlewareConfig.middleware.name}`);
          continue;
        }

        const middlewareName = middlewareConfig.middleware.name;
        const currentRoute = `${options.path}${val.path}`.replace("//", "/");
        
        Logger.Debug(`injectRouter: Processing middleware class: ${middlewareName} for route: ${currentRoute} with priority: ${middlewareConfig.priority}`);

        // 尝试通过路由和中间件名获取特定实例
        const existingInstance = middlewareManager.getMiddlewareByRoute(middlewareName, currentRoute, val.requestMethod);
        
        if (!existingInstance) {
          Logger.Debug(`injectRouter: Registering new middleware instance: ${middlewareName}@${currentRoute}`);
          
          // 注册到RouterMiddlewareManager，使用装饰器中的高级配置
          const instanceId = await middlewareManager.register({
            name: middlewareName,
            middleware: middlewareConfig.middleware, // 直接传递中间件类
            priority: middlewareConfig.priority || 50,
            enabled: middlewareConfig.enabled ?? true,
            conditions: middlewareConfig.conditions || [],
            metadata: {
              type: 'route',
              description: `Auto-registered middleware from decorator: ${middlewareName}`,
              source: 'decorator',
              ...middlewareConfig.metadata
            },
            middlewareConfig: {
              middlewareName,
              protocol,
              route: currentRoute,
              method: val.requestMethod,
              // 将装饰器中的metadata配置传递给中间件实例
              decoratorConfig: middlewareConfig.metadata || {}
            }
          });
          
          Logger.Debug(`injectRouter: Successfully registered middleware: ${middlewareName} with instanceId: ${instanceId}, priority: ${middlewareConfig.priority}`);
          
          middlewareInstanceIds.push(instanceId);
        } else {
          Logger.Debug(`injectRouter: Middleware instance already exists: ${middlewareName}@${currentRoute}`);
          middlewareInstanceIds.push(existingInstance.instanceId!);
        }
      }

      Logger.Debug(`injectRouter: Final middleware instance IDs for route ${val.path}: [${middlewareInstanceIds.join(', ')}]`);
      
      // 在注册时组合中间件
      let composedMiddleware: Function | undefined;
      if (middlewareInstanceIds.length > 0) {
        Logger.Debug(`injectRouter: Composing middleware for route ${val.path}`);
        
        // 使用RouterMiddlewareManager组合中间件
        composedMiddleware = middlewareManager.compose(middlewareInstanceIds, {
          route: `${options.path}${val.path}`.replace("//", "/"),
          method: val.requestMethod,
          protocol: protocol
        });
        
        Logger.Debug(`injectRouter: Successfully composed middleware for route ${val.path}`);
      }
      
      const tmp = {
        ...val,
        path: `${options.path}${val.path}`.replace("//", "/"),
        ctlPath: options.path,
        middlewareConfigs: allMiddlewareConfigs, // 存储完整的中间件配置用于调试
        composedMiddleware, // 存储预组合的中间件函数
      };
      router[`${tmp.path}||${tmp.requestMethod}`] = tmp;
    }
  }

  return router;
}

/**
 *
 *
 * @interface ParamMetadata
 */
export interface ParamMetadata {
  "fn": Function;
  "name": string;
  "index": number;
  "clazz": any;
  "type": string;
  "isDto": boolean;
  "validRule": Function | ValidRules | ValidRules[];
  "validOpt": ValidOtpions;
  "options": PayloadOptions;
  "dtoCheck": boolean;
  "dtoRule": Map<string, string>;
}

/**
 *
 *
 * @interface ParamMetadataMap
 */
interface ParamMetadataMap {
  [key: string]: ParamMetadata[];
}

/**
 * Inject parameter metadata for dependency injection.
 * 
 * @param app - The Koatty application instance
 * @param target - The target class to inject parameters
 * @param options - Optional payload options for parameter injection
 * @returns A map of parameter metadata for each method
 * 
 * @description
 * This function processes and combines various metadata including injection data,
 * validation rules, and DTO checks. It sorts parameters by index, applies validation
 * rules, and handles DTO class registration. For DTO parameters, it ensures the class
 * is registered in the IOC container and sets up type definitions if DTO validation
 * is enabled.
 * 
 * @throws Error when a DTO class is not registered in the container
 */
export function injectParamMetaData(app: Koatty, target: any,
  options?: PayloadOptions): ParamMetadataMap {
  const metaDatas = recursiveGetMetadata(IOC, TAGGED_PARAM, target);
  const validMetaDatas = recursiveGetMetadata(IOC, PARAM_RULE_KEY, target);
  const validatedMetaDatas = recursiveGetMetadata(IOC, PARAM_CHECK_KEY, target);
  const argsMetaObj: ParamMetadataMap = {};

  for (const meta in metaDatas) {
    Logger.Debug(`Register inject param key ${IOC.getIdentifier(target)
      }: ${Helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);

    const data: ParamMetadata[] = (metaDatas[meta] ?? []).sort((a: ParamMetadata,
      b: ParamMetadata) => a.index - b.index);
    const validData = validMetaDatas[meta] ?? [];

    data.forEach((v: ParamMetadata) => {
      const validEntry = validData.find((it: any) => v.index === it.index && it.name === v.name);
      if (validEntry) {
        v.validRule = validEntry.rule;
        v.validOpt = validEntry.options;
      }
      v.type = v.isDto ? v.type : (v.type).toLowerCase();
      v.dtoCheck = !!(validatedMetaDatas[meta]?.dtoCheck);
      if (v.isDto) {
        v.clazz = IOC.getClass(v.type, "COMPONENT");
        if (!v.clazz) {
          throw Error(`Failed to obtain the class ${v.type},
            because the class is not registered in the container.`);
        }
        if (v.dtoCheck) {
          v.dtoRule = getOriginMetadata(PARAM_TYPE_KEY, v.clazz);
          Reflect.defineProperty(v.clazz.prototype, "_typeDef", {
            enumerable: true,
            configurable: false,
            writable: false,
            value: v.dtoRule,
          });
        }
      }
      if (options) {
        v.options = options;
      }
    });
    argsMetaObj[meta] = data;
  }
  return argsMetaObj;
}

/**
 * Creates a parameter decorator for dependency injection.
 * 
 * @param fn The function to be injected
 * @param name The name of the decorator
 * @returns A ParameterDecorator that handles the injection
 * @throws Error if decorator is used outside of a controller class
 * 
 * @example
 * ```typescript
 * @Controller()
 * class UserController {
 *   @Get("/user")
 *   getUser(@Get() query: QueryDTO) {}
 * }
 * ```
 */
export const injectParam = (fn: Function, name: string): ParameterDecorator => {
  return (target: object, propertyKey: string | symbol | undefined, descriptor: number) => {
    const targetType = IOC.getType(target);
    if (targetType !== "CONTROLLER") {
      throw Error(`${name} decorator is only used in controllers class.`);
    }

    // 获取成员类型
    // const type = Reflect.getMetadata("design:type", target, propertyKey);
    // 获取成员参数类型
    const paramTypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
    // 获取成员返回类型
    // const returnType = Reflect.getMetadata("design:returntype", target, propertyKey);
    // 获取所有元数据 key (由 TypeScript 注入)
    // const keys = Reflect.getMetadataKeys(target, propertyKey);    let type = paramTypes[descriptor]?.name || 'object';
    let type = paramTypes[descriptor]?.name || 'object';
    let isDto = false;

    if (!(Helper.toString(type) in paramterTypes)) {
      type = IOC.getIdentifier(paramTypes[descriptor]);
      isDto = true;
    }

    IOC.attachPropertyData(TAGGED_PARAM, {
      name: propertyKey,
      fn,
      index: descriptor,
      type,
      isDto
    }, target, propertyKey);
    return descriptor;
  };
};

/**
 * Gets all public method names from a TypeScript class.
 * 
 * @param classFilePath - The absolute file path to the TypeScript class file
 * @param className - The name of the class to analyze
 * @returns An array of strings containing the names of all public methods
 * 
 * @example
 * ```ts
 * const methods = getPublicMethods('/path/to/class.ts', 'MyClass');
 * // returns ['method1', 'method2', ...]
 * ```
 */
export function getPublicMethods(classFilePath: string, className: string): string[] {
  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(classFilePath);

  const classDeclaration = sourceFile.getClass(className);
  const publicMethods: string[] = [];

  if (classDeclaration) {
    for (const method of classDeclaration.getMethods()) {
      const modifiers = method.getModifiers().map(mod => mod.getText());
      if (!modifiers.includes("private") && !modifiers.includes("protected")) {
        publicMethods.push(method.getName());
      }
    }
  }

  return publicMethods;
}

/**
 * get koatty controller paths
 * @param className 
 * @returns 
 */
function getControllerPath(className: string): string {
  return process.env.APP_PATH + "/controller/" + className + ".ts";
}
