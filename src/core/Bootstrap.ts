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
 * Core bootstrap logic: initialize application, load all components, mark as ready.
 * Does NOT call app.listen() — caller decides how to start the server.
 *
 * @param target - The target class to instantiate the application
 * @param bootFunc - Optional function to execute during bootstrap process
 * @param isInitiative - Whether the bootstrap is initiated manually
 * @returns Promise<KoattyApplication> The fully initialized (but not listening) application instance
 *
 * @internal
 */
const bootstrapApplication = async function (target: any, bootFunc?: (...args: any[]) => any,
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

  // Mark application as ready (all components loaded, middleware registered)
  app.markReady();

  return app;
};

/**
 * Execute bootstrap process for Koatty application (traditional server mode).
 * Calls bootstrapApplication() for initialization, then starts the server.
 *
 * @param target - The target class to instantiate the application
 * @param bootFunc - Optional function to execute during bootstrap process
 * @param isInitiative - Whether the bootstrap is initiated manually
 * @returns Promise<KoattyApplication> The bootstrapped application instance
 */
const executeBootstrap = async function (target: any, bootFunc?: (...args: any[]) => any,
  isInitiative = false): Promise<KoattyApplication> {
  try {
    const app = await bootstrapApplication(target, bootFunc, isInitiative);
    if (!app) return; // e.g. UT runtime + not initiative

    // Start listening (traditional server mode)
    const isUTRuntime = checkUTRuntime();
    if (!isUTRuntime) {
      app.listen(listenCallback);
    }

    return app;
  } catch (err) {
    Logger.Fatal(err);
  }
};

/**
 * Create a fully initialized Koatty application WITHOUT starting a server.
 *
 * Use this for:
 * - Serverless deployment (AWS Lambda, Alibaba Cloud FC, Tencent SCF, etc.)
 * - Custom server setup (attach handler to an existing HTTP server)
 * - Testing (use app.getRequestHandler() with supertest)
 *
 * @param target - The Koatty application class decorated with @Bootstrap()
 * @param bootFunc - Optional function to execute during bootstrap process
 * @returns Promise<KoattyApplication> A ready application instance (not listening)
 *
 * @example
 * ```typescript
 * // Serverless entry point
 * import { createApplication } from 'koatty';
 * import { App } from './App';
 *
 * let cachedApp: KoattyApplication;
 *
 * export async function handler(req, res) {
 *   if (!cachedApp) {
 *     cachedApp = await createApplication(App);
 *   }
 *   return cachedApp.getRequestHandler()(req, res);
 * }
 *
 * // Custom HTTP server
 * import http from 'http';
 * const app = await createApplication(App);
 * http.createServer(app.getRequestHandler()).listen(3000);
 * ```
 */
export async function createApplication(
  target: any,
  bootFunc?: (...args: any[]) => any,
): Promise<KoattyApplication> {
  if (!(target.prototype instanceof Koatty)) {
    throw new Error(`class ${target.name} does not inherit from Koatty`);
  }
  const app = await bootstrapApplication(target, bootFunc, true);
  if (!app) {
    throw new Error('Failed to initialize application');
  }
  return app;
}

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
