/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-07-06 11:18:01
 */
import * as globby from "globby";
import * as path from "path";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { BaseService } from "../service/BaseService";
import { requireDefault } from "../util/Lib";
import { injectValue } from './Value';
import { injectSchedule } from 'koatty_schedule';
import { Container, IOCContainer } from "koatty_container";
import { BaseController } from "../controller/BaseController";
import { IMiddleware } from './Component';
import { Koatty } from '../Koatty';

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
     * Load configuration
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static loadConfigs(app: Koatty, loadPath?: string | string[]) {
        const config: any = {};
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.custom("think", "", `Load configuation path: ${app.thinkPath}/config`);
        Loader.loadDirectory("./config", app.thinkPath, function (name: string, exp: any) {
            config[name] = exp;
        });
        const appConfig: any = {};
        if (helper.isArray(loadPath)) {
            loadPath = loadPath.length > 0 ? loadPath : "";
        }
        const tempConfig: any = {};
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.custom("think", "", `Load configuation path: ${app.appPath}${loadPath || "/config"}`);

        Loader.loadDirectory(loadPath || "./config", app.appPath, function (name: string, exp: any) {
            // tslint:disable-next-line: one-variable-per-declaration
            let type = "", t = "";
            if (name.indexOf("_") > -1) {
                t = name.slice(name.lastIndexOf("_") + 1);
                if (t && (app.env || "").indexOf(t) === 0) {
                    type = t;
                }
            }
            if (type) {
                tempConfig[`${name.replace(`_${t}`, "")}^${type}`] = exp;
            } else {
                appConfig[name] = exp;
            }
        });
        // load env configuation
        // tslint:disable-next-line: forin
        for (const n in tempConfig) {
            const na = n.split("^")[0];
            if (appConfig[na]) {
                appConfig[na] = helper.extend(appConfig[na], tempConfig[n], true);
            }
        }

        app.setMap("configs", helper.extend(config, appConfig, true));
    }

    /**
     * Set logger level
     *
     * @static
     * @param {Koatty} app
     * @memberof Loader
     */
    public static setLoggerLevel(app: Koatty) {
        const configs = app.getMap("configs") || {};
        //logger
        if (configs.config) {
            process.env.LOGS = configs.config.logs || false;
            process.env.LOGS_PATH = configs.config.logs_path || app.rootPath + "/logs";
            process.env.LOGS_LEVEL = configs.config.logs_level || ["info", "warn", "error"];
        }
    }

    /**
     * Load middlewares
     * [async]
     * @static
     * @param {*} app
     * @param {Container} container
     * @param {(string | string[])} [loadPath]
     * @memberof Loader
     */
    public static async loadMiddlewares(app: Koatty, container: Container, loadPath?: string | string[]) {
        let middlewareConf = app.config(undefined, "middleware");
        if (helper.isEmpty(middlewareConf)) {
            middlewareConf = { config: {}, list: [] };
        }

        //Mount default middleware
        Loader.loadDirectory(loadPath || "./middleware", app.thinkPath);
        //Mount application middleware
        // const middlewares: any = {};
        const appMeddlewares = IOCContainer.listClass("MIDDLEWARE") || [];

        appMeddlewares.map((item: ComponentItem) => {
            item.id = (item.id || "").replace("MIDDLEWARE:", "");
            if (item.id && helper.isClass(item.target)) {
                container.reg(item.id, item.target, { scope: "Prototype", type: "MIDDLEWARE", args: [] });
                // middlewares[item.id] = item.target;
            }
        });

        const middlewareConfList = middlewareConf.list;
        const defaultList: any[] = [];
        const bandList = ["TraceMiddleware", "PayloadMiddleware"];
        middlewareConfList.map((item: string) => {
            if (!bandList.includes(item)) {
                defaultList.push(item);
            }
        });
        if (defaultList.length > middlewareConfList.length) {
            logger.warn("Some middlewares is loaded but not allowed to execute.");
        }
        //Mount the middleware on first
        defaultList.unshift("PayloadMiddleware");
        defaultList.unshift("TraceMiddleware");

        //de-duplication
        const appMList = [...new Set(defaultList)];

        //Automatically call middleware
        for (const key of appMList) {
            const handle: IMiddleware = container.get(key, "MIDDLEWARE");
            if (!handle) {
                logger.error(`middleware ${key} load error.`);
                continue;
            }
            if (!helper.isFunction(handle.run)) {
                logger.error(`middleware ${key} must be implements method 'run'.`);
                continue;
            }
            if (middlewareConf.config[key] === false) {
                continue;
            }

            try {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load middleware: ${key}`);
                const result = await handle.run(middlewareConf.config[key] || {}, app);
                if (helper.isFunction(result)) {
                    if (result.length < 3) {
                        app.use(result);
                    } else {
                        app.useExp(result);
                    }
                }
            } catch (err) {
                logger.error(`The middleware ${key} executes the 'run' method error.`, err);
            }
        }
        // app.setMap("middlewares", middlewares);
    }

    /**
     * Load controllers
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadControllers(app: Koatty, container: Container) {
        const controllerList = IOCContainer.listClass("CONTROLLER");

        const controllers: any = {};
        controllerList.map((item: ComponentItem) => {
            item.id = (item.id || "").replace("CONTROLLER:", "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load controller: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.id, item.target, { scope: "Prototype", type: "CONTROLLER", args: [] });
                const ctl = container.getInsByClass(item.target);
                if (!(ctl instanceof BaseController)) {
                    throw new Error(`class ${item.id} does not inherit from BaseController`);
                }
                controllers[item.id] = 1;
            }
        });

        app.setMap("controllers", controllers);
    }

    /**
     * Load services
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadServices(app: Koatty, container: Container) {
        const serviceList = IOCContainer.listClass("SERVICE");

        serviceList.map((item: ComponentItem) => {
            item.id = (item.id || "").replace("SERVICE:", "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load service: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // inject schedule
                injectSchedule(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.id, item.target, { scope: "Singleton", type: "SERVICE", args: [] });
                const ctl = container.getInsByClass(item.target);
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
     * @param {Container} container
     * @memberof Loader
     */
    public static loadComponents(app: Koatty, container: Container) {
        const componentList = IOCContainer.listClass("COMPONENT");

        componentList.map((item: ComponentItem) => {
            item.id = (item.id || "").replace("COMPONENT:", "");
            if (item.id && !(item.id).endsWith("Plugin") && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load component: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // inject schedule
                injectSchedule(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
            }
        });
    }

    /**
     * Load plugins
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static async loadPlugins(app: Koatty, container: Container) {
        const componentList = IOCContainer.listClass("COMPONENT");

        let pluginsConf = app.config(undefined, "plugin");
        if (helper.isEmpty(pluginsConf)) {
            pluginsConf = { config: {}, list: [] };
        }

        const pluginList = [];
        componentList.map(async (item: ComponentItem) => {
            item.id = (item.id || "").replace("COMPONENT:", "");
            if (item.id && (item.id).endsWith("Plugin") && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load plugin: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // inject schedule
                injectSchedule(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.id, item.target, { scope: "Singleton", type: "COMPONENT", args: [] });
                pluginList.push(item.id);
            }
        });

        const pluginConfList = pluginsConf.list;
        if (pluginList.length > pluginConfList.length) {
            logger.warn("Some plugins is loaded but not allowed to execute.");
        }
        for (const key of pluginConfList) {
            const handle = container.get(key, "COMPONENT");
            if (!helper.isFunction(handle.run)) {
                logger.error(`plugin ${key} must be implements method 'run'.`);
                continue;
            }
            if (pluginsConf.config[key] === false) {
                continue;
            }

            try {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Execute plugin: ${key}`);
                // sync exec 
                const result = await handle.run(pluginsConf.config[key] || {}, app);
            } catch (err) {
                logger.error(`The plugin ${key} executes the 'run' method error.`, err);
            }

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
    public static loadDirectory(loadDir: string | string[],
        baseDir?: string,
        fn?: Function,
        pattern?: string | string[],
        ignore?: string | string[]) {

        baseDir = baseDir || process.cwd();
        const loadDirs = [].concat(loadDir || []);

        for (let dir of loadDirs) {
            dir = buildLoadDir(baseDir, dir);
            const fileResults = globby.sync(['**/**.js', '**/**.ts', '!**/**.d.ts'].concat(pattern || []), {
                cwd: dir,
                ignore: [
                    '**/node_modules/**',
                    '**/logs/**',
                    '**/static/**'
                ].concat(ignore || [])
            });
            for (let name of fileResults) {
                const file = path.join(dir, name);

                if (name.indexOf('/') > -1) {
                    name = name.slice(name.lastIndexOf('/') + 1);
                }
                // let namePattern = '.ts';
                // if (name.slice(-3) === '.js') {
                //     namePattern = '.js';
                // }
                // const fileName = name.slice(0, name.lastIndexOf(namePattern));
                const fileName = name.slice(0, -3);
                //
                const exports = requireDefault(file);

                const tkeys = Object.keys(exports);
                if (!exports[fileName] && (tkeys[0] && helper.isClass(exports[tkeys[0]]) && tkeys[0] !== fileName)) {
                    throw new Error(`The class name is not consistent with the file('${file}') name. Or you used 'export default'?`);
                    // continue;
                }
                // callback
                if (fn) {
                    // console.log(fileName);
                    // console.log(exports); 
                    fn(fileName, exports, file);
                }
            }
        }
    }
}


