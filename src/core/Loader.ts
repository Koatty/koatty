/*
 * @Description: framework loader
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 22:55:49
 * @LastEditTime: 2023-12-22 07:31:21
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import * as path from "path";
import { Load } from "koatty_loader";
import { prevent } from "koatty_exception";
import { LoadConfigs as loadConf } from "koatty_config";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { AppEvent, AppEventArr, EventHookFunc, Koatty } from 'koatty_core';
import { TraceHandler } from "./Trace";
import { checkClass, Helper } from "../util/Helper";
import { BaseController } from "../component/BaseController";
import { Logger, LogLevelType, SetLogger } from "../util/Logger";
import { IMiddleware, IPlugin } from '../component/Components';
import { COMPONENT_SCAN, CONFIGURATION_SCAN } from './Constants';

/**
 *
 *
 * @interface ComponentItem
 */
interface ComponentItem {
  id: string;
  target: any;
}

/**
 * 
 */
export class Loader {

  /**
   * initialize env
   *
   * @static
   * @param {Koatty} app
   * @memberof Loader
   */
  public static initialize(app: Koatty) {
    const env = (process.execArgv ?? []).join(",");
    if (env.indexOf('ts-node') > -1 || env.indexOf('--debug') > -1) {
      app.appDebug = true;
    }
    // app.env
    app.env = process.env.KOATTY_ENV || process.env.NODE_ENV;
    if ((env.indexOf('--production') > -1) || ((app.env ?? '').indexOf('pro') > -1)) {
      app.appDebug = false;
    }

    if (app.appDebug) {
      app.env = 'development';
      process.env.NODE_ENV = 'development';
      process.env.APP_DEBUG = 'true';
      Logger.setLevel("debug");
    } else {
      app.env = 'production';
      process.env.NODE_ENV = 'production';
      Logger.setLevel("info");
    }

    // define path
    const rootPath = app.rootPath || process.cwd();
    const appPath = app.appPath || path.resolve(rootPath, env.indexOf('ts-node') > -1 ? 'src' : 'dist');
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
    Helper.define(app, 'prevent', prevent);
    Helper.define(app, 'thinkPath', koattyPath);
    process.env.THINK_PATH = koattyPath;

  }

  /**
   * Get component metadata
   *
   * @static
   * @param {Koatty} app
   * @param {*} target
   * @returns {*}  {any[]}
   * @memberof Loader
   */
  public static GetComponentMetas(app: Koatty, target: any): any[] {
    let componentMetas = [];
    const componentMeta = IOCContainer.getClassMetadata(TAGGED_CLS, COMPONENT_SCAN, target);
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
   * Load all bean, excepted config/*、App.ts
   *
   * @static
   * @param {Koatty} app
   * @param {*} target
   * @memberof Loader
   */
  public static CheckAllComponents(app: Koatty, target: any) {
    // component metadata
    const componentMetas = Loader.GetComponentMetas(app, target);
    // configuration metadata
    const configurationMetas = Loader.GetConfigurationMetas(app, target);
    const exSet = new Set();
    Load(componentMetas, '', (fileName: string, xpath: string, xTarget: any) => {
      checkClass(fileName, xpath, xTarget, exSet);
    }, ['**/**.js', '**/**.ts', '!**/**.d.ts'], [...configurationMetas, `${target.name || '.no'}.ts`]);
    exSet.clear();
  }

  /**
   * Get configuration metadata
   *
   * @static
   * @param {Koatty} app
   * @param {*} target
   * @returns {*}  {any[]}
   * @memberof Loader
   */
  public static GetConfigurationMetas(app: Koatty, target: any): any[] {
    const confMeta = IOCContainer.getClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, target);
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
   * Set Logger level
   *
   * @static
   * @param {Koatty} app
   * @memberof Loader
   */
  public static SetLogger(app: Koatty) {
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
      if (opt.logs_level) {
        logLevel = (opt.logs_level).toLowerCase();
      }
      if (opt.logs_path) {
        logFilePath = opt.logs_path;
      }
      if (opt.sens_fields) {
        sensFields = opt.sens_fields;
      }
      SetLogger(app, { logLevel, logFilePath, sensFields });
    }
  }


