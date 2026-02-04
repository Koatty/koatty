/*
 * @Description: framework bootstrap
 * @Usage: 
 * @Author: richen
 * @Date: 2021-12-09 21:56:32
 * @LastEditTime: 2025-01-14 16:11:21
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
import { IOC } from "koatty_container";
import { AppEvent, Koatty, KoattyApplication, asyncEvent } from 'koatty_core';
import { Helper } from "koatty_lib";
import { checkRuntime, checkUTRuntime, KOATTY_VERSION } from "../util/Helper";
import { LOGO } from "./Constants";
import { Loader } from "./Loader";
import { DefaultLogger as Logger } from "koatty_logger";

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
 * Bind event hook to target class.
 * 
 * @param eventName - The application event name to bind
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
  // Disable winston internal debug logs
  // Filter out winston from NODE_DEBUG to prevent internal logging
  if (process.env.NODE_DEBUG) {
    const debugModules = process.env.NODE_DEBUG.split(',')
      .filter(m => !m.includes('winston'))
      .join(',');
    process.env.NODE_DEBUG = debugModules;
  }
  
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

    // Load All components
    await Loader.LoadAllComponents(app, target);

    if (!isUTRuntime) {
      app.listen(listenCallback);
    }

    return app;
  } catch (err) {
    Logger.Fatal(err);
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
  Logger.Log('Koatty', '', '====================================');
  
  // Trigger appStart event after server starts listening
  // Listeners are registered via app.once in LoadAppEventHooks
  asyncEvent(app, AppEvent.appStart);
};
