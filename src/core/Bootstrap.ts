/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:22:58
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { DefaultLogger as logger } from "../util/Logger";
import { IOCContainer, TAGGED_CLS } from "koatty_container";
import { Router } from "./Router";
import { Koatty } from '../Koatty';
import { startHTTP, startHTTP2 } from './Server';
import { Loader } from "./Loader";
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
        if (helper.isFunction(func)) {
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
        logger.Custom('think', '', '====================================');
        logger.Custom('think', '', 'Bootstrap');

        if (!(app instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }

        // exec bootFunc
        if (helper.isFunction(bootFunc)) {
            logger.Custom('think', '', 'Execute bootFunc ...');
            await bootFunc(app);
        }
        // Set IOC.app
        IOCContainer.setApp(app);

        logger.Custom('think', '', 'ComponentScan ...');
        // component metadata
        const componentMetas = Loader.GetComponentMetas(target, app.appPath);
        // configuration metadata
        const configurationMetas = Loader.GetConfigurationMetas(target);
        // load all bean
        const exSet = new Set();
        Loader.LoadDirectory(componentMetas, '', (fileName: string, target: any, fpath: string) => {
            if (target[fileName] && helper.isClass(target[fileName])) {
                if (exSet.has(fileName)) {
                    throw new Error(`A same name class already exists. Please modify the \`${fpath}\`'s class name and file name.`);
                }
                exSet.add(fileName);
            }
        }, [...configurationMetas, `!${target.name || '.no'}.ts`]);
        exSet.clear();

        // Load configuration
        logger.Custom('think', '', 'Load Configurations ...');
        Loader.LoadConfigs(app, configurationMetas);

        // Load Plugin
        logger.Custom('think', '', 'Load Plugins ...');
        await Loader.LoadPlugins(app, IOCContainer);

        // Set logger level
        Loader.SetLogger(app);

        // Load App ready hooks
        Loader.LoadAppReadyHooks(target, app);

        // Load Middleware
        logger.Custom('think', '', 'Load Middlewares ...');
        await Loader.LoadMiddlewares(app, IOCContainer);

        // Emit app ready event
        logger.Custom('think', '', 'Emit App Ready ...');
        // app.emit("appReady");
        await asyncEvent(app, 'appReady');
        // Load Components
        logger.Custom('think', '', 'Load Components ...');
        Loader.LoadComponents(app, IOCContainer);
        // Load Services
        logger.Custom('think', '', 'Load Services ...');
        Loader.LoadServices(app, IOCContainer);
        // Load Controllers
        logger.Custom('think', '', 'Load Controllers ...');
        Loader.LoadControllers(app, IOCContainer);
        // Load Routers
        logger.Custom('think', '', 'Load Routers ...');
        const routerConf = app.config(undefined, 'router') || {};
        const router = new Router(app, routerConf);
        router.LoadRouter();

        // Emit app started event
        logger.Custom('think', '', 'Emit App Start ...');
        // app.emit("appStart");
        await asyncEvent(app, 'appStart');

    } catch (err) {
        logger.Error(err);
        process.exit();
    }

    logger.Custom('think', '', '====================================');
    // Start HTTP server
    const enableHttp2 = app.config('enable_http2') || false;
    if (enableHttp2) {
        startHTTP2(app);
    } else {
        startHTTP(app);
    }
};


/**
 * Bootstrap appliction
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
    logger.Custom('think', '', 'ComponentScan');

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
    logger.Custom('think', '', 'ConfigurationScan');

    return (target: any) => {
        if (!(target.prototype instanceof Koatty)) {
            throw new Error(`class does not inherit from Koatty`);
        }
        scanPath = scanPath || '';
        IOCContainer.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
    };
}