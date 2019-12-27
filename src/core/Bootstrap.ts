/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:27:17
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { saveClassMetadata, getClassMetadata } from "./Injectable";
import { INJECT_TAG, COMPONENT_SCAN, CONFIGUATION_SCAN } from "./Constants";
import { Container } from "./Container";
import { Loader } from "../util/Loader";
import { Router } from "./Router";

/**
 * Bootstrap appliction
 *
 * @export
 * @param {Function} [bootFunc] 
 * @returns {ClassDecorator}
 */
export function Bootstrap(bootFunc?: Function): ClassDecorator {
    console.log("  ________    _       __   __ \n /_  __/ /_  (_)___  / /__/ /______  ____ _\n  / / / __ \\/ / __ \\/ //_/ //_/ __ \\/ __ `/\n / / / / / / / / / / ,< / /,</ /_/ / /_/ /\n/_/ /_/ /_/_/_/ /_/_/|_/_/ |_\\____/\\__,_/");
    console.log(`                     https://ThinkKoa.org/`);
    logger.custom("think", "", "====================================");
    logger.custom("think", "", "Bootstrap");

    return (target: any) => {
        try {
            const app = Reflect.construct(target, []);

            logger.custom("think", "", "ComponentScan ...");
            let componentMetas = [];
            const componentMeta = getClassMetadata(INJECT_TAG, COMPONENT_SCAN, target);
            if (componentMeta) {
                if (!helper.isArray(componentMeta)) {
                    componentMetas.push(componentMeta);
                } else {
                    componentMetas = componentMeta;
                }
            }
            if (componentMetas.length < 1) {
                componentMetas = [app.app_path];
            }
            // configuationMetas
            const configuationMeta = getClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, target);
            let configuationMetas = [];
            if (configuationMeta) {
                if (helper.isArray(configuationMeta)) {
                    configuationMetas = configuationMeta;
                } else {
                    configuationMetas.push(configuationMeta);
                }
            }
            // ComponentScan
            const exSet = new Set();
            Loader.loadDirectory(componentMetas, "", function (fileName: string, target: any, fpath: string) {
                if (target[fileName] && helper.isClass(target[fileName])) {
                    if (exSet.has(fileName)) {
                        throw new Error(`A same name class already exists. Please modify the \`${fpath}\`'s class name and file name.`);
                    }
                    exSet.add(fileName);
                }
            }, [...configuationMetas, `!${target.name || ".no"}.ts`]);
            exSet.clear();


            logger.custom("think", "", "LoadConfiguation ...");
            Loader.loadConfigs(app, configuationMetas);
            //Contriner
            const container = new Container(app);
            helper.define(app, "Container", container);

            logger.custom("think", "", "LoadMiddlewares ...");
            Loader.loadMiddlewares(app, container);

            //Emit app ready
            logger.custom("think", "", "Emit App Ready ...");
            //Boot function
            if (helper.isFunction(bootFunc)) {
                app.once("appReady", () => {
                    bootFunc(app);
                });
            }
            app.emit("appReady");
            container.app = app;

            logger.custom("think", "", "LoadComponents ...");
            Loader.loadComponents(app, container);

            logger.custom("think", "", "LoadServices ...");
            Loader.loadServices(app, container);

            logger.custom("think", "", "LoadControllers ...");
            Loader.loadControllers(app, container);

            //Emit app lazy loading
            logger.custom("think", "", "Emit App LazyLoading ...");
            app.emit("appLazy");

            logger.custom("think", "", "LoadRouters ...");
            const routerConf = app.config(undefined, "router") || {};
            const router = new Router(app, container, routerConf);
            router.loadRouter();

            //Start app
            logger.custom("think", "", "Listening ...");
            logger.custom("think", "", "====================================");
            app.listen();
        } catch (error) {
            logger.error(error);
            process.exit();
        }
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
    logger.custom("think", "", "ComponentScan");

    return (target: any) => {
        scanPath = scanPath || "";
        saveClassMetadata(INJECT_TAG, COMPONENT_SCAN, scanPath, target);
    };
}

/**
 * Define project configuration scan path
 *
 * @export
 * @param {(string | string[])} [scanPath]
 * @returns {ClassDecorator}
 */
export function ConfiguationScan(scanPath?: string | string[]): ClassDecorator {
    logger.custom("think", "", "ConfiguationScan");

    return (target: any) => {
        scanPath = scanPath || "";
        saveClassMetadata(INJECT_TAG, CONFIGUATION_SCAN, scanPath, target);
    };
}
