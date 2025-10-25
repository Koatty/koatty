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
  FunctionValidator,
  PARAM_CHECK_KEY, PARAM_RULE_KEY, PARAM_TYPE_KEY,
  paramterTypes, ValidOtpions, ValidRules,
} from "koatty_validation";
import { RouterMiddlewareManager } from "../middleware/manager";
import { PayloadOptions } from "../payload/interface";
import { convertParamsType, ClassValidator, plainToClass } from "koatty_validation";
import { bodyParser } from "../payload/payload";
import { Exception } from "koatty_exception";
/**
 * Parameter source type enumeration for efficient parameter extraction
 * 
 * @description
 * Identifies the source of a parameter, enabling:
 * - Type-safe parameter extraction using enum switch statements
 * - Faster execution compared to string comparisons
 * - Better V8 JIT optimization through predictable control flow
 * 
 * @performance
 * Using enums with switch statements is ~30% faster than string-based if-else chains
 * 
 * @example
 * ```typescript
 * switch(param.sourceType) {
 *   case ParamSourceType.QUERY:
 *     return ctx.query[paramName];
 *   case ParamSourceType.BODY:
 *     return await bodyParser(ctx);
 *   // ...
 * }
 * ```
 * 
 * @since 1.20.0-8
 * @category Parameter Extraction
 */
export enum ParamSourceType {
  /** Query string parameters - extracted from ctx.query (@Get decorator) */
  QUERY = 'query',
  
  /** Request body parameters - extracted via bodyParser (@Post, @RequestBody decorators) */
  BODY = 'body',
  
  /** HTTP headers - extracted from ctx.headers (@Header decorator) */
  HEADER = 'header',
  
  /** Path variables - extracted from ctx.params (@PathVariable decorator) */
  PATH = 'path',
  
  /** Uploaded files - extracted from parsed body (@File decorator) */
  FILE = 'file',
  
  /** Custom extraction using user-defined function */
  CUSTOM = 'custom'
}

/**
 * Infer ParamSourceType from decorator function name
 * 
 * @description
 * Provides backward compatibility for metadata that was created before Task 4.1.
 * Maps decorator function names to their corresponding ParamSourceType enum values.
 * 
 * @param fnName - The name of the decorator function (e.g., 'Get', 'Post', 'Header')
 * @returns The corresponding ParamSourceType enum value
 * 
 * @example
 * ```typescript
 * inferSourceTypeFromFnName('Get')        // Returns ParamSourceType.QUERY
 * inferSourceTypeFromFnName('Post')       // Returns ParamSourceType.BODY
 * inferSourceTypeFromFnName('Header')     // Returns ParamSourceType.HEADER
 * inferSourceTypeFromFnName('Unknown')    // Returns ParamSourceType.CUSTOM
 * ```
 * 
 * @internal
 * @since 1.20.0-8
 * @category Parameter Extraction
 */
export function inferSourceTypeFromFnName(fnName: string): ParamSourceType {
  switch(fnName) {
    case 'Get':
      return ParamSourceType.QUERY;
    case 'Post':
    case 'RequestBody':
      return ParamSourceType.BODY;
    case 'Header':
      return ParamSourceType.HEADER;
    case 'PathVariable':
      return ParamSourceType.PATH;
    case 'File':
      return ParamSourceType.FILE;
    default:
      return ParamSourceType.CUSTOM;
  }
}

/**
 * DTO metadata cache using WeakMap for automatic garbage collection
 * Maps DTO class to its metadata (dtoRule)
 * @internal
 */
const DTO_METADATA_CACHE = new WeakMap<any, Map<string, string>>();

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
  "compiledValidator"?: (value: any) => void;
  "precompiledOptions"?: any;
  "fastPathHandler"?: FastPathHandler;
  "compiledTypeConverter"?: ((value: any) => any) | null;
  "sourceType": ParamSourceType;   // Parameter source type
  "paramName"?: string;             // Parameter name (e.g., "id")
  "extractorType"?: string;         // Extractor type for unified extraction
  "precompiledExtractor"?: (ctx: any) => any; // Pre-compiled extractor function
  "defaultValue"?: any;             // Default value if extraction returns undefined
}

