/*
 * @Description: framework bootstrap
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-09 21:56:32
 * @LastEditTime: 2024-11-11 18:51:13
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import EventEmitter from "events";
import { IOC, TAGGED_CLS } from "koatty_container";
import { AppEvent, EventHookFunc, Koatty, KoattyApplication, KoattyServer } from 'koatty_core';
import { NewRouter } from "koatty_router";
import { NewServe } from "koatty_serve";
import { checkRuntime, checkUTRuntime, KOATTY_VERSION } from "../util/Check";
import { Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";
import { Loader } from "./Loader";

/**
 * execute bootstrap
 *
 * @param {*} target
 * @param {Function} bootFunc
 * @param {boolean} [isInitiative=false] Whether to actively execute app instantiation, 
 * mainly for unittest scenarios, you need to actively obtain app instances
 * @returns {Promise<void>}
 */
const executeBootstrap = async function (target: any, bootFunc: Function, isInitiative = false): Promise<KoattyApplication> {
  // checked runtime
  checkRuntime();
  // unittest running environment
  const isUTRuntime = checkUTRuntime();
  if (!isInitiative && isUTRuntime) {
    return;
  }

  const app = <KoattyApplication>Reflect.construct(target, []);
  // unittest does not print startup logs
  if (isUTRuntime) {
    app.silent = true;
    Logger.enable(false);
  }

  try {
    if (!app.silent) Logger.Log("Koatty", LOGO);
    if (!(app instanceof Koatty)) {
      throw new Error(`class ${target.name} does not inherit from Koatty`);
    }

    // Initialize env
    Loader.initialize(app);

    // exec bootFunc
    if (Helper.isFunction(bootFunc)) {
      Logger.Log('Koatty', '', 'Execute bootFunc ...');
      await bootFunc(app);
    }

    // Set IOC.app
    IOC.setApp(app);

    Logger.Log('Koatty', '', 'ComponentScan ...');

    // Check all bean
    Loader.CheckAllComponents(app, target);

    // Load configuration
    Logger.Log('Koatty', '', 'Load Configurations ...');
    // configuration metadata
    const configurationMeta = Loader.GetConfigurationMeta(app, target);
    Loader.LoadConfigs(app, configurationMeta);

    // Load App event hooks
    Loader.LoadAppEventHooks(app, target);
    Logger.Log('Koatty', '', 'Emit App Boot ...');
    await asyncEvent(app, AppEvent.appBoot);

    // Create Server
    // app.server = newServe(app);
    Helper.define(app, "server", NewServe(app));
    // Create router
    // app.router = newRouter(app);
    Helper.define(app, "router", NewRouter(app));
    // Load Components
    Logger.Log('Koatty', '', 'Load Components ...');
    await Loader.LoadComponents(app);
    // Load Middleware
    Logger.Log('Koatty', '', 'Load Middlewares ...');
    await Loader.LoadMiddlewares(app);
    // Load Services
    Logger.Log('Koatty', '', 'Load Services ...');
    Loader.LoadServices(app);
    // Load Controllers
    Logger.Log('Koatty', '', 'Load Controllers ...');
    const controllers = Loader.LoadControllers(app);

    // Emit app ready event
    Logger.Log('Koatty', '', 'Emit App Ready ...');
    await asyncEvent(app, AppEvent.appReady);

    // Load Routers
    Logger.Log('Koatty', '', 'Load Routers ...');
    app.router.LoadRouter(app, controllers);

    if (!isUTRuntime) {
      // Start Server
      app.listen(listenCallback);
    }

    return app;
  } catch (err) {
    Logger.Error(err);
    process.exit();
  }
};

/**
 * Listening callback function
 *
 * @param {Koatty} app
 * @returns {*} 
 */
const listenCallback = (app: KoattyApplication) => {
  let servers: KoattyServer[] = [];
  if (!Array.isArray(app.server)) {
    servers = [app.server];
  } else {
    servers = app.server;
  }
  Logger.Log('Koatty', '', '====================================');
  Logger.Log("Koatty", "", `Nodejs Version: ${process.version}`);
  Logger.Log("Koatty", "", `Koatty Version: v${KOATTY_VERSION}`);
  Logger.Log("Koatty", "", `App Environment: ${app.env}`);
  servers.forEach(s => {
    Logger.Log('Koatty', '', `Server: ${(s.options.protocol).toUpperCase()} running at ${s.options.protocol === "http2" ?
      "https" : s.options.protocol}://${s.options.hostname || '127.0.0.1'}:${s.options.port}/`);
  });

  Logger.Log("Koatty", "", "====================================");

  if (app.appDebug) Logger.Warn(`Running in debug mode.`);
  // Set Logger
  Loader.SetLogger(app);
};

/**
 * Execute event as async
 *
 * @param {Koatty} event
 * @param {string} eventName
 */
const asyncEvent = async function (event: EventEmitter, eventName: string) {
  const ls: any[] = event.listeners(eventName);
  // eslint-disable-next-line no-restricted-syntax
  for await (const func of ls) {
    if (Helper.isFunction(func)) {
      func();
    }
  }
  return event.removeAllListeners(eventName);
};

/**
 * Bootstrap application
 *
 * @export
 * @param {Function} [bootFunc]
 * @returns {ClassDecorator}
 */
export function Bootstrap(bootFunc?: Function): ClassDecorator {
  return function (target: any) {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    executeBootstrap(target, bootFunc);
  };
}

/**
 * Actively perform dependency injection
 * Parse the decorator, return the instantiated app. 
 * @export  ExecBootStrap
 * @param {Function} [bootFunc] callback function
 * @returns
 */
export function ExecBootStrap(bootFunc?: Function) {
  return async (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class ${target.name} does not inherit from Koatty`);
    }
    return await executeBootstrap(target, bootFunc, true);
  };
}

/**
 * Define project scan path
 *
 * @export
 * @param {(string | string[])} [scanPath]
 * @returns {ClassDecorator}
 */
export function ComponentScan(scanPath?: string | string[]): ClassDecorator {
  return (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    scanPath = scanPath ?? '';
    IOC.saveClassMetadata(TAGGED_CLS, COMPONENT_SCAN, scanPath, target);
  };
}

/**
 * Define project configuration scan path
 *
 * @export
 * @param {(string | string[])} [scanPath]
 * @returns {ClassDecorator}
 */
export function ConfigurationScan(scanPath?: string | string[]): ClassDecorator {
  return (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    scanPath = scanPath ?? '';
    IOC.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
  };
}

/**
 * @description: bind App event hook func
 * example:
 * export function TestDecorator(): ClassDecorator {
 *  return (target: Function) => {
 *   BindEventHook(AppEvent.appBoot, (app: KoattyApplication) => {
 *      // todo
 *      return Promise.resolve();
 *   }, target)   
 *  }
 * }
 * @param {AppEvent} eventName
 * @param {EventHookFunc} eventFunc
 * @param {any} target
 * @return {*}
 */
export function BindEventHook(eventName: AppEvent, eventFunc: EventHookFunc, target: any) {
  IOC.attachClassMetadata(TAGGED_CLS, eventName, eventFunc, target);
}