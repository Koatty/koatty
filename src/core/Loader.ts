/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:18:01
 */
import * as path from "path";
import { Load } from "koatty_loader";
import { Koatty } from 'koatty_core';
import { LoadConfigs as loadConf } from "koatty_config";
import { Logger, SetLogger } from "../util/Logger";
import { prevent } from "koatty_exception";
import { IMiddleware, IPlugin } from './Component';
import { BaseService } from "../service/BaseService";
import { AppReadyHookFunc } from "./Bootstrap";
import { checkClass, Helper, requireDefault } from "../util/Helper";
import { TAGGED_CLS } from "koatty_container";
import { APP_READY_HOOK, COMPONENT_SCAN, CONFIGURATION_SCAN } from './Constants';
import { BaseController } from "../controller/BaseController";

/**
 * 
 * @param baseDir 
 * @param dir 
 */
function buildLoadDir(baseDir: string, dir: string) {
    if (!path.isAbsolute(dir)) {
        return path.join(baseDir, dir);
    }
    return dir;
}

/**
 *
 *
 * @interface ComponentItem
 */
interface ComponentItem {
    id: string;
    target: any;
}

/**
 * 
 */
export class Loader {

    /**
     * initialize env
     *
     * @static
     * @param {Koatty} app
     * @memberof Loader
     */
    public static initialize(app: Koatty) {
        const env = (process.execArgv ?? []).join(",");
        if (env.indexOf('ts-node') > -1 || env.indexOf('--debug') > -1) {
            app.appDebug = true;
        }
        // app.env
        app.env = process.env.KOATTY_ENV || process.env.NODE_ENV;
        if ((env.indexOf('--production') > -1) || ((app.env ?? '').indexOf('pro') > -1)) {
            app.appDebug = false;
        }

        if (app.appDebug) {
            app.env = 'development';
            process.env.NODE_ENV = 'development';
            process.env.APP_DEBUG = 'true';
            Logger.setLevel("DEBUG");
        } else {
            app.env = 'production';
            process.env.NODE_ENV = 'production';
            Logger.setLevel("INFO");
        }

        // define path
        const rootPath = app.rootPath || process.cwd();
        const appPath = app.appPath || path.resolve(rootPath, env.indexOf('ts-node') > -1 ? 'src' : 'dist');
        const thinkPath = path.resolve(__dirname, '..');
        Helper.define(app, 'rootPath', rootPath);
        Helper.define(app, 'appPath', appPath);
        Helper.define(app, 'thinkPath', thinkPath);

        process.env.ROOT_PATH = rootPath;
        process.env.APP_PATH = appPath;
        process.env.THINK_PATH = thinkPath;

        // Compatible with old version, will be deprecated
        Helper.define(app, 'prevent', prevent);
        Helper.define(app, 'root_path', rootPath);
        Helper.define(app, 'app_path', appPath);
        Helper.define(app, 'think_path', thinkPath);

        // set Logger
        Helper.define(app, 'logger', Logger);
    }

    /**
     * Get component metadata
     *
     * @static
     * @param {Koatty} app
     * @param {*} target
     * @returns {*}  {any[]}
     * @memberof Loader
     */
    public static GetComponentMetas(app: Koatty, target: any): any[] {
        let componentMetas = [];
        const componentMeta = app.container.getClassMetadata(TAGGED_CLS, COMPONENT_SCAN, target);
        if (componentMeta) {
            if (Helper.isArray(componentMeta)) {
                componentMetas = componentMeta;
            } else {
                componentMetas.push(componentMeta);
            }
        }
        if (componentMetas.length < 1) {
            componentMetas = [app.appPath];
        }
        return componentMetas;
    }

    /**
     * Load all bean, excepted config/*、App.ts
     *
     * @static
     * @param {Koatty} app
     * @param {*} target
     * @memberof Loader
     */
    public static CheckAllComponents(app: Koatty, target: any) {
        // component metadata
        const componentMetas = Loader.GetComponentMetas(app, target);
        // configuration metadata
        const configurationMetas = Loader.GetConfigurationMetas(app, target);
        const exSet = new Set();
        Load(componentMetas, '', (fileName: string, xpath: string, xTarget: any) => {
            checkClass(fileName, xpath, xTarget, exSet);
        }, ['**/**.js', '**/**.ts', '!**/**.d.ts'], [...configurationMetas, `${target.name || '.no'}.ts`]);
        exSet.clear();
    }

    /**
     * Get configuration metadata
     *
     * @static
     * @param {Koatty} app
     * @param {*} target
     * @returns {*}  {any[]}
     * @memberof Loader
     */
    public static GetConfigurationMetas(app: Koatty, target: any): any[] {
        const confMeta = app.container.getClassMetadata(TAGGED_CLS, CONFIGURATION_SCAN, target);
        let configurationMetas = [];
        if (confMeta) {
            if (Helper.isArray(confMeta)) {
                configurationMetas = confMeta;
            } else {
                configurationMetas.push(confMeta);
            }
        }
        return configurationMetas;
    }

