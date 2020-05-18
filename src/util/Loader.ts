/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 09:27:31
 */
import * as globby from "globby";
import * as path from "path";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { BaseService } from "../service/BaseService";
import { requireDefault } from "./Lib";
import { injectValue } from '../core/Value';
import { injectSchedule } from '../core/Schedule';
import { Container, IOCContainer } from "think_container";
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
 */
export class Loader {


    /**
     * Load configuration
     *
     * @static
     * @param {*} app
     * @memberof Loader
     */
    public static loadConfigs(app: any, loadPath?: string | string[]) {
        const config: any = {};
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.custom("think", "", `Load configuation path: ${app.think_path}/config`);
        Loader.loadDirectory("./config", app.think_path, function (name: string, exp: any) {
            config[name] = exp;
        });
        const appConfig: any = {};
        if (helper.isArray(loadPath)) {
            loadPath = loadPath.length > 0 ? loadPath : "";
        }
        const tempConfig: any = {};
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.custom("think", "", `Load configuation path: ${app.app_path}${loadPath || "/config"}`);

        Loader.loadDirectory(loadPath || "./config", app.app_path, function (name: string, exp: any) {
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
     * Load middlewares
     * [async]
     * @static
     * @param {*} app
     * @param {Container} container
     * @param {(string | string[])} [loadPath]
     * @memberof Loader
     */
    public static async loadMiddlewares(app: any, container: Container, loadPath?: string | string[]) {
        const middlewareConf = app.config(undefined, "middleware") || { config: {}, list: [] };
        //default middleware list
        const defaultList = ["PayloadMiddleware"];
        //Mount default middleware
        Loader.loadDirectory(loadPath || "./middleware", app.think_path);
        //Mount application middleware
        // const middlewares: any = {};
        const appMeddlewares = IOCContainer.listClass("MIDDLEWARE") || [];

        appMeddlewares.map((item: {
            id: string;
            target: any;
        }) => {
            item.id = (item.id || "").replace("MIDDLEWARE:", "");
            if (item.id && helper.isClass(item.target)) {
                container.reg(item.target, { scope: "Prototype", type: "MIDDLEWARE" });
                // middlewares[item.id] = item.target;
            }
        });

        const middlewareConfList = middlewareConf.list;
        const bandList = ["TraceMiddleware", ...defaultList];
        middlewareConfList.map((item: any) => {
            if (!bandList.includes(item)) {
                defaultList.push(item);
            }
        });

        //de-duplication
        const appMList = [...new Set(defaultList)];
        //Mount the middleware on first
        appMList.unshift("TraceMiddleware");

        //Automatically call middleware
        let handle: any;
        for (const key of appMList) {
            handle = container.get(key, "MIDDLEWARE");
            if (!handle) {
                throw new Error(`middleware ${key} load error.`);
                return;
            }
            if (!helper.isFunction(handle.run)) {
                throw new Error(`middleware ${key} must be implements method 'run'.`);
                return;
            }
            if (middlewareConf.config[key] === false) {
                return;
            }
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.custom("think", "", `Load middleware: ${key}`);
            const result = await handle.run(middlewareConf.config[key] || {}, app);
            if (handle.run.length < 3) {
                app.use(result);
            } else {
                app.useExp(result);
            }
        }
        // app.setMap("middlewares", middlewares);
    }

    /**
     * Load components
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadComponents(app: any, container: Container) {
        const componentList = IOCContainer.listClass("COMPONENT");

        componentList.map((item: any) => {
            item.id = (item.id || "").replace("COMPONENT:", "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load component: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // inject schedule
                injectSchedule(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.target, { scope: "Singleton", type: "COMPONENT" });
            }
        });
    }

    /**
     * Load services
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadServices(app: any, container: Container) {
        const serviceList = IOCContainer.listClass("SERVICE");

        serviceList.map((item: any) => {
            item.id = (item.id || "").replace("SERVICE:", "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load service: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // inject schedule
                injectSchedule(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.target, { scope: "Singleton", type: "SERVICE" });
                const ctl = container.getInsByClass(item.target);
                if (!(ctl instanceof BaseService)) {
                    throw new Error(`class ${item.id} does not inherit from BaseService`);
                }
            }
        });
    }

    /**
     * Load controllers
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadControllers(app: any, container: Container) {
        const controllerList = IOCContainer.listClass("CONTROLLER");

        const controllers: any = {};
        controllerList.map((item: any) => {
            item.id = (item.id || "").replace("CONTROLLER:", "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load controller: ${item.id}`);
                // inject configuation
                injectValue(item.target, item.target.prototype, container);
                // registering to IOC
                container.reg(item.target, { scope: "Prototype", type: "CONTROLLER" });
                const ctl = container.getInsByClass(item.target);
                if (!(ctl instanceof BaseController)) {
                    throw new Error(`class ${item.id} does not inherit from BaseController`);
                }
                controllers[item.id] = item.target;
            }
        });

        app.setMap("controllers", controllers);
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


