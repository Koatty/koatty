/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-16 20:13:57
 */
import * as globby from 'globby';
import * as path from 'path';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Container } from '../core/Container';
import { RequestContainer } from '../core/RequestContainer';
import { listModule } from '../core/Injectable';
import { COMPONENT_KEY, CONTROLLER_KEY, MIDDLEWARE_KEY, CONFIG_KEY } from '../core/Constants';
//auto load config
const loaderConf = {
    'configs': {
        root: 'config',
        fn: function (name: string, exp: any) {
            app._caches.configs[name] = exp;
        }
    },
    'controllers': {
        root: 'controller',
        prefix: ''
    },
    'middlewares': {
        root: 'middleware',
        prefix: ''
    },
    'models': {
        root: 'model',
        prefix: ''
    },
    'services': {
        root: 'service',
        prefix: ''
    }
};
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
            // const componentList = listModule(COMPONENT_KEY);
            // console.log('componentList', JSON.stringify(componentList));
            // const container = new Container(app);
            // componentList.map((item: any) => {
            //     container.reg(item.target);
            // });

            // const controllerList = listModule(CONTROLLER_KEY);
            // console.log('controllerList', controllerList);
            // const requestContainer = new RequestContainer(app, ctx);

            // const middlewareList = listModule(MIDDLEWARE_KEY);
            // console.log('middlewareList', middlewareList);

            // const allList = [...controllerList, ...middlewareList];
            // allList.map((item: any) => {
            //     requestContainer.reg(item.target);
            // });

            Loader.loadConfigs(app);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Load configuration
     *
     * @param {any} app
     */
    public static loadConfigs(app: any) {
        app._caches.configs = {};
        Loader.loadDirectory([app.think_path,]);
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
    }

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

    public static loadFiles(files: string[], dir: string) {

    }

    /**
     * 
     * @param loadDir 
     * @param pattern 
     * @param ignore 
     */
    public static loadDirectory(loadDir: string,
        fn?: Function,
        baseDir?: string,
        pattern?: string | string[],
        ignore?: string | string[]) {

        baseDir = baseDir || process.cwd();
        loadDir = buildLoadDir(baseDir, loadDir);
        const loadDirs = [].concat(loadDir || []);

        for (const dir of loadDirs) {
            const fileResults = globby.sync(['**/**.ts', '!**/**.d.ts'].concat(pattern || []), {
                cwd: dir,
                ignore: [
                    '**/node_modules/**',
                    '**/logs/**',
                    '**/run/**',
                    '**/static/**'
                ].concat(ignore || [])
            });
            for (const name of fileResults) {
                const file = path.join(dir, name);
                const exports = require(file);
                if (fn) {
                    const fileName = name.slice(0, name.lastIndexOf('.ts'));
                    // console.log(fileName);
                    // console.log(exports); 
                    fn(fileName, exports);
                }
            }
        }
    }
}