    /**
     * Set Logger level
     *
     * @static
     * @param {Koatty} app
     * @memberof Loader
     */
    public static SetLogger(app: Koatty) {
        const configs = app.getMetaData("_configs") ?? {};
        //Logger
        if (configs.config) {
            const opt = configs.config;
            let logLevel: any = "DEBUG",
                logFileLevel: any = "INFO",
                logConsole = true,
                logFile = false,
                logFilePath = app.rootPath + "/logs";
            if (app.env === "production") {
                logLevel = "INFO";
                logFileLevel = "WARN";
                logConsole = false;
                logFile = true;
            }
            if (opt.logs_level) {
                logLevel = opt.logs_level;
            }
            if (opt.logs_write_level) {
                logFileLevel = opt.logs_write_level;
            }
            if (opt.logFile !== undefined) {
                logFile = !!opt.logs_write;
            }
            if (opt.logs_console !== undefined) {
                logConsole = !!opt.logs_console;
            }
            if (opt.logs_path) {
                logFilePath = opt.logs_path;
            }
            SetLogger({ logLevel, logConsole, logFile, logFileLevel, logFilePath });
        }
    }


    /**
     * Load app ready hook funcs
     *
     * @static
     * @param {Koatty} app
     * @param {*} target
     * @memberof Loader
     */
    public static LoadAppReadyHooks(app: Koatty, target: any) {
        const funcs = app.container.getClassMetadata(TAGGED_CLS, APP_READY_HOOK, target);
        if (Helper.isArray(funcs)) {
            funcs.forEach((element: AppReadyHookFunc): any => {
                app.once('appReady', () => element(app));
                return null;
            });
        }
    }

    /**
     * Load configuration
     *
     * @static
     * @param {Koatty} app
     * @param {string[]} [loadPath]
     * @memberof Loader
     */
    public static LoadConfigs(app: Koatty, loadPath?: string[]) {
        const frameConfig: any = {};
        // Logger.Debug(`Load configuration path: ${app.thinkPath}/config`);
        Load(["./config"], app.thinkPath, function (name: string, path: string, exp: any) {
            frameConfig[name] = exp;
        });

        if (Helper.isArray(loadPath)) {
            loadPath = loadPath.length > 0 ? loadPath : ["./config"];
        }
        let appConfig = loadConf(loadPath, app.appPath);
        appConfig = Helper.extend(frameConfig, appConfig, true);

        app.setMetaData("_configs", appConfig);
    }

    /**
     * Load middlewares
     * [async]
     * @static
     * @param {*} app
     * @param {(string | string[])} [loadPath]
     * @memberof Loader
     */
    public static async LoadMiddlewares(app: Koatty, loadPath?: string[]) {
        let middlewareConf = app.config(undefined, "middleware");
        if (Helper.isEmpty(middlewareConf)) {
            middlewareConf = { config: {}, list: [] };
        }

        //Mount default middleware
        Load(loadPath || ["./middleware"], app.thinkPath);
        //Mount application middleware
        // const middleware: any = {};
        const appMiddleware = app.container.listClass("MIDDLEWARE") ?? [];

        appMiddleware.forEach((item: ComponentItem) => {
            item.id = (item.id ?? "").replace("MIDDLEWARE:", "");
            if (item.id && Helper.isClass(item.target)) {
                app.container.reg(item.id, item.target, { scope: "Prototype", type: "MIDDLEWARE", args: [] });
                // middleware[item.id] = item.target;
            }
        });

        const middlewareConfList = middlewareConf.list;
        const defaultList = ["TraceMiddleware", "PayloadMiddleware"];
        middlewareConfList.forEach((item: string) => {
            if (!defaultList.includes(item)) {
                defaultList.push(item);
            }
        });
        // if (defaultList.length > middlewareConfList.length) {
        //     Logger.Warn("Some middleware is loaded but not allowed to execute.");
        // }

        //de-duplication
        const appMList = [...new Set(defaultList)];
        //Automatically call middleware
        for (const key of appMList) {
            const handle: IMiddleware = app.container.get(key, "MIDDLEWARE");
            if (!handle) {
                Logger.Error(`Middleware ${key} load error.`);
                continue;
            }
            if (!Helper.isFunction(handle.run)) {
                Logger.Error(`Middleware ${key} must be implements method 'run'.`);
                continue;
            }
            if (middlewareConf.config[key] === false) {
                Logger.Warn(`Middleware ${key} is loaded but not allowed to execute.`);
                continue;
            }


            Logger.Debug(`Load middleware: ${key}`);
            const result = await handle.run(middlewareConf.config[key] ?? {}, app);
            if (Helper.isFunction(result)) {
                if (result.length < 3) {
                    app.use(result);
                } else {
                    app.useExp(result);
                }
            }
        }

        // app.setMetaData("_middlewares", middleware);
    }

