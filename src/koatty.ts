/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-04 11:48:04
 */

import * as path from "path";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { PREVENT_NEXT_PROCESS } from './core/Constants';
const pkg = require('../package.json');
const Koa = require("koa");

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

interface InitOptions {
    root_path?: string;
    app_path?: string;
    app_debug?: boolean;
}

class Application extends Koa {
    public root_path: string;
    public app_path: string;
    public think_path: string;
    public app_debug: boolean;
    public options: InitOptions;
    private _caches: any;

    public constructor(options: InitOptions) {
        super();
        this.options = options;
        this.init();
        // initialize
        this.initialize(this.options);
    }

    /**
     * app custom init, must be defined options
     */
    public init() { }

    /**
     * initialize env
     * @param options 
     */
    public initialize(options: InitOptions = {}) {
        // check env
        checkEnv();
        // define path        
        this.root_path = this.root_path || options.root_path || process.env.root_path || process.cwd();
        this.app_path = this.app_path || path.resolve(this.root_path, options.app_path || process.env.app_path || 'app');
        this.think_path = path.dirname(__dirname);
        helper.define(this, 'root_path', this.root_path);
        helper.define(this, 'app_path', this.app_path);
        helper.define(this, 'think_path', this.think_path);

        process.env.ROOT_PATH = this.root_path;
        process.env.APP_PATH = this.app_path;
        process.env.THINK_PATH = this.think_path;

        //production env is default
        process.env.NODE_ENV = 'production';
        // if ((process.execArgv.indexOf('--production') > -1) || (process.env.NODE_ENV === 'production')) {
        //     this.app_debug = false;
        //     process.env.NODE_ENV = 'production';
        // }
        //debug mode: node --debug index.js
        this.app_debug = this.app_debug || options.app_debug || false;
        if (this.app_debug || process.execArgv.indexOf('--debug') > -1) {
            this.app_debug = true;
            process.env.NODE_ENV = 'development';
        }
        process.env.APP_DEBUG = helper.toString(this.app_debug);

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
     * @param {function} fn 
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
            // tslint:disable-next-line: no-null-keyword
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
        //emit app ready
        this.emit('appReady');

        //start server
        //port?: number, hostname?: string, listeningListener?: Function
        const port = this.config('app_port') || '3000';
        const hostname = this.config('app_hostname') || '0.0.0.0';
        const app_debug = this.app_debug || false;

        return super.listen(port, hostname, function () {
            console.log('  ________    _       __   __ \n /_  __/ /_  (_)___  / /__/ /______  ____ _\n  / / / __ \\/ / __ \\/ //_/ //_/ __ \\/ __ `/\n / / / / / / / / / / ,< / /,</ /_/ / /_/ /\n/_/ /_/ /_/_/_/ /_/_/|_/_/ |_\\____/\\__,_/');
            console.log(`                     https://ThinkKoa.org/`);
            logger.custom('think', '', '====================================');
            logger.custom('think', '', `Nodejs Version: ${process.version}`);
            logger.custom('think', '', `${pkg.name} Version: v${pkg.version}`);
            logger.custom('think', '', `App Enviroment: ${app_debug ? 'debug mode' : 'production mode'}`);
            logger.custom('think', '', `Server running at http://${hostname}:${port}/`);
            logger.custom('think', '', '====================================');
            // tslint:disable-next-line: no-unused-expression
            app_debug && logger.warn(`Running in debug mode, please modify the app_debug value to false when production env.`);
        }).on('clientError', function (err: any, sock: any) {
            // logger.error('Bad request, HTTP parse error');
            sock.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
    }

    /**
     * registration exception handling
     * 
     * @memberof ThinkKoa
     */
    private captureError() {
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


const propertys = ['constructor', 'init'];
export const Koatty = new Proxy(Application, {
    set(target, key, value, receiver) {
        if (Reflect.get(target, key, receiver) === undefined) {
            return Reflect.set(target, key, value, receiver);
        } else if (key === 'init') {
            return Reflect.set(target, key, value, receiver);
        } else {
            throw Error('Cannot redefine getter-only property');
        }
    },
    deleteProperty(target, key) {
        throw Error('Cannot delete getter-only property');
    },
    construct(target, args, newTarget) {
        Reflect.ownKeys(target.prototype).map((n) => {
            if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
                throw Error(`Cannot override the final method '${helper.toString(n)}'`);
            }
        });
        return Reflect.construct(target, args, newTarget);
    }
});