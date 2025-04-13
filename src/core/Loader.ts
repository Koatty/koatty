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
  AppEvent, AppEventArr, EventHookFunc, IMiddleware, implementsAspectInterface,
  implementsControllerInterface, implementsMiddlewareInterface,
  implementsPluginInterface, implementsServiceInterface, IPlugin,
  KoattyApplication, parseExp
} from 'koatty_core';
import { Helper } from "koatty_lib";
import { Load } from "koatty_loader";
import { NewRouter } from "koatty_router";
import { NewServe } from "koatty_serve";
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
   * @description
   * - Sets logging level based on environment
   * - Defines root, app and framework paths
   * - Loads application name and version from package.json
   * - Sets environment variables for paths
   * - Maintains backward compatibility with legacy path variables
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
   * Load application event hooks from target class.
   * Register event handlers for application lifecycle events (boot, ready, start, stop).
   * 
   * @param app KoattyApplication instance
   * @param target Target class to load event hooks from
   * @static
   */
  public static LoadAppEventHooks(app: KoattyApplication, target: any) {
    const eventFuncs: Map<string, EventHookFunc[]> = new Map();
    for (const event of AppEventArr) {
      let funcs: unknown;
      switch (event) {
        case AppEvent.appBoot:
          funcs = IOC.getClassMetadata(TAGGED_CLS, AppEvent.appBoot, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appBoot, funcs);
          }
          break;
        case AppEvent.appReady:
          funcs = IOC.getClassMetadata(TAGGED_CLS, AppEvent.appReady, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appReady, funcs);
          }
          break;
        case AppEvent.appStart:
          funcs = IOC.getClassMetadata(TAGGED_CLS, AppEvent.appStart, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appStart, funcs);
          }
          break;
        case AppEvent.appStop:
          funcs = IOC.getClassMetadata(TAGGED_CLS, AppEvent.appStop, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appStop, funcs);
          }
          break;
        default:
          break;
      }
    }
    // loop event emit
    for (const [event, funcs] of eventFuncs) {
      for (const func of funcs) {
        app.once(event, () => func(app));
      }
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
    // Load configuration
    Logger.Log('Koatty', '', 'Load Configurations ...');
    // configuration metadata
    const configurationMeta = Loader.GetConfigurationMeta(app, target);
    const loader = new Loader(app);
    loader.LoadConfigs(configurationMeta);

    // Create Server
    const serveOpts = app.config('server') ?? { protocol: "http" };
    const protocol = serveOpts.protocol ?? "http";
    Helper.define(app, "server", NewServe(app, serveOpts));
    // Create router 
    const routerOpts = app.config(undefined, 'router') ?? {};
    Helper.define(app, "router", NewRouter(app, { protocol, ...routerOpts }));

    // Load Components
    Logger.Log('Koatty', '', 'Load Components ...');
    await loader.LoadComponents();
    // Load Middleware
    Logger.Log('Koatty', '', 'Load Middlewares ...');
    await loader.LoadMiddlewares();
    // Load Services
    Logger.Log('Koatty', '', 'Load Services ...');
    await loader.LoadServices();
    // Load Controllers
    Logger.Log('Koatty', '', 'Load Controllers ...');
    const controllers = await loader.LoadControllers();

    // Load Routers
    Logger.Log('Koatty', '', 'Load Routers ...');
    loader.LoadRouter(controllers);
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
   * 
   * @protected
   * @returns {Promise<void>}
   * @throws {Error} When middleware doesn't implement IMiddleware interface
   * @throws {Error} When middleware loading fails
   */
  protected async LoadMiddlewares() {
    let middlewareConf = this.app.config(undefined, "middleware");
    if (Helper.isEmpty(middlewareConf)) {
      middlewareConf = { config: {}, list: [], routeList: [] };
    }

    //Mount default middleware
    // Load(loadPath || ["./middleware"], app.koattyPath);
    //Mount application middleware
    // const middleware: any = {};
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
    const middlewareRouterList = middlewareConf.routeList || [];
    const routerRList = new Set([]);
    middlewareRouterList.forEach((item: string) => {
      routerRList.add(item);
    });

    //Automatically call middleware
    const middlewareConfig = middlewareConf.config || {};
    for (const key of appMList) {
      const handle: IMiddleware = IOC.get(key, "MIDDLEWARE");
      if (!handle) {
        throw Error(`Middleware ${key} load error.`);
      }
      if (!Helper.isFunction(handle.run)) {
        throw Error(`The middleware ${key} must implements interface 'IMiddleware'.`);
      }
      // if (middlewareConfig[key] === false) {
      //   Logger.Warn(`The middleware ${key} has been loaded but will not be executed.`);
      //   continue;
      // }
      Logger.Debug(`Load middleware: ${key}`);
      const middlewareOpt = middlewareConfig[key] || {};
      const result = await handle.run(middlewareOpt, this.app);
      if (Helper.isFunction(result)) {
        if (result.length < 3) {
          this.app.use(result);
        } else {
          this.app.useExp(result);
        }
      }
    }

    // Automatically call router middleware
    for (const key of routerRList) {
      const handle: IMiddleware = IOC.get(key, "MIDDLEWARE");
      if (!handle) {
        throw Error(`Router middleware ${key} load error.`);
      }
      if (!Helper.isFunction(handle.run)) {
        throw Error(`The router middleware ${key} must implements interface 'IMiddleware'.`);
      }
      // if (middlewareConfig[key] === false) {
      //   Logger.Warn(`The router middleware ${key} has been loaded but will not be executed.`);
      //   continue;
      // }
      Logger.Debug(`Load router middleware: ${key}`);
      const result = await handle.run(middlewareConfig[key] || {}, this.app);
      if (Helper.isFunction(result)) {
        this.app.setMetaData(`routerMiddleware_${key}`, result.length > 2 ? parseExp(result) : result);
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

    serviceList.forEach((item: ComponentItem) => {
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
    });
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
  protected async LoadComponents() {
    const componentList = IOC.listClass("COMPONENT");

    const pluginList = [];
    componentList.forEach(async (item: ComponentItem) => {
      item.id = (item.id ?? "").replace("COMPONENT:", "");
      if (Helper.isClass(item.target)) {
        // registering to IOC
        IOC.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
        if (item.id && (item.id).endsWith("Plugin")) {
          const ctl = IOC.getInsByClass(item.target);
          if (!implementsPluginInterface(ctl)) {
            throw Error(`The plugin ${item.id} must implements interface 'IPlugin'.`);
          }
          pluginList.push(item.id);
        }
        if (item.id && (item.id).endsWith("Aspect")) {
          const ctl = IOC.getInsByClass(item.target);
          if (!implementsAspectInterface(ctl)) {
            throw Error(`The aspect ${item.id} must implements interface 'IAspect'.`);
          }
        }
      }
    });
    // load plugin config
    let pluginsConf = this.app.config(undefined, "plugin");
    if (Helper.isEmpty(pluginsConf)) {
      pluginsConf = { config: {}, list: [] };
    }
    const pluginConfList = pluginsConf.list ?? [];
    // load plugin list
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

      // sync exec 
      await handle.run(pluginsConf.config[key] ?? {}, this.app);
    }
  }

  /**
   * Load router configuration from controller files.
   * @param ctls Array of controller file paths to be loaded
   * @protected
   */
  protected async LoadRouter(ctls: string[]) {
    // load router
    await this.app.router.LoadRouter(this.app, ctls);
  }
}