    /**
     * Load controllers
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static LoadControllers(app: Koatty) {
        const controllerList = app.container.listClass("CONTROLLER");

        const controllers: any = {};
        controllerList.forEach((item: ComponentItem) => {
            item.id = (item.id ?? "").replace("CONTROLLER:", "");
            if (item.id && Helper.isClass(item.target)) {
                Logger.Debug(`Load controller: ${item.id}`);
                // registering to IOC
                app.container.reg(item.id, item.target, { scope: "Prototype", type: "CONTROLLER", args: [] });
                const ctl = app.container.getInsByClass(item.target);
                if (!(ctl instanceof BaseController)) {
                    throw new Error(`class ${item.id} does not inherit from BaseController`);
                }
                controllers[item.id] = 1;
            }
        });

        app.setMetaData("_controllers", controllers);
    }

    /**
     * Load services
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static LoadServices(app: Koatty) {
        const serviceList = app.container.listClass("SERVICE");

        serviceList.forEach((item: ComponentItem) => {
            item.id = (item.id ?? "").replace("SERVICE:", "");
            if (item.id && Helper.isClass(item.target)) {
                Logger.Debug(`Load service: ${item.id}`);
                // registering to IOC
                app.container.reg(item.id, item.target, { scope: "Singleton", type: "SERVICE", args: [] });
                const ctl = app.container.getInsByClass(item.target);
                if (!(ctl instanceof BaseService)) {
                    throw new Error(`class ${item.id} does not inherit from BaseService`);
                }
            }
        });
    }

    /**
     * Load components
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static LoadComponents(app: Koatty) {
        const componentList = app.container.listClass("COMPONENT");

        componentList.forEach((item: ComponentItem) => {
            item.id = (item.id ?? "").replace("COMPONENT:", "");
            if (item.id && !(item.id).endsWith("Plugin") && Helper.isClass(item.target)) {
                Logger.Debug(`Load component: ${item.id}`);
                // inject schedule
                // injectSchedule(item.target, item.target.prototype, app.container);
                // registering to IOC
                app.container.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
            }
        });
    }

    /**
     * Load plugins
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static async LoadPlugins(app: Koatty) {
        const componentList = app.container.listClass("COMPONENT");

        let pluginsConf = app.config(undefined, "plugin");
        if (Helper.isEmpty(pluginsConf)) {
            pluginsConf = { config: {}, list: [] };
        }

        const pluginList = [];
        componentList.forEach(async (item: ComponentItem) => {
            item.id = (item.id ?? "").replace("COMPONENT:", "");
            if (item.id && (item.id).endsWith("Plugin") && Helper.isClass(item.target)) {
                // Logger.Debug(`Load plugin: ${item.id}`);
                // registering to IOC
                app.container.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
                pluginList.push(item.id);
            }
        });

        const pluginConfList = pluginsConf.list;
        if (pluginList.length > pluginConfList.length) {
            Logger.Warn("Some plugins is loaded but not allowed to execute.");
        }
        for (const key of pluginConfList) {
            const handle: IPlugin = app.container.get(key, "COMPONENT");
            if (!Helper.isFunction(handle.run)) {
                Logger.Error(`plugin ${key} must be implements method 'run'.`);
                continue;
            }
            if (pluginsConf.config[key] === false) {
                continue;
            }

            // Logger.Debug(`Execute plugin: ${key}`);
            // sync exec 
            await handle.run(pluginsConf.config[key] ?? {}, app);
        }
    }

    /**
     *
     *
     * @static
     * @param {(string | string[])} loadDir
     * @param {string} [baseDir]
     * @param {Function} [fn]
     * @param {(string | string[])} [pattern]
     * @param {(string | string[])} [ignore]
     * @memberof Loader
     */
    // public static LoadDirectory(loadDir: string | string[],
    //     baseDir?: string,
    //     fn?: Function,
    //     pattern?: string | string[],
    //     ignore?: string | string[]) {

    //     baseDir = baseDir || process.cwd();
    //     const loadDirs = [].concat(loadDir ?? []);

    //     for (let dir of loadDirs) {
    //         dir = buildLoadDir(baseDir, dir);
    //         const fileResults = globby.sync(['**/**.js', '**/**.ts', '!**/**.d.ts'].concat(pattern ?? []), {
    //             cwd: dir,
    //             ignore: [
    //                 '**/node_modules/**',
    //                 '**/logs/**',
    //                 '**/static/**'
    //             ].concat(ignore ?? [])
    //         });
    //         for (let name of fileResults) {
    //             const file = path.join(dir, name);

    //             if (name.indexOf('/') > -1) {
    //                 name = name.slice(name.lastIndexOf('/') + 1);
    //             }
    //             // let namePattern = '.ts';
    //             // if (name.slice(-3) === '.js') {
    //             //     namePattern = '.js';
    //             // }
    //             // const fileName = name.slice(0, name.lastIndexOf(namePattern));
    //             const fileName = name.slice(0, -3);
    //             //
    //             const exports = requireDefault(file);

    //             const tkeys = Object.keys(exports);
    //             if (!exports[fileName] && (tkeys[0] && Helper.isClass(exports[tkeys[0]]) && tkeys[0] !== fileName)) {
    //                 throw new Error(`The class name is not consistent with the file('${file}') name. Or you used 'export default'?`);
    //                 // continue;
    //             }
    //             // callback
    //             if (fn) {
    //                 // console.log(fileName);
    //                 // console.log(exports); 
    //                 fn(fileName, exports, file);
    //             }
    //         }
    //     }
    // }
}


