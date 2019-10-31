/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-31 09:59:10
 */

import * as path from "path";
import * as Koa from "koa";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { PREVENT_NEXT_PROCESS } from './core/Constants';
import { Container } from './core/Container';
const pkg = require('../package.json');

/**
 *
 * @interface BaseApp
 * @extends {Koa}
 */
interface BaseApp extends Koa {
    readonly root_path: string;
    readonly app_path: string;
    readonly think_path: string;
    readonly app_debug: boolean;
    readonly options: InitOptions;
    readonly config: (name: string, type?: string) => any;
    readonly prevent: () => Promise<never>;
    readonly isPrevent: (err: any) => boolean;
    readonly useExp: (fn: Function) => any;
    readonly Container: Container;
}

/**
 * check node version
 * @return {void} []
 */
const checkEnv = () => {
    let node_engines = pkg.engines.node.slice(1) || '10.0.0';
    node_engines = node_engines.slice(0, node_engines.lastIndexOf('.'));
    let nodeVersion = process.version;
    if (nodeVersion[0] === 'v') {
        nodeVersion = nodeVersion.slice(1);
    }
    nodeVersion = nodeVersion.slice(0, nodeVersion.lastIndexOf('.'));

    if (helper.toNumber(node_engines) > helper.toNumber(nodeVersion)) {
        logger.error(`ThinkKoa need node version > ${node_engines}, current version is ${nodeVersion}, please upgrade it.`);
        process.exit(-1);
    }
};

/**
 * Convert express middleware for koa
 * 
 * @param {function} fn 
 * @returns 
 * @memberof ThinkKoa
 */
const parseExp = function (fn: Function) {
    return function (ctx: any, next: any) {
        if (fn.length < 3) {
            fn(ctx.req, ctx.res);
            return next();
        } else {
            return new Promise((resolve, reject) => {
                fn(ctx.req, ctx.res, (err: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(next());
                    }
                });
            });
        }
    };
};

/**
 *
 * @interface InitOptions
 */
interface InitOptions {
    root_path?: string;
    app_path?: string;
    app_debug?: boolean;
}

/**
 * Application
 * @export
 * @class Koatty
 * @extends {Koa}
 * @implements {BaseApp}
 */
export class Koatty extends Koa.default implements BaseApp {
    public root_path: string;
    public app_path: string;
    public think_path: string;
    public app_debug: boolean;
    public options: InitOptions;
    public Container: Container;
    private _caches: any;

    protected constructor(options: InitOptions) {
        super();
        this.options = options || {};
        this.init();
        // initialize
        this.initialize();
    }

    /**
     * app custom init, must be defined options
     */
    public init() { }

    /**
     * initialize env
     */
    private initialize() {
        //development env is default
        this.app_debug = (this.options && this.options.app_debug) || this.app_debug || true;
        process.env.NODE_ENV = 'development';
        const env = JSON.stringify(process.execArgv);
        //production mode
        if ((env.indexOf('--production') > -1) || (process.env.NODE_ENV === 'production')) {
            this.app_debug = false;
            process.env.NODE_ENV = 'production';
        }
        if (env.indexOf('ts-node') < 0 && env.indexOf('--inspect') < 0) {
            this.app_debug = false;
            process.env.NODE_ENV = 'production';
        }
        process.env.APP_DEBUG = helper.toString(this.app_debug);

        // check env
        checkEnv();
        // define path        
        const root_path = (this.options && this.options.root_path) || this.root_path || process.cwd();
        const app_path = this.app_path || (this.options && this.options.app_path) || path.resolve(root_path, env.indexOf('ts-node') > -1 ? 'src' : 'dist');
        const think_path = __dirname;
        helper.define(this, 'root_path', root_path);
        helper.define(this, 'app_path', app_path);
        helper.define(this, 'think_path', think_path);

        process.env.ROOT_PATH = this.root_path;
        process.env.APP_PATH = this.app_path;
        process.env.THINK_PATH = this.think_path;

        // caches handle
        Object.defineProperty(this, '_caches', {
            value: {},
            writable: true,
            configurable: false,
            enumerable: false
        });
    }

    /**
     * Use the given koa middleware `fn`.
     * support generator func
     * @param {any} fn
     * @returns {any}
     * @memberof ThinkKoa
     */
    public use(fn: any): any {
        if (helper.isGenerator(fn)) {
            fn = helper.generatorToPromise(fn);
        }
        return super.use(fn);
    }

