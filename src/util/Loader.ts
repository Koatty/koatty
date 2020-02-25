/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-02-24 16:12:03
 */
import * as globby from "globby";
import * as path from "path";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { requireDefault } from "./Lib";
import { Container } from "../core/Container";
import { listModule } from "../core/Injectable";
import { COMPONENT_KEY, CONTROLLER_KEY, MIDDLEWARE_KEY, SERVICE_KEY } from "../core/Constants";
import { Base } from "../core/Base";
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
            if (process.env.KOATTY_ENV && name.indexOf(`_${process.env.KOATTY_ENV}`) > -1) {
                tempConfig[name] = exp;
            } else {
                appConfig[name] = exp;
            }
        });
        // load env configuation
        for (const n in appConfig) {
            if (n && tempConfig[`${n}_${process.env.KOATTY_ENV}`]) {
                appConfig[n] = helper.extend(appConfig[n], tempConfig[`${n}_${process.env.KOATTY_ENV}`], true);
            }
        }

        app.setMap("configs", helper.extend(config, appConfig, true));
    }

    /**
     * Load middlewares
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @param {(string | string[])} [loadPath]
     * @memberof Loader
     */
    public static loadMiddlewares(app: any, container: Container, loadPath?: string | string[]) {
        const configs = app.getMap("configs") || {};
        //default middleware list
        const defaultList = ["Static", "Payload"];
        //Mount default middleware
        Loader.loadDirectory(loadPath || "./middleware", app.think_path);
        //Mount application middleware
        // const middlewares: any = {};
        const appMeddlewares = listModule(MIDDLEWARE_KEY) || [];

        appMeddlewares.map((item: {
            id: string;
            target: any;
        }) => {
            item.id = (item.id || "").replace(`${MIDDLEWARE_KEY}:`, "");
            if (item.id && helper.isClass(item.target)) {
                container.reg(item.target, { scope: "Request", type: "MIDDLEWARE" });
                // middlewares[item.id] = item.target;
            }
        });


        const middlewareConfList = configs.middleware && configs.middleware.list ? configs.middleware.list || [] : [];
        const bandList = ["Trace", ...defaultList];
        middlewareConfList.map((item: any) => {
            if (!bandList.includes(item)) {
                defaultList.push(item);
            }
        });

        //de-duplication
        const appMList = [...new Set(defaultList)];
        //Mount the middleware on first
        appMList.unshift("Trace");

        //Automatically call middleware
        let handle: any;
        configs.middleware = configs.middleware || { config: {} };
        appMList.forEach((key) => {
            handle = container.get(key, MIDDLEWARE_KEY);
            if (!handle) {
                throw new Error(`middleware ${key} load error.`);
                return;
            }
            if (!helper.isFunction(handle.run)) {
                throw new Error(`middleware ${key} must be implements method 'run'.`);
                return;
            }
            if (configs.middleware.config[key] === false) {
                return;
            }
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.custom("think", "", `Load middleware: ${key}`);
            if (handle.run.length < 3) {
                app.use(handle.run(configs.middleware.config[key] || {}, app));
            } else {
                app.useExp(handle.run(configs.middleware.config[key] || {}, app));
            }
        });

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
        const componentList = listModule(COMPONENT_KEY);

        componentList.map((item: any) => {
            item.id = (item.id || "").replace(`${COMPONENT_KEY}:`, "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load component: ${item.id}`);
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
        const serviceList = listModule(SERVICE_KEY);

        serviceList.map((item: any) => {
            item.id = (item.id || "").replace(`${SERVICE_KEY}:`, "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load service: ${item.id}`);
                const cls = container.reg(item.target, { scope: "Singleton", type: "SERVICE" });
                if (!(cls instanceof Base)) {
                    throw new Error(`class ${item.id} does not inherit from Base`);
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
        const controllerList = listModule(CONTROLLER_KEY);

        const controllers: any = {};
        controllerList.map((item: any) => {
            item.id = (item.id || "").replace(`${CONTROLLER_KEY}:`, "");
            if (item.id && helper.isClass(item.target)) {
                // tslint:disable-next-line: no-unused-expression
                process.env.APP_DEBUG && logger.custom("think", "", `Load controller: ${item.id}`);

                const ctl = container.reg(item.target, { scope: "Request", type: "CONTROLLER" });
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


