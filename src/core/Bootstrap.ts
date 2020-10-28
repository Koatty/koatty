/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
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
import { COMPONENT_SCAN, CONFIGURATION_SCAN } from "./Constants";

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
    try {
        console.log('  ________    _       __   __ \n /_  __/ /_  (_)___  / /__/ /______  ____ _\n  / / / __ \\/ / __ \\/ //_/ //_/ __ \\/ __ `/\n / / / / / / / / / / ,< / /,</ /_/ / /_/ /\n/_/ /_/ /_/_/_/ /_/_/|_/_/ |_\\____/\\__,_/');
        console.log('                     https://ThinkKoa.org/');
        logger.Custom('think', '', '====================================');
        logger.Custom('think', '', 'Bootstrap');

        const app = Reflect.construct(target, []);
        if (!(app instanceof Koatty)) {
            throw new Error(`class ${target.name} does not inherit from Koatty`);
        }

        // exec bootFunc
        if (helper.isFunction(bootFunc)) {
            logger.Custom('think', '', 'Execute bootFunc ...');
            await bootFunc(app);
        }

        logger.Custom('think', '', 'ComponentScan ...');
        let componentMetas = [];
        const componentMeta = IOCContainer.getClassMetadata(TAGGED_CLS, COMPONENT_SCAN, target);
        if (componentMeta) {
            if (helper.isArray(componentMeta)) {
                componentMetas = componentMeta;
            } else {
                componentMetas.push(componentMeta);
            }
        }
        if (componentMetas.length < 1) {
            componentMetas = [app.appPath];
        }
        // configurationMetas
        const configurationMeta = IOCContainer.getClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, target);
        let configurationMetas = [];
        if (configurationMeta) {
            if (helper.isArray(configurationMeta)) {
                configurationMetas = configurationMeta;
            } else {
                configurationMetas.push(configurationMeta);
            }
        }
        // ComponentScan
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
        // Load configuration items
        logger.Custom('think', '', 'Load Configurations ...');
        Loader.LoadConfigs(app, configurationMetas);

        // execute Plugin
        logger.Custom('think', '', 'Load Plugins ...');
        await Loader.LoadPlugins(app, IOCContainer);

        // Set logger level
        Loader.SetLogger(app);
        // Set IOC.app
        IOCContainer.setApp(app);

        logger.Custom('think', '', 'Load Middlewares ...');
        await Loader.LoadMiddlewares(app, IOCContainer);

        // Emit app ready
        logger.Custom('think', '', 'Emit App Ready ...');
        // app.emit("appReady");
        await asyncEvent(app, 'appReady');

        logger.Custom('think', '', 'Load Components ...');
        Loader.LoadComponents(app, IOCContainer);

        logger.Custom('think', '', 'Load Services ...');
        Loader.LoadServices(app, IOCContainer);

        logger.Custom('think', '', 'Load Controllers ...');
        Loader.LoadControllers(app, IOCContainer);

        // Emit app lazy loading
        logger.Custom('think', '', 'Emit App Started ...');
        // app.emit("appStart");
        await asyncEvent(app, 'appStart');

        logger.Custom('think', '', 'Load Routers ...');
        const routerConf = app.config(undefined, 'router') || {};
        const router = new Router(app, routerConf);
        router.LoadRouter();


        logger.Custom('think', '', '====================================');
        // Start HTTP server
        const enableHttp2 = app.config('enable_http2') || false;
        if (enableHttp2) {
            startHTTP2(app);
        } else {
            startHTTP(app);
        }

    } catch (err) {
        logger.Error(err);
        // process.exit();
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
        scanPath = scanPath || '';
        IOCContainer.saveClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, scanPath, target);
    };
}