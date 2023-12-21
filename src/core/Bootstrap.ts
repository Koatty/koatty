/*
 * @Description: framework bootstrap
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-22 07:31:53
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import EventEmitter from "events";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { AppEvent, EventHookFunc, Koatty } from 'koatty_core';
import { BindProcessEvent, NewRouter, NewServe } from "koatty_serve";
import { Loader } from "./Loader";
import { Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";
import { checkRuntime, checkUTRuntime, KOATTY_VERSION } from "../util/Check";

/**
 * execute bootstrap
 *
 * @param {*} target
 * @param {Function} bootFunc
 * @param {boolean} [isInitiative=false] Whether to actively execute app instantiation, 
 * mainly for unittest scenarios, you need to actively obtain app instances
 * @returns {Promise<void>}
 */
const executeBootstrap = async function (target: any, bootFunc: Function, isInitiative = false): Promise<Koatty> {
  // checked runtime
  checkRuntime();
  // unittest running environment
  const isUTRuntime = checkUTRuntime();
  if (!isInitiative && isUTRuntime) {
    return;
  }

  const app = <Koatty>Reflect.construct(target, []);
  // unittest does not print startup logs
  if (isUTRuntime) {
    app.silent = true;
    Logger.enable(false);
  }

  try {
    !app.silent && Logger.Log("Koatty", LOGO);
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

    // Set IOCContainer.app
    IOCContainer.setApp(app);

    Logger.Log('Koatty', '', 'ComponentScan ...');

    // Check all bean
    Loader.CheckAllComponents(app, target);

    // Load configuration
    Logger.Log('Koatty', '', 'Load Configurations ...');
    // configuration metadata
    const configurationMetas = Loader.GetConfigurationMetas(app, target);
    Loader.LoadConfigs(app, configurationMetas);

    // Load App event hooks
    Loader.LoadAppEventHooks(app, target);
    Logger.Log('Koatty', '', 'Emit App Boot ...');
    await asyncEvent(app, AppEvent.appBoot);

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

    // Create Server
    // app.server = newServe(app);
    Helper.define(app, "server", NewServe(app));
    // Create router
    // app.router = newRouter(app);
    Helper.define(app, "router", NewRouter(app));

    // Emit app ready event
    Logger.Log('Koatty', '', 'Emit App Ready ...');
    await asyncEvent(app, AppEvent.appReady);

    // Load Routers
    Logger.Log('Koatty', '', 'Load Routers ...');
    app.router.LoadRouter(controllers);

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
const listenCallback = (app: Koatty) => {
  const options = app.server.options;

  Logger.Log('Koatty', '', '====================================');
  Logger.Log("Koatty", "", `Nodejs Version: ${process.version}`);
  Logger.Log("Koatty", "", `Koatty Version: v${KOATTY_VERSION}`);
  Logger.Log("Koatty", "", `App Environment: ${app.env}`);
  Logger.Log('Koatty', '', `Server Protocol: ${(options.protocol).toUpperCase()}`);
  Logger.Log("Koatty", "", `Server running at ${options.protocol === "http2" ? "https" : options.protocol}://${options.hostname || '127.0.0.1'}:${options.port}/`);
  Logger.Log("Koatty", "", "====================================");

  // binding event "appStop"
  Logger.Log('Koatty', '', 'Bind App Stop event ...');
  BindProcessEvent(app, 'appStop');
  // tslint:disable-next-line: no-unused-expression
  app.appDebug && Logger.Warn(`Running in debug mode.`);
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
    IOCContainer.saveClassMetadata(TAGGED_CLS, COMPONENT_SCAN, scanPath, target);
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
    IOCContainer.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
  };
}

/**
 * @description: bind App event hook func
 * example:
 * export function TestDecorator(): ClassDecorator {
 *  return (target: Function) => {
 *   BindEventHook(AppEvent.appBoot, (app: Koatty) => {
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
  IOCContainer.attachClassMetadata(TAGGED_CLS, eventName, eventFunc, target);
}