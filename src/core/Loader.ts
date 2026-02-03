/*
 * @Description: framework loader
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 22:55:49
 * @LastEditTime: 2025-03-13 16:44:39
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { LoadConfigs as loadConf } from "koatty_config";
import { IOC, TAGGED_CLS } from "koatty_container";
import {
  AppEvent, AppEventArr, IMiddleware, IMiddlewareOptions, protocolMiddleware,
  implementsAspectInterface, implementsControllerInterface,
  implementsMiddlewareInterface,
  implementsServiceInterface, IPlugin, KoattyApplication, Koatty, MIDDLEWARE_OPTIONS,
  ComponentManager, asyncEvent
} from 'koatty_core';
import { Helper } from "koatty_lib";
import { Load } from "koatty_loader";
import { Trace } from "koatty_trace";
import * as path from "path";
import { checkClass } from "../util/Helper";
import { Logger, LogLevelType, SetLogger } from "../util/Logger";
import { COMPONENT_SCAN, CONFIGURATION_SCAN } from './Constants';

/**
 * Interface representing a component item.
 * @interface ComponentItem
 * @property {string} id - Unique identifier for the component
 * @property {any} target - Target object or instance of the component
 */
interface ComponentItem {
  id: string;
  target: any;
}

/**
 * Loader class for Koatty framework.
 * Handles initialization, loading and configuration of application components.
 * 
 * Responsibilities:
 * - Initialize environment and paths
 * - Load configurations, components, middlewares, services and controllers
 * - Set up logging
 * - Handle application event hooks
 * - Load and configure router
 * 
 * @export
 * @class Loader
 */
export class Loader {
  app: KoattyApplication;

  /**
   * Creates an instance of Loader.
   * @param {KoattyApplication} app
   * @memberof Loader
   */
  constructor(app: KoattyApplication) {
    this.app = app;
  }

   /**
    * Initialize application configuration and environment settings.
    * Sets up logging levels, defines essential paths, and loads application metadata.
    *
    * @param {KoattyApplication} app - The Koatty application instance
    * - Sets logging level based on environment
    * - Defines root, app and framework paths on app object
    * - Loads application name and version from package.json
    * - Sets environment variables for paths (deprecated, for backward compatibility)
    * - Maintains backward compatibility with legacy path variables
    * @deprecated Use app.rootPath, app.appPath, app.koattyPath instead of process.env.ROOT_PATH, etc.
    */
  public static initialize(app: KoattyApplication) {
    if (app.env == 'development') {
      Logger.setLevel("debug");
    } else {
      Logger.setLevel("info");
    }

    // define path
    const rootPath = app.rootPath || process.cwd();
    const appPath = app.appPath || path.resolve(rootPath, app.appDebug ? 'src' : 'dist');
    const koattyPath = path.resolve(__dirname, '..');
    Helper.define(app, 'rootPath', rootPath);
    Helper.define(app, 'appPath', appPath);
    Helper.define(app, 'koattyPath', koattyPath);

    //
    if (Helper.isEmpty(app.name)) {
      const pkg = Helper.safeRequire(`${path.dirname(appPath)}/package.json`);
      if (pkg.name) {
        app.name = pkg.name;
        app.version = app.version || pkg.version;
      }
    }

    // Set environment variables for backward compatibility (deprecated)
    // Use app.rootPath, app.appPath, app.koattyPath instead
    // Note: These env vars are set for legacy code compatibility but should not be used in new code
    process.env.ROOT_PATH = rootPath;
    process.env.APP_PATH = appPath;
    process.env.KOATTY_PATH = koattyPath;

    // Compatible with old version, will be deprecated
    Helper.define(app, 'thinkPath', koattyPath);
    process.env.THINK_PATH = koattyPath;
  
  }

  /**
   * Get component metadata from target class.
   * 
   * @param {KoattyApplication} app - The Koatty application instance
   * @param {any} target - The target class to get metadata from
   * @returns {any[]} Array of component metadata paths
   * 
   * @static
   * @public
   */
  public static GetComponentMeta(app: KoattyApplication, target: any): any[] {
    let componentMetas = [];
    const componentMeta = IOC.getClassMetadata(TAGGED_CLS, COMPONENT_SCAN, target);
    if (componentMeta) {
      if (Helper.isArray(componentMeta)) {
        componentMetas = componentMeta;
      } else {
        componentMetas.push(componentMeta);
      }
    }
    if (componentMetas.length < 1) {
      componentMetas = [app.appPath];
    }
    return componentMetas;
  }

