/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-24 19:31:58
 */
import * as globby from 'globby';
import * as path from 'path';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Container } from '../core/Container';
import { listModule } from '../core/Injectable';
import { COMPONENT_KEY, CONTROLLER_KEY, MIDDLEWARE_KEY } from '../core/Constants';

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
        Loader.loadDirectory('./src/config', app.think_path, function (name: string, exp: any) {
            config[name] = exp.default ? exp.default : exp;
        });
        const appConfig: any = {};
        if (helper.isArray(loadPath)) {
            loadPath = loadPath.length > 0 ? loadPath : '';
        }
        Loader.loadDirectory(loadPath || './config', app.app_path, function (name: string, exp: any) {
            appConfig[name] = exp.default ? exp.default : exp;
        });

        app._caches.configs = helper.extend(config, appConfig, true);
    }

    /**
     * Load the component
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadCmponents(app: any, container: Container) {
        const componentList = listModule(COMPONENT_KEY);
        console.log('componentList', JSON.stringify(componentList));
        componentList.map((item: any) => {
            container.reg(item.target);
        });
    }

    /**
     * Load the controller
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadControllers(app: any, container: Container) {
        const controllerList = listModule(CONTROLLER_KEY);
        console.log('controllerList', controllerList);

        helper.define(app._caches, 'controllers', []);
        controllerList.map((item: any) => {
            app._caches.controllers.push((item.id || '').replace(`${CONTROLLER_KEY}:`, ''));
            container.reg(item.target);
        });
    }

    /**
     * Load middleware
     *
     * @static
     * @param {*} app
     * @param {boolean} [run=true]
     * @memberof Loader
     */
    public static loadMiddlewares(app: any, run = true) {
        const configs = app._caches.configs || {};
        //default middleware list
        const defaultList = ['Static', 'Payload'];
        //Mount application middleware
        const middlewares: any = {};
        const appMeddlewares = listModule(MIDDLEWARE_KEY) || [];

        appMeddlewares.map(item => {
            item.id = (item.id || '').replace(`${MIDDLEWARE_KEY}:`, '');
            if (item.id) {
                middlewares[item.id] = item.target;
            }
        });
        //Mount default middleware
        Loader.loadDirectory('./src/middleware', app.think_path, function (name: string, exp: any) {
            middlewares[name] = exp.default ? exp.default : exp;
        });
        console.log('middlewares', middlewares);

        const middlewareConfList = configs.middleware && configs.middleware.list ? configs.middleware.list || [] : [];
        middlewareConfList.map((item: any) => {
            if (!defaultList.includes(item) && !['Router', 'Trace'].includes(item)) {
                defaultList.push(item);
            }
        });

        //de-duplication
        const appMList = [...new Set(defaultList)];
        //Mount the Router middleware
        appMList.push('Router');
        //Mount the trace middleware on first
        appMList.unshift('Trace');
        console.log('appMList', appMList);

        //Automatically call middleware 
        if (run) {
            appMList.forEach((key) => {
                if (!key || !helper.isFunction(middlewares[key])) {
                    logger.error(`middleware ${key} load error, please check the middleware`);
                    return;
                }
                if (configs.middleware.config[key] === false) {
                    return;
                }
                if (middlewares[key].length < 3) {
                    app.use(middlewares[key](configs.middleware.config[key] || {}, app));
                } else {
                    app.useExp(middlewares[key](configs.middleware.config[key] || {}, app));
                }
            });
        }
        helper.define(app._caches, 'middlewares', middlewares);
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
            const fileResults = globby.sync(['**/**.ts', '!**/**.d.ts'].concat(pattern || []), {
                cwd: dir,
                ignore: [
                    '**/node_modules/**',
                    '**/logs/**',
                    '**/run/**',
                    '**/static/**'
                ].concat(ignore || [])
            });
            for (let name of fileResults) {
                const file = path.join(dir, name);
                const exports = require(file);
                if (name.indexOf('/') > -1) {
                    name = name.slice(name.lastIndexOf('/') + 1);
                }
                const fileName = name.slice(0, name.lastIndexOf('.ts'));
                if (fn) {
                    // console.log(fileName);
                    // console.log(exports); 
                    fn(fileName, exports);
                }
            }
        }
    }
}


