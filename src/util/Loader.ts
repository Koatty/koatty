/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-12 09:38:54
 */
import * as globby from 'globby';
import * as path from 'path';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Container } from '../core/Container';
import { listModule } from '../core/Injectable';
import { COMPONENT_KEY, CONTROLLER_KEY, MIDDLEWARE_KEY } from '../core/Constants';
import { Base } from '../core/Base';
import { BaseController } from '../controller/BaseController';

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
        Loader.loadDirectory('./config', app.think_path, function (name: string, exp: any) {
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

        let id: string;
        componentList.map((item: any) => {
            id = (item.id || '').replace(`${COMPONENT_KEY}:`, '');
            const ctl = container.reg(item.target);
            if (!(ctl instanceof Base)) {
                logger.error(`class ${id} does not inherit the class Base`);
                process.exit();
            }
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

        const controllers: any = {};
        controllerList.map((item: any) => {
            item.id = (item.id || '').replace(`${CONTROLLER_KEY}:`, '');
            if (item.id && helper.isClass(item.target)) {
                const ctl = container.reg(item.target, { scope: 'Request' });
                if (!(ctl instanceof BaseController)) {
                    logger.error(`class ${item.id} does not inherit the class BaseController`);
                    process.exit();
                }
                controllers[item.id] = item.target;
            }
        });
        helper.define(app._caches, 'controllers', controllers);
    }

    /**
     * Load middleware
     *
     * @static
     * @param {*} app
     * @param {Container} container
     * @memberof Loader
     */
    public static loadMiddlewares(app: any, container: Container) {
        const configs = app._caches.configs || {};
        //default middleware list
        const defaultList = ['Static', 'Payload'];
        //Mount default middleware
        Loader.loadDirectory('./middleware', app.think_path);
        //Mount application middleware
        const middlewares: any = {};
        const appMeddlewares = listModule(MIDDLEWARE_KEY) || [];

        appMeddlewares.map((item) => {
            item.id = (item.id || '').replace(`${MIDDLEWARE_KEY}:`, '');
            if (item.id && helper.isClass(item.target)) {
                container.reg(item.target, { scope: 'Request' });
                middlewares[item.id] = item.target;
            }
        });


        const middlewareConfList = configs.middleware && configs.middleware.list ? configs.middleware.list || [] : [];
        const bandList = ['Router', 'Trace', ...defaultList];
        middlewareConfList.map((item: any) => {
            if (!bandList.includes(item)) {
                defaultList.push(item);
            }
        });

        //de-duplication
        const appMList = [...new Set(defaultList)];
        //Mount the Router middleware
        appMList.push('Router');
        //Mount the trace middleware on first
        appMList.unshift('Trace');

        //Automatically call middleware 
        let handle: any;
        configs.middleware = configs.middleware || { config: {} };
        appMList.forEach((key) => {
            handle = container.get(key, MIDDLEWARE_KEY);
            if (!handle) {
                logger.error(`middleware ${key} load error.`);
                return;
            }
            if (!helper.isFunction(handle.run)) {
                logger.error(`middleware ${key} must be implements method 'run'.`);
                return;
            }
            if (configs.middleware.config[key] === false) {
                return;
            }
            if (handle.run.length < 3) {
                app.use(handle.run(configs.middleware.config[key] || {}, app));
            } else {
                app.useExp(handle.run(configs.middleware.config[key] || {}, app));
            }
        });
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
            const fileResults = globby.sync(['**/**.js', '**/**.ts', '!**/**.d.ts'].concat(pattern || []), {
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
                // let namePattern = '.ts';
                // // tslint:disable-next-line: no-magic-numbers
                // if (name.slice(-3) === '.js') {
                //     namePattern = '.js';
                // }
                // const fileName = name.slice(0, name.lastIndexOf(namePattern));
                // tslint:disable-next-line: no-magic-numbers
                const fileName = name.slice(0, -3);
                //
                const tkeys = Object.keys(exports);
                if (!exports[fileName] && (tkeys[0] && helper.isClass(exports[tkeys[0]]) && tkeys[0] !== fileName)) {
                    logger.error(`The class name is not consistent with the file('${file}') name. Or you used 'export default'`);
                    continue;
                }

                if (fn) {
                    // console.log(fileName);
                    // console.log(exports); 
                    fn(fileName, exports);
                }
            }
        }
    }
}


