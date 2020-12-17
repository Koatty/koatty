/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:22:58
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { Router } from "./Router";
import { Koatty } from '../Koatty';
import { StartSever } from './Server';
import { Loader } from "./Loader";
import { TraceHandler } from "./Trace";
import { COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";

/**
 * execute event as async
 *
 * @param {Koatty} app
 * @param {string} eventName
 */
const asyncEvent = async function (app: Koatty, eventName: string) {
    const ls: any[] = app.listeners(eventName);
    // eslint-disable-next-line no-restricted-syntax
    for await (const func of ls) {
        if (Helper.isFunction(func)) {
            func();
        }
    }
    return app.removeAllListeners(eventName);
};

/**
 * execute bootstrap
 *
 * @param {*} target
 * @param {Function} bootFunc
 * @returns {Promise<void>}
 */
const executeBootstrap = async function (target: any, bootFunc: Function): Promise<void> {
    const app = Reflect.construct(target, []);
    try {
        console.log(LOGO);
        console.log('                     https://ThinkKoa.org/');
        Logger.Custom('think', '', '====================================');
        Logger.Custom('think', '', 'Bootstrap');

        if (!(app instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }

        // exec bootFunc
        if (Helper.isFunction(bootFunc)) {
            Logger.Custom('think', '', 'Execute bootFunc ...');
            await bootFunc(app);
        }
        // Set IOC.app
        IOCContainer.setApp(app);

        Logger.Custom('think', '', 'ComponentScan ...');
        // component metadata
        const componentMetas = Loader.GetComponentMetas(target, app.appPath);
        // configuration metadata
        const configurationMetas = Loader.GetConfigurationMetas(target);
        // load all bean
        const exSet = new Set();
        Loader.LoadDirectory(componentMetas, '', (fileName: string, target: any, xpath: string) => {
            if (target[fileName] && Helper.isClass(target[fileName])) {
                if (exSet.has(fileName)) {
                    throw new Error(`A same name class already exists. Please modify the \`${xpath}\`'s class name and file name.`);
                }
                exSet.add(fileName);
            }
        }, [...configurationMetas, `!${target.name || '.no'}.ts`]);
        exSet.clear();

        // Load configuration
        Logger.Custom('think', '', 'Load Configurations ...');
        Loader.LoadConfigs(app, configurationMetas);

        // Load Plugin
        Logger.Custom('think', '', 'Load Plugins ...');
        await Loader.LoadPlugins(app, IOCContainer);

        // Set Logger level
        Loader.SetLogger(app);

        // Load App ready hooks
        Loader.LoadAppReadyHooks(target, app);

        // New router
        const KoattyRouter = new Router(app, app.config(undefined, 'router') || {});
        // Middleware may depend on
        Helper.define(app, "Router", KoattyRouter.router);

        // Load Middleware
        Logger.Custom('think', '', 'Load Middlewares ...');
        await Loader.LoadMiddlewares(app, IOCContainer);

        // Emit app ready event
        Logger.Custom('think', '', 'Emit App Ready ...');
        // app.emit("appReady");
        await asyncEvent(app, 'appReady');
        // Load Components
        Logger.Custom('think', '', 'Load Components ...');
        Loader.LoadComponents(app, IOCContainer);
        // Load Services
        Logger.Custom('think', '', 'Load Services ...');
        Loader.LoadServices(app, IOCContainer);
        // Load Controllers
        Logger.Custom('think', '', 'Load Controllers ...');
        Loader.LoadControllers(app, IOCContainer);
        // Load Routers
        Logger.Custom('think', '', 'Load Routers ...');
        KoattyRouter.LoadRouter();

        // Emit app started event
        Logger.Custom('think', '', 'Emit App Start ...');
        // app.emit("appStart");
        await asyncEvent(app, 'appStart');

        Logger.Custom('think', '', '====================================');
        // Start server
        StartSever(app);

    } catch (err) {
        Logger.Error(err);
        process.exit();
    }
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
        scanPath = scanPath || '';
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
        scanPath = scanPath || '';
        IOCContainer.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
    };
}