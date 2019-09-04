/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-02 19:31:37
 */
import * as globby from 'globby';
import * as path from 'path';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Container } from '../core/Container';
import { RequestContainer } from '../core/RequestContainer';
import { listModule } from '../core/Injectable';
import { COMPONENT_KEY, CONTROLLER_KEY, MIDDLEWARE_KEY } from '../core/Constants';


//default middleware list
const defaultList = ['static', 'payload', 'router'];


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
     *
     *
     * @static
     * @param {*} app
     * @param {*} [ctx]
     * @memberof Loader
     */
    public static loadModule(app: any, ctx?: any) {
        try {
            const componentList = listModule(COMPONENT_KEY);
            console.log('componentList', JSON.stringify(componentList));
            const container = new Container(app);
            componentList.map((item: any) => {
                container.reg(item.target);
            });

            const controllerList = listModule(CONTROLLER_KEY);
            console.log('controllerList', controllerList);
            const requestContainer = new RequestContainer(app, ctx);

            const middlewareList = listModule(MIDDLEWARE_KEY);
            console.log('middlewareList', middlewareList);

            const allList = [...controllerList, ...middlewareList];
            allList.map((item: any) => {
                requestContainer.reg(item.target);
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Load configuration
     *
     * @param {any} app
     */
    // public static loadConfigs(app: any) {
    //     let configs = thinkLoader(app.think_path + '/lib', loaderConf.configs);
    //     configs = helper.extend(configs, thinkLoader(app.app_path, loaderConf.configs), true);
    //     //日志路径
    //     if (configs.config) {
    //         process.env.LOGS = configs.config.logs || false;
    //         process.env.LOGS_PATH = configs.config.logs_path || app.root_path + '/logs';
    //         process.env.LOGS_LEVEL = configs.config.logs_level || [];
    //     }
    //     // lib.define(app._caches, 'configs', configs);
    //     // tslint:disable-next-line: no-null-keyword
    //     app._caches.configs = null;
    //     app._caches.configs = configs;
    //     //向下兼容
    //     app.configs = app._caches.configs;
    // }

    // /**
    //  * Load middleware
    //  * 
    //  * @param {any} app 
    //  * @param {boolean} [run=true] 
    //  */
    // public static loadMiddlewares(app: any, run = true) {
    //     const configs = app._caches.configs || {};

    //     //Mount application middleware
    //     if (configs.middleware.list && configs.middleware.list.length > 0) {
    //         configs.middleware.list.forEach((item: string) => {
    //             if (item !== 'trace' && item !== 'controller') {
    //                 defaultList.push(item);
    //             }
    //         });
    //     }
    //     //de-duplication
    //     const appMList = [...new Set(defaultList)];
    //     //Mount the controller middleware
    //     appMList.push('controller');
    //     //Mount the trace middleware on first
    //     appMList.unshift('trace');

    //     const middlewares = thinkLoader(app.think_path + '/lib', loaderConf.middlewares);
    //     //Load the application middleware
    //     const appMiddlewares = thinkLoader(app.app_path, loaderConf.middlewares);
    //     for (const n in appMiddlewares) {
    //         if (!middlewares[n]) {
    //             middlewares[n] = appMiddlewares[n];
    //         } else {
    //             logger.error(`Cannot override the default middleware ${n}`);
    //         }
    //     }
    //     helper.define(app, 'middlewares', middlewares);

    //     //Automatically call middleware 
    //     if (run) {
    //         appMList.forEach((key) => {
    //             if (!key || !helper.isFunction(middlewares[key])) {
    //                 logger.error(`middleware ${key} load error, please check the middleware`);
    //                 return;
    //             }
    //             if (configs.middleware.config[key] === false) {
    //                 return;
    //             }
    //             if (configs.middleware.config[key] === true) {
    //                 if (middlewares[key].length < 3) {
    //                     app.use(middlewares[key]({}, app));
    //                 } else {
    //                     app.useExp(middlewares[key]({}, app));
    //                 }
    //                 return;
    //             }
    //             if (middlewares[key].length < 3) {
    //                 app.use(middlewares[key](configs.middleware.config[key] || {}, app));
    //             } else {
    //                 app.useExp(middlewares[key](configs.middleware.config[key] || {}, app));
    //             }
    //         });
    //     }
    // }

    // /**
    //  * Load the controller
    //  * 
    //  * @param {any} app 
    //  */
    // public static loadControllers() {

    // }

    public static loadDirectory(loadOpts: {
        baseDir?: string;
        loadDir?: string | string[];
        pattern?: string;
        ignore?: string;
        configLocations?: string[];
    } = {}) {
        // use baseDir in parameter first
        const baseDir = loadOpts.baseDir || process.cwd();
        let defaultLoadDir: any = [];
        if (!Array.isArray(loadOpts.loadDir)) {
            defaultLoadDir.push(loadOpts.loadDir);
        } else {
            defaultLoadDir = loadOpts.loadDir;
        }

        defaultLoadDir = defaultLoadDir.map((dir: string) => {
            return buildLoadDir(baseDir, dir);
        });

        Loader.load(defaultLoadDir, loadOpts.pattern, loadOpts.ignore);
    }

    /**
     * 
     * @param loadDir 
     * @param pattern 
     * @param ignore 
     */
    public static load(loadDir: string | string[],
        pattern?: string | string[],
        ignore?: string | string[]) {
        const loadDirs = [].concat(loadDir || []);

        for (const dir of loadDirs) {
            const fileResults = globby.sync(['**/**.ts', '**/**.tsx', '**/**.js', '!**/**.d.ts'].concat(pattern || []), {
                cwd: dir,
                ignore: [
                    '**/node_modules/**',
                    '**/logs/**',
                    '**/run/**',
                    '**/static/**'
                ].concat(ignore || [])
            });

            for (const name of fileResults) {
                let fileName = name.slice(0, name.lastIndexOf('.ts'));
                console.log(fileName);

                const file = path.join(dir, name);
                const exports = require(file);
                console.log(exports.name);
            }
        }
    }
}


