/*
 * @Description: framework bootstrap
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-09 21:56:32
 * @LastEditTime: 2025-01-14 16:11:21
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { IOC, TAGGED_CLS } from "koatty_container";
import { AppEvent, EventHookFunc, Koatty, KoattyApplication, asyncEvent } from 'koatty_core';
import { Helper } from "koatty_lib";
import { checkRuntime, checkUTRuntime, KOATTY_VERSION } from "../util/Helper";
import { Logger } from "../util/Logger";
import { COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";
import { Loader } from "./Loader";

/**
 * Bootstrap decorator for Koatty application class.
 * 
 * @param bootFunc Optional function to execute during bootstrap process
 * @returns ClassDecorator
 * @throws Error if target class does not inherit from Koatty
 * 
 * @example
 * ```ts
 * @Bootstrap()
 * export class App extends Koatty {
 *   // ...
 * }
 * ```
 */
export function Bootstrap(bootFunc?: (...args: any[]) => any): ClassDecorator {
  return function (target: any) {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class does not inherit from Koatty`);
    }
    executeBootstrap(target, bootFunc);
    return target;
  };
}

/**
 * Decorator function for bootstrapping a Koatty application.
 * 
 * @param bootFunc Optional function to be executed during bootstrap process
 * @returns A decorator function that validates and executes the bootstrap process
 * @throws Error if the target class does not inherit from Koatty
 * 
 * @example
 * ```typescript
 * app = await ExecBootStrap()(App);
 * ```
 */
export function ExecBootStrap(bootFunc?: (...args: any[]) => any) {
  return async (target: any) => {
    if (!(target.prototype instanceof Koatty)) {
      throw new Error(`class ${target.name} does not inherit from Koatty`);
    }
    return await executeBootstrap(target, bootFunc, true);
  };
}

/**
 * Component scan decorator for Koatty application.
 * Scans the specified path(s) for components and registers them in the IOC container.
 * 
 * @param {string | string[]} [scanPath] - The path or array of paths to scan for components
 * @returns {ClassDecorator} A class decorator that enables component scanning
 * @throws {Error} If the decorated class does not inherit from Koatty
 * @example
 * ```typescript
 * @ComponentScan()
 * export class App extends Koatty {
 *   // ...
 * }
 * ```
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
 * Configuration scan decorator, used to scan and load configuration files.
 * 
 * @param scanPath - The path or array of paths to scan for configuration files. If not provided, defaults to empty string.
 * @returns A class decorator function that registers configuration scan metadata.
 * @throws Error if the decorated class does not inherit from Koatty.
 * @example
 * ```typescript
 * @ConfigurationScan()
 * export class App extends Koatty {
 *   // ...
 * }
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
 * Bind event hook to target class.
 * 
 * @param eventName - The application event name to bind
 * @param eventFunc - The event hook function to be executed
 * @param target - The target class to bind the event hook
 * @returns {*}
 * @throws Error if the decorated class does not inherit from Koatty.
 * @example
 * ```typescript
 * export function TestDecorator(): ClassDecorator {
 *   return (target: Function) => {
 *     BindEventHook(AppEvent.appBoot, (app: KoattyApplication) => {
 *      // todo
 *      return Promise.resolve();
 *   }, target)   
 *  }
 * }
 */
export function BindEventHook(eventName: AppEvent, eventFunc: EventHookFunc, target: any) {
  IOC.attachClassMetadata(TAGGED_CLS, eventName, eventFunc, target);
}

/**
 * Execute bootstrap process for Koatty application.
 * 
 * @param target - The target class to instantiate the application
 * @param bootFunc - Function to execute during bootstrap process
 * @param isInitiative - Whether the bootstrap is initiated manually
 * @returns Promise<KoattyApplication> The bootstrapped application instance
 * 
 * This function performs the following steps:
 * 1. Checks runtime environment
 * 2. Creates application instance
 * 3. Initializes environment
 * 4. Executes boot function
 * 5. Sets up IOC container
 * 6. Scans and loads components
 * 7. Triggers application events
 * 8. Starts server (except in test environment)
 */
const executeBootstrap = async function (target: any, bootFunc?: (...args: any[]) => any,
  isInitiative = false): Promise<KoattyApplication> {
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
    if (!app.silent) console.log(LOGO);
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

    // Check all bean
    Logger.Log('Koatty', '', 'ComponentScan ...');
    Loader.CheckAllComponents(app, target);

    // Load App event hooks
    Loader.LoadAppEventHooks(app, target);
    Logger.Log('Koatty', '', 'Emit App Boot ...');
    await asyncEvent(app, AppEvent.appBoot);

    // Load All components
    await Loader.LoadAllComponents(app, target);

    // Emit app ready event
    Logger.Log('Koatty', '', 'Emit App Ready ...');
    await asyncEvent(app, AppEvent.appReady);

    if (!isUTRuntime) {
      Logger.Log('Koatty', '', 'Emit Before Server Start ...');
      await asyncEvent(app, AppEvent.beforeServerStart);

      app.listen(listenCallback);

      Logger.Log('Koatty', '', 'Emit After Server Start ...');
      await asyncEvent(app, AppEvent.afterServerStart);
    }

    return app;
  } catch (err) {
    Logger.Fatal(err);
    process.exit(1);
  }
};

/**
 * Server listen callback function.
 * Print server information and initialize logger settings.
 * 
 * @param {KoattyApplication} app - The Koatty application instance
 * @returns {void}
 * 
 * @internal
 */
const listenCallback = (app: KoattyApplication) => {
  Logger.Log('Koatty', '', '====================================');
  Logger.Log("Koatty", "", `Nodejs Version: ${process.version}`);
  Logger.Log("Koatty", "", `Koatty Version: v${KOATTY_VERSION}`);
  Logger.Log("Koatty", "", `App Environment: ${app.env}`);
  if (app.appDebug) Logger.Warn(`Running in debug mode.`);
  Logger.Log("Koatty", "", "====================================");
};