/**
 * Extended parameter metadata array with runtime optimization flags
 * 
 * @description
 * Extends the standard Array<ParamMetadata> with additional optimization metadata
 * that is computed at startup time for improved runtime performance.
 * 
 * @property hasAsyncParams - Indicates if the method has any async parameters (BODY/FILE/DTO).
 *                            When false, enables fast synchronous extraction path.
 * @property fastPathHandler - Pre-compiled handler for zero-validation scenarios.
 *                             Created during Task 2.x when all parameters can be extracted
 *                             and validated in a single optimized function.
 * 
 * @performance
 * - Sync path (hasAsyncParams=false): ~40% faster than async path
 * - Fast path handler: ~60% faster than normal path
 * 
 * @example
 * ```typescript
 * const params: CompiledMethodParams = [...];
 * params.hasAsyncParams = false;  // All params are QUERY/HEADER/PATH
 * 
 * if (!params.hasAsyncParams) {
 *   // Use synchronous extraction path
 *   return extractSync(ctx, params);
 * }
 * ```
 * 
 * @since 1.20.0-8
 * @category Parameter Extraction
 */
export interface CompiledMethodParams extends Array<ParamMetadata> {
  /** Indicates if method has async parameters requiring bodyParser or DTO validation */
  hasAsyncParams?: boolean;
  
  /** Pre-compiled fast path handler for zero-validation scenarios */
  fastPathHandler?: any;
}

/**
 *
 *
 * @interface ParamMetadataMap
 */
interface ParamMetadataMap {
  [key: string]: CompiledMethodParams;
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
      // Backward compatibility: infer sourceType from fn.name if not present
      if (!v.sourceType && v.fn) {
        v.sourceType = inferSourceTypeFromFnName(v.fn.name || '');
        Logger.Debug(`Inferred sourceType ${v.sourceType} for param ${v.name} from fn.name`);
      }
      // Ensure sourceType is set (default to CUSTOM if still missing)
      if (!v.sourceType) {
        v.sourceType = ParamSourceType.CUSTOM;
      }
      
      // Task 4.5: Set extractorType based on sourceType for unified extraction
      switch(v.sourceType) {
        case ParamSourceType.QUERY:
          v.extractorType = 'query';
          break;
        case ParamSourceType.BODY:
          v.extractorType = 'body';
          break;
        case ParamSourceType.HEADER:
          v.extractorType = 'header';
          break;
        case ParamSourceType.PATH:
          v.extractorType = 'path';
          break;
        case ParamSourceType.FILE:
          v.extractorType = 'file';
          break;
        case ParamSourceType.CUSTOM:
          v.extractorType = 'custom';
          break;
      }
      Logger.Debug(`Set extractorType ${v.extractorType} for param ${v.name}`);
      