  /**
   * Load app event hook funcs
   *
   * @static
   * @param {Koatty} app
   * @param {*} target
   * @memberof Loader
   */
  public static LoadAppEventHooks(app: Koatty, target: any) {
    const eventFuncs: Map<string, EventHookFunc[]> = new Map();
    for (const event of AppEventArr) {
      let funcs: unknown;
      switch (event) {
        case AppEvent.appBoot:
          funcs = IOCContainer.getClassMetadata(TAGGED_CLS, AppEvent.appBoot, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appBoot, funcs);
          }
          break;
        case AppEvent.appReady:
          funcs = IOCContainer.getClassMetadata(TAGGED_CLS, AppEvent.appReady, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appReady, funcs);
          }
          break;
        case AppEvent.appStart:
          funcs = IOCContainer.getClassMetadata(TAGGED_CLS, AppEvent.appStart, target);
          if (Helper.isArray(funcs)) {
            eventFuncs.set(AppEvent.appStart, funcs);
          }
          break;
        case AppEvent.appStop:
          funcs = IOCContainer.getClassMetadata(TAGGED_CLS, AppEvent.appStop, target);
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
   * Load configuration
   *
   * @static
   * @param {Koatty} app
   * @param {string[]} [loadPath]
   * @memberof Loader
   */
  public static LoadConfigs(app: Koatty, loadPath?: string[]) {
    const frameConfig: any = {};
    // Logger.Debug(`Load configuration path: ${app.thinkPath}/config`);
    Load(["./config"], app.koattyPath, function (name: string, path: string, exp: any) {
      frameConfig[name] = exp;
    });

    if (Helper.isArray(loadPath)) {
      loadPath = loadPath.length > 0 ? loadPath : ["./config"];
    }
    let appConfig = loadConf(loadPath, app.appPath);
    appConfig = Helper.extend(frameConfig, appConfig, true);

    app.setMetaData("_configs", appConfig);
  }

  /**
   * Load middlewares
   * [async]
   * @static
   * @param {*} app
   * @param {(string | string[])} [loadPath]
   * @memberof Loader
   */
  public static async LoadMiddlewares(app: Koatty, loadPath?: string[]) {
    // Error handling middleware
    await TraceHandler(app);

    let middlewareConf = app.config(undefined, "middleware");
    if (Helper.isEmpty(middlewareConf)) {
      middlewareConf = { config: {}, list: [] };
    }

    //Mount default middleware
    // Load(loadPath || ["./middleware"], app.koattyPath);
    //Mount application middleware
    // const middleware: any = {};
    const appMiddleware = IOCContainer.listClass("MIDDLEWARE") ?? [];
    appMiddleware.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("MIDDLEWARE:", "");
      if (item.id && Helper.isClass(item.target)) {
        IOCContainer.reg(item.id, item.target, { scope: "Prototype", type: "MIDDLEWARE", args: [] });
      }
    });

    const middlewareConfList = middlewareConf.list;
    //de-duplication
    const appMList = new Set([]);
    middlewareConfList.forEach((item: string) => {
      appMList.add(item);
    });

    //Automatically call middleware
    for (const key of appMList) {
      const handle: IMiddleware = IOCContainer.get(key, "MIDDLEWARE");
      if (!handle) {
        throw Error(`Middleware ${key} load error.`);
      }
      if (!Helper.isFunction(handle.run)) {
        throw Error(`The middleware ${key} must implements interface 'IMiddleware'.`);
      }
      if (middlewareConf.config[key] === false) {
        Logger.Warn(`The middleware ${key} has been loaded but not executed.`);
        continue;
      }
      Logger.Debug(`Load middleware: ${key}`);
      const result = await handle.run(middlewareConf.config[key] || {}, app);
      if (Helper.isFunction(result)) {
        if (result.length < 3) {
          app.use(result);
        } else {
          app.useExp(result);
        }
      }
    }
  }

  /**
   * Load controllers
   *
   * @static
   * @param {*} app
   * @memberof Loader
   */
  public static LoadControllers(app: Koatty) {
    const controllerList = IOCContainer.listClass("CONTROLLER");

    const controllers: string[] = [];
    controllerList.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("CONTROLLER:", "");
      if (item.id && Helper.isClass(item.target)) {
        Logger.Debug(`Load controller: ${item.id}`);
        // registering to IOC
        IOCContainer.reg(item.id, item.target, { scope: "Prototype", type: "CONTROLLER", args: [] });
        const ctl = IOCContainer.getInsByClass(item.target);
        if (!(ctl instanceof BaseController)) {
          throw Error(`Controller class ${item.id} does not inherit from BaseController`);
        }
        controllers.push(item.id);
      }
    });

    return controllers;
  }

  /**
   * Load services
   *
   * @static
   * @param {*} app
   * @memberof Loader
   */
  public static LoadServices(app: Koatty) {
    const serviceList = IOCContainer.listClass("SERVICE");

    serviceList.forEach((item: ComponentItem) => {
      item.id = (item.id ?? "").replace("SERVICE:", "");
      if (item.id && Helper.isClass(item.target)) {
        Logger.Debug(`Load service: ${item.id}`);
        // registering to IOC
        IOCContainer.reg(item.id, item.target, { scope: "Singleton", type: "SERVICE", args: [] });
      }
    });
  }

  /**
   * Load components
   *
   * @static
   * @param {*} app
   * @memberof Loader
   */
  // public static LoadComponents(app: Koatty) {
  //   const componentList = IOCContainer.listClass("COMPONENT");

  //   componentList.forEach((item: ComponentItem) => {
  //     item.id = (item.id ?? "").replace("COMPONENT:", "");
  //     if (item.id && !(item.id).endsWith("Plugin") && Helper.isClass(item.target)) {
  //       Logger.Debug(`Load component: ${item.id}`);
  //       // registering to IOC
  //       IOCContainer.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
  //     }
  //   });
  // }

  /**
   * Load components
   *
   * @static
   * @param {*} app
   * @memberof Loader
   */
  public static async LoadComponents(app: Koatty) {
    const componentList = IOCContainer.listClass("COMPONENT");

    const pluginList = [];
    componentList.forEach(async (item: ComponentItem) => {
      item.id = (item.id ?? "").replace("COMPONENT:", "");
      if (Helper.isClass(item.target)) {
        if (item.id && (item.id).endsWith("Plugin")) {
          pluginList.push(item.id);
        }
        // registering to IOC
        IOCContainer.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
      }
    });
    // load plugin config
    let pluginsConf = app.config(undefined, "plugin");
    if (Helper.isEmpty(pluginsConf)) {
      pluginsConf = { config: {}, list: [] };
    }
    const pluginConfList = pluginsConf.list ?? [];
    // load plugin list
    for (const key of pluginConfList) {
      const handle: IPlugin = IOCContainer.get(key, "COMPONENT");
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
      await handle.run(pluginsConf.config[key] ?? {}, app);
    }
  }
}