    /**
     * Use the given Express middleware `fn`.
     * 
     * @param {function} fn 
     * @returns {any}
     * @memberof ThinkKoa
     */
    public useExp(fn: Function): any {
        fn = parseExp(fn);
        return this.use(fn);
    }


    /**
     * Prevent next process
     * 
     * @returns {any}
     * @memberof ThinkKoa
     */
    public prevent() {
        return Promise.reject(new Error(PREVENT_NEXT_PROCESS));
    }

    /**
     * Check is prevent error
     * 
     * @param {any} err 
     * @returns {any}
     * @memberof ThinkKoa
     */
    public isPrevent(err: any) {
        return helper.isError(err) && err.message === PREVENT_NEXT_PROCESS;
    }

    /**
     * Read app configuration
     * 
     * @param {any} name 
     * @param {string} [type='config'] 
     * @memberof ThinkKoa
     */
    public config(name: string, type = 'config') {
        try {
            const caches = this._caches.configs || {};
            // tslint:disable-next-line: no-unused-expression
            caches[type] || (caches[type] = {});
            if (name === undefined) {
                return caches[type];
            }
            if (helper.isString(name)) {
                //name不含. 一级
                if (name.indexOf('.') === -1) {
                    return caches[type][name];
                } else { //name包含. 二级
                    const keys = name.split('.');
                    const value = caches[type][keys[0]] || {};
                    return value[keys[1]];
                }
            } else {
                return caches[type][name];
            }
        } catch (err) {
            logger.error(err);
            return null;
        }
    }

    /**
     * Shorthand for:
     * http.createServer(app.callback()).listen(...)
     */
    public listen() {
        //catch error
        this.captureError();

        //start server
        //port?: number, hostname?: string, listeningListener?: Function
        const port = this.config('app_port') || '3000';
        const hostname = this.config('app_hostname') || '';
        const app_debug = this.app_debug || false;

        return super.listen(port, hostname, function () {
            logger.custom('think', '', `Nodejs Version: ${process.version}`);
            logger.custom('think', '', `${pkg.name} Version: v${pkg.version}`);
            logger.custom('think', '', `App Enviroment: ${app_debug ? 'debug mode' : 'production mode'}`);
            logger.custom('think', '', `Server running at http://${hostname || 'localhost'}:${port}/`);
            logger.custom('think', '', '====================================');
            // tslint:disable-next-line: no-unused-expression
            app_debug && logger.warn(`Running in debug mode, please modify the app_debug value to false when production env.`);
        }).on('clientError', function (err: any, sock: any) {
            // logger.error('Bad request, HTTP parse error');
            sock.end('400 Bad Request\r\n\r\n');
        });
    }

    /**
     * registration exception handling
     * 
     * @memberof ThinkKoa
     */
    private captureError(): void {
        const configs = this._caches.configs || {};
        //日志
        if (configs.config) {
            process.env.LOGS = configs.config.logs || false;
            process.env.LOGS_PATH = configs.config.logs_path || this.root_path + '/logs';
            process.env.LOGS_LEVEL = configs.config.logs_level || [];
        }

        //koa error
        this.removeAllListeners('error');
        this.on('error', (err: any) => {
            if (!this.isPrevent(err)) {
                logger.error(err);
            }
            return;
        });
        //warning
        process.removeAllListeners('warning');
        process.on('warning', (warning) => {
            logger.warn(helper.toString(warning));
            return;
        });

        //promise reject error
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', (reason) => {
            if (!this.isPrevent(reason)) {
                logger.error(helper.toString(reason));
            }
            return;
        });
        //ubcaugth exception
        process.removeAllListeners('uncaughtException');
        process.on('uncaughtException', (err) => {
            if (err.message.indexOf('EADDRINUSE') > -1) {
                logger.error(helper.toString(err));
                process.exit(-1);
            }
            if (!this.isPrevent(err)) {
                logger.error(helper.toString(err));
            }
            return;
        });
    }
}

// const propertys = ['constructor', 'init'];
// export const Koatty = new Proxy(Application, {
//     set(target, key, value, receiver) {
//         if (Reflect.get(target, key, receiver) === undefined) {
//             return Reflect.set(target, key, value, receiver);
//         } else if (key === 'init') {
//             return Reflect.set(target, key, value, receiver);
//         } else {
//             throw Error('Cannot redefine getter-only property');
//         }
//     },
//     deleteProperty(target, key) {
//         throw Error('Cannot delete getter-only property');
//     },
//     construct(target, args, newTarget) {
//         Reflect.ownKeys(target.prototype).map((n) => {
//             if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
//                 throw Error(`Cannot override the final method '${helper.toString(n)}'`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