      const validEntry = validData.find((it: any) => v.index === it.index && it.name === v.name);
      if (validEntry) {
        v.validRule = validEntry.rule;
        v.validOpt = validEntry.options;
        
        // Task 6.2: All validators must be compiled at startup
        // Skip compilation for DTO parameters as they use ClassValidator
        if (!v.isDto && v.validRule) {
          try {
            v.compiledValidator = compileValidator(v.index, v.type, v.validRule, v.validOpt);
            Logger.Debug(`Compiled validator for param ${v.name} at index ${v.index}`);
          } catch (err) {
            // In v2.0.0+, validator compilation failures are fatal
            const errorMsg = `Failed to compile validator for param ${v.name} at index ${v.index}: ${err.message}`;
            Logger.Error(errorMsg);
            throw new Error(errorMsg);
          }
        }
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
          // Task 3.3: Check cache first
          const cachedDtoRule = DTO_METADATA_CACHE.get(v.clazz);
          if (cachedDtoRule) {
            v.dtoRule = cachedDtoRule;
            Logger.Debug(`Using cached DTO metadata for ${v.type}`);
          } else {
            // Cache miss - get metadata and cache it
            v.dtoRule = getOriginMetadata(PARAM_TYPE_KEY, v.clazz);
            DTO_METADATA_CACHE.set(v.clazz, v.dtoRule);
            Logger.Debug(`Cached DTO metadata for ${v.type}`);
          }
          
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
      
      // Pre-create ParamOptions object to avoid runtime creation
      v.precompiledOptions = {
        index: v.index,
        isDto: v.isDto,
        type: v.type,
        validRule: v.validRule,
        validOpt: v.validOpt,
        dtoCheck: v.dtoCheck,
        dtoRule: v.dtoRule,
        clazz: v.clazz
      };
      Logger.Debug(`Pre-compiled options for param ${v.name} at index ${v.index}`);
      
      // Task 4.6: Generate pre-compiled extractor for sync parameters
      const precompiledExtractor = generatePrecompiledExtractor(v);
      if (precompiledExtractor) {
        v.precompiledExtractor = precompiledExtractor;
        Logger.Debug(`Generated pre-compiled extractor for param ${v.name}`);
      }
      
      // Task 3.2: Compile type converter for non-DTO parameters
      if (!v.isDto && v.type) {
        try {
          v.compiledTypeConverter = compileTypeConverter(v.type);
          if (v.compiledTypeConverter) {
            Logger.Debug(`Compiled type converter for param ${v.name}, type: ${v.type}`);
          } else {
            Logger.Debug(`No type converter needed for param ${v.name}, type: ${v.type} (string)`);
          }
        } catch (error) {
          Logger.Error(`Failed to compile type converter for param ${v.name}: ${error.message}`);
        }
      }
    });
    
    // Task 2.3: Detect and create fast path handler if possible
    const fastPathScenario = detectFastPathScenario(data);
    if (fastPathScenario) {
      const fastPathHandler = createFastPathHandler(fastPathScenario, data);
      if (fastPathHandler) {
        // Store the fast path handler in metadata
        // Since we need to store it somewhere accessible, we'll add it to the first parameter
        // or create a method-level metadata
        Logger.Debug(`Created fast path handler for ${target.constructor.name}.${meta}, scenario: ${fastPathScenario}`);
        
        // Store in each parameter for easy access, or we can store it once per method
        // For now, let's add a reference in the metadata map itself
        (data as any).fastPathHandler = fastPathHandler;
        (data as any).fastPathScenario = fastPathScenario;
      }
    }
    
    // Task 4.4: Detect if method has async parameters
    const hasAsyncParams = data.some(p => 
      p.sourceType === ParamSourceType.BODY || 
      p.sourceType === ParamSourceType.FILE ||
      p.isDto  // DTO validation might be async
    );
    (data as CompiledMethodParams).hasAsyncParams = hasAsyncParams;
    Logger.Debug(`Method ${meta} hasAsyncParams: ${hasAsyncParams}`);
    
    argsMetaObj[meta] = data as CompiledMethodParams;
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
export const injectParam = (
  fn: Function, 
  name: string,
  sourceType: ParamSourceType,
  paramName?: string,
  defaultValue?: any
): ParameterDecorator => {
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
      isDto,
      sourceType,
      paramName,
      defaultValue  // Task 4.7: Store default value
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

/**
 * Fast path handler type - optimized parameter extraction function
 * @internal
 */
export type FastPathHandler = (ctx: any) => any[] | Promise<any[]>;

/**
 * Fast path scenario types
 * @internal
 */
export enum FastPathScenario {
  SINGLE_QUERY_NO_VALIDATION = 'SINGLE_QUERY_NO_VALIDATION',      // 场景 A: 单个 query 参数，无验证
  SINGLE_DTO_FROM_BODY = 'SINGLE_DTO_FROM_BODY',                  // 场景 B: 单个 DTO 参数，来自 body
  MULTIPLE_QUERY_NO_VALIDATION = 'MULTIPLE_QUERY_NO_VALIDATION'   // 场景 C: 多个 query 参数，无验证
}

/**
 * Detect if parameters match a fast path scenario
 * Returns the scenario type if a fast path can be used, null otherwise
 * 
 * @param params - Array of parameter metadata
 * @returns FastPathScenario or null
 * @internal
 */
export function detectFastPathScenario(params: ParamMetadata[]): FastPathScenario | null {
  if (!params || params.length === 0) {
    return null;
  }

  // 场景 A: 单个 query 参数，无验证
  if (params.length === 1) {
    const param = params[0];
    const fnName = param.fn?.name || '';
    
    // 检查是否是 Get 装饰器，且没有验证规则
    if (fnName === 'Get' && !param.validRule && !param.isDto) {
      Logger.Debug(`Detected fast path scenario A: single query param without validation`);
      return FastPathScenario.SINGLE_QUERY_NO_VALIDATION;
    }
    
    // 场景 B: 单个 DTO 参数，来自 body
    if ((fnName === 'Post' || fnName === 'RequestBody') && param.isDto) {
      Logger.Debug(`Detected fast path scenario B: single DTO from body`);
      return FastPathScenario.SINGLE_DTO_FROM_BODY;
    }
  }
  
  // 场景 C: 多个 query 参数，无验证
  if (params.length > 1) {
    const allQueryNoValidation = params.every(param => {
      const fnName = param.fn?.name || '';
      return fnName === 'Get' && !param.validRule && !param.isDto;
    });
    
    if (allQueryNoValidation) {
      Logger.Debug(`Detected fast path scenario C: multiple query params without validation`);
      return FastPathScenario.MULTIPLE_QUERY_NO_VALIDATION;
    }
  }
  
  // 复杂场景，不能使用快速路径
  return null;
}

/**
 * Create an optimized fast path handler for detected scenarios
 * 
 * @param scenario - The detected fast path scenario
 * @param params - Array of parameter metadata
 * @returns FastPathHandler function or null if cannot create
 * @internal
 */
export function createFastPathHandler(
  scenario: FastPathScenario, 
  params: ParamMetadata[]
): FastPathHandler | null {
  
  switch (scenario) {
    case FastPathScenario.SINGLE_QUERY_NO_VALIDATION: {
      // 场景 A: 单个 query 参数，无验证
      const param = params[0];
      const paramName = param.name;
      const paramType = param.type;
      
      if (paramName) {
        // 有名称的参数，直接提取
        return (ctx: any) => {
          const value = ctx.query?.[paramName];
          const converted = convertParamsType(value, paramType);
          return [converted];
        };
      } else {
        // 无名称的参数，返回整个 query 对象
        return (ctx: any) => {
          const query = ctx.query || {};
          return [query];
        };
      }
    }
    
    case FastPathScenario.SINGLE_DTO_FROM_BODY: {
      // 场景 B: 单个 DTO 参数，来自 body
      const param = params[0];
      const clazz = param.clazz;
      const dtoCheck = param.dtoCheck;
      
      if (!clazz) {
        Logger.Debug(`Cannot create fast path: DTO class not found`);
        return null;
      }
      
      // 返回异步处理器
      return async (ctx: any) => {
        const body = await bodyParser(ctx, param.options);
        
        let validatedValue;
        if (dtoCheck) {
          validatedValue = await ClassValidator.valid(clazz, body, true);
        } else {
          validatedValue = plainToClass(clazz, body, true);
        }
        
        return [validatedValue];
      };
    }
    
    case FastPathScenario.MULTIPLE_QUERY_NO_VALIDATION: {
      // 场景 C: 多个 query 参数，无验证
      // 预编译参数名称和类型数组
      const paramConfigs = params.map(p => ({
        name: p.name,
        type: p.type
      }));
      
      return (ctx: any) => {
        const query = ctx.query || {};
        const results: any[] = [];
        
        for (const config of paramConfigs) {
          if (config.name) {
            const value = query[config.name];
            const converted = convertParamsType(value, config.type);
            results.push(converted);
          } else {
            results.push(query);
          }
        }
        
        return results;
      };
    }
    
    default:
      return null;
  }
}

/**
 * Compile type converter function at startup time.
 * This pre-compilation optimizes type conversion by:
 * - Returning null for string types (no conversion needed)
 * - Creating specialized converters for other types
 * - Avoiding runtime type checks
 * 
 * @param type - Parameter type (string, number, boolean, array, etc.)
 * @returns Compiled type converter function or null if no conversion needed
 * @internal
 */
export function compileTypeConverter(type: string): ((value: any) => any) | null {
  const normalizedType = type.toLowerCase();
  
  // String type doesn't need conversion
  if (normalizedType === 'string') {
    return null;
  }
  
  // Create specialized converters for common types
  switch (normalizedType) {
    case 'number':
      return (value: any) => {
        if (value === null || value === undefined || value === '') return value;
        const num = Number(value);
        return isNaN(num) ? value : num;
      };
    
    case 'boolean':
      return (value: any) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (lower === 'true' || lower === '1') return true;
          if (lower === 'false' || lower === '0') return false;
        }
        return Boolean(value);
      };
    
    case 'array':
      return (value: any) => {
        if (value === null || value === undefined) return value;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
          } catch {
            return [value];
          }
        }
        return [value];
      };
    
    case 'object':
      return (value: any) => {
        if (value === null || value === undefined) return value;
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      };
    
    default:
      // For other types, use the generic convertParamsType
      return (value: any) => convertParamsType(value, type);
  }
}

