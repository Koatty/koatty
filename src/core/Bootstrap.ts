/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:22:58
 */
import "reflect-metadata";
import fs from "fs";
import EventEmitter from "events";
import { Koatty } from 'koatty_core';
import { NewRouter, RouterOptions } from "koatty_router";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { BindProcessEvent, Serve, ListeningOptions } from "koatty_serve";
import { Loader } from "./Loader";
import { Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { checkRuntime, checkUTRuntime, KOATTY_VERSION } from "../util/Check";
import { APP_READY_HOOK, COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";

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

    const app = Reflect.construct(target, []);
    // unittest does not print startup logs
    if (isUTRuntime) {
        app.silent = true;
        Logger.setLogConsole(false);
        Logger.setLogFile(false);
    }

    try {
        !app.silent && console.log(LOGO);
        if (!(app instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }
        // version
        Helper.define(app, "version", KOATTY_VERSION);

        // Initialize env
        Loader.initialize(app);

        // exec bootFunc
        if (Helper.isFunction(bootFunc)) {
            Logger.Log('think', '', 'Execute bootFunc ...');
            await bootFunc(app);
        }

        // Set IOCContainer.app
        IOCContainer.setApp(app);

        Logger.Log('think', '', 'ComponentScan ...');

        // Check all bean
        Loader.CheckAllComponents(app, target);

        // Load configuration
        Logger.Log('think', '', 'Load Configurations ...');
        // configuration metadata
        const configurationMetas = Loader.GetConfigurationMetas(app, target);
        Loader.LoadConfigs(app, configurationMetas);

        // Load Plugin
        Logger.Log('think', '', 'Load Plugins ...');
        await Loader.LoadPlugins(app);

        // Set Logger
        Loader.SetLogger(app);

        // app.emit("appBoot");
        await asyncEvent(app, 'appBoot');

        // Load App ready hooks
        Loader.LoadAppReadyHooks(app, target);

        // New router
        const KoattyRouter = newRouter(app);
        Helper.define(app, "router", KoattyRouter);

        // Create Server
        app.server = newServe(app);
        Helper.define(app, "listenCallback", listenCallback(app));

        // Load Middleware
        Logger.Log('think', '', 'Load Middlewares ...');
        await Loader.LoadMiddlewares(app);
        // Load Components
        Logger.Log('think', '', 'Load Components ...');
        Loader.LoadComponents(app);
        // Load Services
        Logger.Log('think', '', 'Load Services ...');
        Loader.LoadServices(app);
        // Load Controllers
        Logger.Log('think', '', 'Load Controllers ...');
        const controllers = Loader.LoadControllers(app);

        // Load Routers
        Logger.Log('think', '', 'Load Routers ...');
        KoattyRouter.LoadRouter(controllers);

        // Emit app ready event
        Logger.Log('think', '', 'Emit App Ready ...');
        await asyncEvent(app, 'appReady');

        if (!isUTRuntime) {
            app.listen();
        }

        return app;
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
    const options: RouterOptions = app.config(undefined, 'router') ?? {};
    const router = NewRouter(app, options, protocol);

    return router;
}

/**
 * Listening callback function
 *
 * @param {Koatty} app
 * @returns {*} 
 */
const listenCallback = (app: Koatty) => {
    const options = app.server.options;
    return function () {
        // Emit app started event
        Logger.Log('think', '', 'Emit App Start ...');
        asyncEvent(app, 'appStart');

        Logger.Log('think', '', '====================================');
        Logger.Log("think", "", `Nodejs Version: ${process.version}`);
        Logger.Log("think", "", `Koatty Version: v${app.version}`);
        Logger.Log("think", "", `App Environment: ${app.env}`);
        Logger.Log('think', '', `Server Protocol: ${(options.protocol).toUpperCase()}`);
        Logger.Log("think", "", `Server running at ${options.protocol === "http2" ? "https" : options.protocol}://${options.hostname || '127.0.0.1'}:${options.port}/`);
        Logger.Log("think", "", "====================================");

        // binding event "appStop"
        Logger.Log('think', '', 'Bind App Stop event ...');
        BindProcessEvent(app, 'appStop');
        // tslint:disable-next-line: no-unused-expression
        app.appDebug && Logger.Warn(`Running in debug mode.`);
    };
};

/**
 * create serve
 *
 * @param {Koatty} app
 * @returns {*}  
 */
const newServe = function (app: Koatty) {
    const protocol = app.config("protocol") || "http";
    const port = process.env.PORT || process.env.APP_PORT ||
        app.config('app_port') || 3000;
    const hostname = process.env.IP ||
        process.env.HOSTNAME?.replace(/-/g, '.') || app.config('app_host') || '127.0.0.1';
    const options: ListeningOptions = {
        hostname,
        port,
        protocol,
        ext: {
            key: "",
            cert: "",
            protoFile: "",
        },
    };
    const pm = new Set(["https", "http2", "wss"])
    if (pm.has(options.protocol)) {
        const keyFile = app.config("key_file") ?? "";
        const crtFile = app.config("crt_file") ?? "";
        options.ext.key = fs.readFileSync(keyFile).toString();
        options.ext.cert = fs.readFileSync(crtFile).toString();
    }
    if (options.protocol === "https" || options.protocol === "http2") {
        options.port = options.port == 80 ? 443 : options.port;
    }
    if (options.protocol === "grpc") {
        const proto = app.config("protoFile", "router");
        options.ext.protoFile = proto;
    }

    return Serve(app, options);
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
            throw new Error(`class ${target.name} does not inherit from TKoatty`);
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