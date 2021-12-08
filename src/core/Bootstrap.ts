/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:22:58
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import EventEmitter from "events";
import { Koatty, KoattyRouterOptions } from 'koatty_core';
import { Loader } from "./Loader";
import { checkRuntime, Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { BindProcessEvent, Serve } from "koatty_serve";
import { APP_READY_HOOK, COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";
import { NewRouter } from "koatty_router";
const pkg = require("../../package.json");

/**
 * execute bootstrap
 *
 * @param {*} target
 * @param {Function} bootFunc
 * @returns {Promise<void>}
 */
const ExecBootstrap = async function (target: any, bootFunc: Function): Promise<void> {
    // checked runtime
    checkRuntime();
    const app = Reflect.construct(target, []);
    try {
        console.log(LOGO);
        if (!(app instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }
        // version
        Helper.define(app, "version", pkg.version);

        // Initialize env
        Loader.initialize(app);

        // exec bootFunc
        if (Helper.isFunction(bootFunc)) {
            Logger.Custom('think', '', 'Execute bootFunc ...');
            await bootFunc(app);
        }

        // Set IOC.app
        IOCContainer.setApp(app);
        Helper.define(app, "container", IOCContainer);

        Logger.Custom('think', '', 'ComponentScan ...');

        // Check all bean
        Loader.CheckAllComponents(app, target);

        // Load configuration
        Logger.Custom('think', '', 'Load Configurations ...');
        // configuration metadata
        const configurationMetas = Loader.GetConfigurationMetas(app, target);
        Loader.LoadConfigs(app, configurationMetas);

        // Load Plugin
        Logger.Custom('think', '', 'Load Plugins ...');
        await Loader.LoadPlugins(app);

        // Set Logger
        Loader.SetLogger(app);

        // app.emit("appBoot");
        await asyncEvent(app, 'appBoot');

        // Load App ready hooks
        Loader.LoadAppReadyHooks(app, target);

        // New router
        const KoattyRouter = newRouter(app);

        // Load Middleware
        Logger.Custom('think', '', 'Load Middlewares ...');
        await Loader.LoadMiddlewares(app);

        // Load Components
        Logger.Custom('think', '', 'Load Components ...');
        Loader.LoadComponents(app);
        // Load Services
        Logger.Custom('think', '', 'Load Services ...');
        Loader.LoadServices(app);
        // Load Controllers
        Logger.Custom('think', '', 'Load Controllers ...');
        Loader.LoadControllers(app);

        // Emit app ready event
        Logger.Custom('think', '', 'Emit App Ready ...');
        // app.emit("appReady");
        await asyncEvent(app, 'appReady');

        // Load Routers
        Logger.Custom('think', '', 'Load Routers ...');
        KoattyRouter.LoadRouter(app.getMetaData("_controllers"));

        // Emit app started event
        Logger.Custom('think', '', 'Emit App Start ...');
        // app.emit("appStart");
        await asyncEvent(app, 'appStart');

        Logger.Custom('think', '', '====================================');
        // Start server
        app.listen(newServe(app));

        // binding event "appStop"
        BindProcessEvent(app, 'appStop');
    } catch (err) {
        Logger.Error(err);
        process.exit();
    }
};

/**
 * create router
 *
 * @export
 * @param {Koatty} app
 * @returns {*}  
 */
const newRouter = function (app: Koatty) {
    const protocol = app.config("protocol") || "http";
    const options: KoattyRouterOptions = app.config(undefined, 'router') ?? {};
    const router = NewRouter(app, options, protocol);

    Helper.define(app, "router", router);
    return router;
}

/**
 * create serve
 *
 * @param {Koatty} app
 * @returns {*}  
 */
const newServe = function (app: Koatty) {
    const protocol = app.config("protocol") || "http";
    const server = Serve(app, protocol);

    Helper.define(app, "server", server);
    return server;
}



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
        ExecBootstrap(target, bootFunc);
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
    Logger.Custom('think', '', 'ComponentScan');

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
    Logger.Custom('think', '', 'ConfigurationScan');

    return (target: any) => {
        if (!(target.prototype instanceof Koatty)) {
            throw new Error(`class does not inherit from Koatty`);
        }
        scanPath = scanPath ?? '';
        IOCContainer.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
    };
}

// type AppReadyHookFunc
export type AppReadyHookFunc = (app: Koatty) => Promise<any>;

/**
 * bind AppReadyHookFunc
 * example:
 * export function TestDecorator(): ClassDecorator {
 *  return (target: any) => {
 *   BindAppReadyHook((app: Koatty) => {
 *      // todo
 *      return Promise.resolve();
 *   }, target)   
 *  }
 * }
 *
 * @export
 * @param {AppReadyHookFunc} func
 * @param {*} target 
 */
export function BindAppReadyHook(func: AppReadyHookFunc, target: any) {
    IOCContainer.attachClassMetadata(TAGGED_CLS, APP_READY_HOOK, func, target);
}