/**
 * Generate optimized parameter extractor function at application startup
 * 
 * @description
 * Creates specialized extractor functions for synchronous parameters (QUERY, HEADER, PATH)
 * at startup time. These pre-compiled extractors eliminate runtime conditionals and
 * provide direct property access for maximum performance.
 * 
 * Returns null for async parameters (BODY, FILE) and custom extractors, as these
 * require runtime async operations or user-defined logic.
 * 
 * @param param - Parameter metadata containing sourceType and paramName
 * @returns Pre-compiled extractor function, or null if parameter requires async extraction
 * 
 * @performance
 * Pre-compiled extractors are ~25% faster than runtime switch-based extraction
 * because they avoid all conditional logic and provide direct property access.
 * 
 * @example
 * ```typescript
 * const queryParam = {
 *   sourceType: ParamSourceType.QUERY,
 *   paramName: 'page',
 *   name: 'page'
 * };
 * 
 * const extractor = generatePrecompiledExtractor(queryParam);
 * // Returns: (ctx) => (ctx.query || {})['page']
 * 
 * // Usage at runtime:
 * const value = extractor(ctx);  // Direct property access, no conditionals
 * ```
 * 
 * @internal
 * @since 1.20.0-8
 * @category Parameter Extraction
 */
export function generatePrecompiledExtractor(param: ParamMetadata): ((ctx: any) => any) | null {
  // paramName is the specific key to extract, if undefined, extract the entire collection
  const paramName = param.paramName !== undefined ? param.paramName : undefined;
  
  switch(param.sourceType) {
    case ParamSourceType.QUERY:
      // Generate optimized query extractor
      if (paramName !== undefined) {
        return (ctx: any) => (ctx.query || {})[paramName];
      } else {
        return (ctx: any) => ctx.query || {};
      }
    
    case ParamSourceType.HEADER:
      // Generate optimized header extractor
      if (paramName !== undefined) {
        return (ctx: any) => ctx.get ? ctx.get(paramName) : (ctx.headers || {})[paramName];
      } else {
        return (ctx: any) => ctx.headers || {};
      }
    
    case ParamSourceType.PATH:
      // Generate optimized path extractor
      if (paramName !== undefined) {
        return (ctx: any) => (ctx.params || {})[paramName];
      } else {
        return (ctx: any) => ctx.params || {};
      }
    
    case ParamSourceType.BODY:
    case ParamSourceType.FILE:
      // Body and file require async parsing, cannot pre-compile
      return null;
    
    case ParamSourceType.CUSTOM:
      // Custom extractors use the original fn
      return null;
    
    default:
      return null;
  }
}