  /**
   * Get configuration metadata from target class.
   * 
   * @param {KoattyApplication} app Application instance
   * @param {any} target Target class
   * @returns {any[]} Array of configuration metadata
   */
  public static GetConfigurationMeta(app: KoattyApplication, target: any): any[] {
    const confMeta = IOC.getClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, target);
    let configurationMetas = [];
    if (confMeta) {
      if (Helper.isArray(confMeta)) {
        configurationMetas = confMeta;
      } else {
        configurationMetas.push(confMeta);
      }
    }
    return configurationMetas;
  }

  /**
   * Check and load all components(excepted config/*、App.ts) in the application.
   * 
   * @param {KoattyApplication} app - The Koatty application instance
   * @param {any} target - The target class or object to check components from
   * @static
   * @public
   */
  public static CheckAllComponents(app: KoattyApplication, target: any) {
    // component metadata
    const componentMetas = Loader.GetComponentMeta(app, target);
    // configuration metadata
    const configurationMetas = Loader.GetConfigurationMeta(app, target);
    const exSet = new Set();
    Load(componentMetas, '', (fileName: string, xpath: string, xTarget: any) => {
      checkClass(fileName, xpath, xTarget, exSet);
    }, ['**/**.js', '**/**.ts', '!**/**.d.ts'], [...configurationMetas, `${target.name || '.no'}.ts`]);
    exSet.clear();
  }

  /**
   * Set logger configuration for the Koatty application.
   * 
   * @param {KoattyApplication} app - The Koatty application instance
   * @description Configures logging settings based on application environment and config options.
   * Handles log level, log file path, and sensitive fields configuration.
   * In production environment, default log level is 'info', otherwise 'debug'.
   */
  public static SetLogger(app: KoattyApplication) {
    const data = app.getMetaData('_configs') || [];
    const configs = data[0] || {};
    //Logger
    if (configs.config) {
      const opt = configs.config;
      let logLevel: LogLevelType = "debug",
        logFilePath = "",
        sensFields = [];
      if (app.env === "production") {
        logLevel = "info";
      }
      if (opt.logsLevel) {
        logLevel = (opt.logsLevel).toLowerCase();
      }
      if (opt.logsPath) {
        logFilePath = opt.logsPath;
      }
      if (opt.sensFields) {
        sensFields = opt.sensFields;
      }
      SetLogger(app, { logLevel, logFilePath, sensFields });
    }
  }

  /**
   * Load all components and initialize the application.
   * 
   * @param app - The KoattyApplication instance
   * @param target - The target class or object containing configuration metadata
   * 
   * This method performs the following initialization steps:
   * 1. Loads configurations
   * 2. Creates server and router instances
   * 3. Loads components, middlewares, services and controllers
   * 4. Sets up routing
   * 
   * @static
   * @async
   */
  public static async LoadAllComponents(app: KoattyApplication, target: any) {
    try {
      if (Helper.isFunction((IOC as any).preloadMetadata)) {
        (IOC as any).preloadMetadata();
      }
    } catch {
      Logger.Warn('[Loader] preloadMetadata is optional, ignore if not available');
    }

    const configurationMeta = Loader.GetConfigurationMeta(app, target);
    const loader = new Loader(app);

    for (const event of AppEventArr) {
      switch (event) {
        case AppEvent.appBoot:
          Logger.Log('Koatty', '', 'Load Configurations ...');
          loader.LoadConfigs(configurationMeta);
          Loader.SetLogger(app);
          await asyncEvent(app, event);
          break;

        case AppEvent.loadConfigure:
          Logger.Log('Koatty', '', 'Emit loadConfigure ...');
          await asyncEvent(app, event);
          break;

        case AppEvent.loadComponent:
          Logger.Log('Koatty', '', 'Initializing Component Manager ...');
          const componentManager = new ComponentManager(app);
          Helper.define(app, 'componentManager', componentManager);

          // Step 1: Discover components (scan metadata)
          componentManager.discoverComponents();
          
          const stats = componentManager.getStats();
          Logger.Log('Koatty', '', `Discovered ${stats.coreComponents} core components, ${stats.userComponents} user components`);

          // Step 2: Load components (create instances)
          Logger.Log('Koatty', '', 'Load Components ...');
          await loader.LoadComponents(componentManager);

          // Step 3: Register event hooks (instances now exist)
          componentManager.registerAppEvents(target);
          componentManager.registerCoreComponentHooks();
          
          await asyncEvent(app, event);
          break;

        case AppEvent.loadPlugin:
          Logger.Log('Koatty', '', 'Emit loadPlugin ...');
          await asyncEvent(app, event);
          break;

        case AppEvent.loadMiddleware:
          Logger.Log('Koatty', '', 'Load Middlewares ...');
          await loader.LoadMiddlewares();
          await asyncEvent(app, event);
          break;

        case AppEvent.loadService:
          Logger.Log('Koatty', '', 'Load Services ...');
          await loader.LoadServices();
          await asyncEvent(app, event);
          break;

        case AppEvent.loadController:
          Logger.Log('Koatty', '', 'Load Controllers ...');
          await loader.LoadControllers();
          await asyncEvent(app, event);
          break;

        case AppEvent.loadRouter:
          Logger.Log('Koatty', '', 'Initialize Router and Load Routes ...');
          // RouterComponent.initRouter() handles both router creation and route loading
          await asyncEvent(app, event);
          break;

        case AppEvent.loadServe:
          Logger.Log('Koatty', '', 'Emit loadServe ...');
          await asyncEvent(app, event);
          break;

         case AppEvent.appReady:
           Logger.Log('Koatty', '', 'Emit appReady ...');
           await asyncEvent(app, event);
           break;

         default:
          await asyncEvent(app, event);
          break;
      }
    }
  }

  /**
   * Load configuration files from specified paths.
   * First loads framework configurations from './config' directory,
   * then loads application configurations from custom paths.
   * Finally merges both configurations with framework configs as lower priority.
   * 
   * @protected
   * @param {string[]} [loadPath] - Optional array of paths to load application configs from
   */
  protected LoadConfigs(loadPath?: string[]) {
    const frameConfig: any = {};
    // Logger.Debug(`Load configuration path: ${app.thinkPath}/config`);
    Load(["./config"], this.app.koattyPath, function (name: string, path: string, exp: any) {
      frameConfig[name] = exp;
    });

    if (Helper.isArray(loadPath)) {
      loadPath = loadPath.length > 0 ? loadPath : ["./config"];
    }
    let appConfig = loadConf(loadPath, this.app.appPath);
    appConfig = Helper.extend(frameConfig, appConfig, true);

    this.app.setMetaData("_configs", appConfig);
  }

  /**
   * Load and register middleware components.
   * Processes middleware configuration, registers middleware classes with IOC container,
   * and mounts middleware to the application.
   * Supports protocol-specific middleware mounting via @Middleware({ protocol }) option.
   * 
   * @protected
   * @returns {Promise<void>}
   * @throws {Error} When middleware doesn't implement IMiddleware interface
   * @throws {Error} When middleware loading fails
   */
  protected async LoadMiddlewares() {
    // ============================================
    // Load middleware configuration
    // ============================================
    let middlewareConf = this.app.config(undefined, "middleware");
    if (Helper.isEmpty(middlewareConf)) {
      middlewareConf = { config: {}, list: []};
    }
    
    // ============================================
    // Trace Middleware（请求链路追踪中间件）
    // ============================================
    // Koatty-Trace 是一个纯粹的 Middleware
    // 配置位置：config/middleware.ts 中的 config.trace
    // 
    // 作为第一个加载的中间件，用于追踪整个请求链路
    try {
      const traceOptions = middlewareConf.config?.trace ?? {};
      const tracer = Trace(traceOptions, this.app as Koatty) as any;
      Helper.define(this.app, "tracer", tracer);
      this.app.use(tracer);
      Logger.Debug(`Trace middleware registered`);
    } catch (error: any) {
      Logger.Warn(`Trace middleware failed to load: ${error.message}`);
    }

    //Mount application middleware
    const appMiddleware = IOC.listClass("MIDDLEWARE") ?? [];
    appMiddleware.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("MIDDLEWARE:", "");
      if (item.id && Helper.isClass(item.target)) {
        IOC.reg(item.id, item.target, { scope: "Prototype", type: "MIDDLEWARE", args: [] });
        const ctl = IOC.getInsByClass(item.target);
        if (!implementsMiddlewareInterface(ctl)) {
          throw Error(`The middleware ${item.id} must implements interface 'IMiddleware'.`);
        }
      }
    });

    const middlewareList = middlewareConf.list || [];
    //de-duplication
    const appMList = new Set([]);
    middlewareList.forEach((item: string) => {
      appMList.add(item);
    });

    //Automatically call middleware
    const middlewareConfig = middlewareConf.config || {};
    for (const key of Array.from(appMList)) {
      const handle: IMiddleware = IOC.get(key, "MIDDLEWARE");
      if (!handle) {
        throw Error(`Middleware ${key} load error.`);
      }
      if (!Helper.isFunction(handle.run)) {
        throw Error(`The middleware ${key} must implements interface 'IMiddleware'.`);
      }
      
      Logger.Debug(`Load middleware: ${key}`);
      const middlewareOpt = middlewareConfig[key] || {};
      
      // Get middleware options from decorator metadata
      const middlewareClass = appMiddleware.find(m => m.id === key)?.target;
      let decoratorOptions: IMiddlewareOptions = {};
      if (middlewareClass) {
        try {
          decoratorOptions = IOC.getPropertyData(MIDDLEWARE_OPTIONS, middlewareClass, key) || {};
        } catch {
          // If metadata not found, use empty object
          decoratorOptions = {};
        }
      }
      
      // Merge decorator options with config options (config has higher priority)
      const mergedOptions: IMiddlewareOptions = { ...decoratorOptions, ...middlewareOpt };
      
      // Check if middleware is disabled
      if (mergedOptions.enabled === false) {
        Logger.Warn(`The middleware ${key} has been loaded but is disabled.`);
        continue;
      }
      
      // Execute middleware handler
      const result = await handle.run(mergedOptions, this.app);
      if (Helper.isFunction(result)) {
        let middleware = result;
        
        // Wrap with protocol filter if protocol option is specified
        if (mergedOptions.protocol) {
          const protocols = Helper.isArray(mergedOptions.protocol) 
            ? mergedOptions.protocol 
            : [mergedOptions.protocol];
          
          Logger.Log(
            'Koatty', 
            '', 
            `Middleware ${key} limited to protocols: ${protocols.join(', ')}`
          );
          
          middleware = protocolMiddleware(protocols, result);
        }
        
        // Mount middleware
        if (middleware.length < 3) {
          this.app.use(middleware);
        } else {
          this.app.useExp(middleware);
        }
      }
    }
  }

  /**
   * Load and register controller classes from IOC container.
   * Each controller must implement the IController interface.
   * 
   * @returns {Promise<string[]>} A promise that resolves to an array of controller IDs.
   * @protected
   * @throws {Error} If a controller does not implement the IController interface.
   */
  protected async LoadControllers() {
    const controllerList = IOC.listClass("CONTROLLER");

    const controllers: string[] = [];
    controllerList.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("CONTROLLER:", "");
      if (item.id && Helper.isClass(item.target)) {
        Logger.Debug(`Load controller: ${item.id}`);
        // registering to IOC
        IOC.reg(item.id, item.target, { scope: "Prototype", type: "CONTROLLER", args: [] });
        const ctl = IOC.getInsByClass(item.target);
        if (!implementsControllerInterface(ctl)) {
          throw Error(`The controller ${item.id} must implements interface 'IController'.`);
        }
        controllers.push(item.id);
      }
    });
    this.app.setMetaData("_controllers", controllers);
    return controllers;
  }

  /**
   * Load and register service components into IOC container.
   * Each service must implement the IService interface.
   * Services are registered with singleton scope.
   * 
   * @protected
   * @returns {Promise<void>}
   * @throws {Error} When service does not implement IService interface
   */
  protected async LoadServices() {
    const serviceList = IOC.listClass("SERVICE");

    for (const item of serviceList) {
      item.id = (item.id ?? "").replace("SERVICE:", "");
      if (item.id && Helper.isClass(item.target)) {
        Logger.Debug(`Load service: ${item.id}`);
        // registering to IOC
        IOC.reg(item.id, item.target, { scope: "Singleton", type: "SERVICE", args: [] });
        const ctl = IOC.getInsByClass(item.target);
        if (!implementsServiceInterface(ctl)) {
          throw Error(`The service ${item.id} must implements interface 'IService'.`);
        }
      }
    }
  }

  /**
   * Load and initialize components, plugins and aspects.
   * Components with suffix 'Plugin' must implement IPlugin interface.
   * Components with suffix 'Aspect' must implement IAspect interface.
   * Plugins are loaded based on configuration and executed synchronously.
   * 
   * @protected
   * @returns {Promise<void>}
   * @throws {Error} When plugin/aspect doesn't implement required interface
   * @throws {Error} When plugin loading fails
   */
  protected async LoadComponents(componentManager?: ComponentManager) {
    const componentList = IOC.listClass("COMPONENT");

    componentList.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("COMPONENT:", "");
      if (Helper.isClass(item.target)) {
        IOC.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });

        if (item.id && (item.id).endsWith("Aspect")) {
          const ctl = IOC.getInsByClass(item.target);
          if (!implementsAspectInterface(ctl)) {
            throw Error(`The aspect ${item.id} must implements interface 'IAspect'.`);
          }
        }
      }
    });

    if (componentManager) {
      await componentManager.loadUserComponents();
    } else {
      Logger.Warn('Loading plugins in legacy mode');
      let pluginsConf = this.app.config(undefined, "plugin");
      if (Helper.isEmpty(pluginsConf)) {
        pluginsConf = { config: {}, list: [] };
      }
      const pluginConfList = pluginsConf.list ?? [];
      for (const key of pluginConfList) {
        const handle: IPlugin = IOC.get(key, "COMPONENT");
        if (!handle) {
          throw Error(`Plugin ${key} load error.`);
        }
        if (!Helper.isFunction(handle.run)) {
          throw Error(`Plugin ${key} must implements interface 'IPlugin'.`);
        }
        if (pluginsConf.config[key] === false) {
          Logger.Warn(`Plugin ${key} already loaded but not effective.`);
          continue;
        }

        await handle.run(pluginsConf.config[key] ?? {}, this.app);
      }
    }
  }


}


