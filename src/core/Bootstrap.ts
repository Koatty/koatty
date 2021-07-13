/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:22:58
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import EventEmitter from "events";
import { Koatty } from 'koatty_core';
import { Loader } from "./Loader";
import { checkRuntime, Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { BindProcessEvent } from "koatty_serve";
import { newRouter } from "./Router";
import { startSever } from './Serve';
import { COMPONENT_SCAN, CONFIGURATION_SCAN, LOGO } from "./Constants";

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
        // Initialize env
        Loader.initialize(app);
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

        // Set Logger
        Loader.SetLogger(app);

        // Load App ready hooks
        Loader.LoadAppReadyHooks(target, app);

        // New router
        const KoattyRouter = newRouter(app);
        // Middleware may depend on
        Helper.define(app, "Router", KoattyRouter);

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
        KoattyRouter.LoadRouter(app.getMetaData("_controllers"));

        // Emit app started event
        Logger.Custom('think', '', 'Emit App Start ...');
        // app.emit("appStart");
        await asyncEvent(app, 'appStart');

        Logger.Custom('think', '', '====================================');
        // Start server
        startSever(app);
        // binding event "appStop"
        BindProcessEvent(app, 'appStop');
    } catch (err) {
        Logger.Error(err);
        process.exit();
    }
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