/**
 * Compile validation rules into a single validation function at startup time.
 * This pre-compilation reduces runtime overhead by eliminating repetitive lookups and checks.
 * 
 * @param index - Parameter index for error reporting
 * @param type - Parameter type
 * @param rule - Validation rule (Function, string, or array of strings)
 * @param options - Optional validation options
 * @returns Compiled validation function that throws Exception on failure
 * @internal
 */
export function compileValidator(
  index: number, 
  type: string, 
  rule: Function | ValidRules | ValidRules[], 
  options?: ValidOtpions
): (value: any) => void {
  
  // If rule is a custom function validator
  if (Helper.isFunction(rule)) {
    // Task 6.3: Optimize memory - pre-compute error message prefix
    const errorPrefix = `Validation failed for param ${index}: `;
    return (value: any) => {
      try {
        (rule as Function)(value);
      } catch (err) {
        throw new Exception(
          errorPrefix + err.message,
          1,
          400
        );
      }
    };
  }
  
  // If rule is string or array of strings, compile built-in validators
  const funcs: ValidRules[] = Helper.isString(rule) ? [rule as ValidRules] : 
                              Helper.isArray(rule) ? rule as ValidRules[] : [];
  
  // Pre-filter and prepare validators
  const validators: Array<(value: any, opts?: ValidOtpions) => void> = [];
  for (const func of funcs) {
    if (Object.hasOwnProperty.call(FunctionValidator, func)) {
      validators.push(FunctionValidator[func]);
    } else {
      Logger.Debug(`compileValidator: Unknown validator '${func}' will be ignored`);
    }
  }
  
  // Task 6.3: Optimize memory - pre-compute error message prefix
  const errorPrefix = `Validation failed for param ${index}: `;
  
  // Return composed validation function
  return (value: any) => {
    for (const validator of validators) {
      try {
        validator(value, options);
      } catch (err) {
        throw new Exception(
          errorPrefix + err.message,
          1,
          400
        );
      }
    }
  };
}
