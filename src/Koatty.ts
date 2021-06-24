/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:21:37
 */

import * as path from "path";
import Koa from "koa";
import { IncomingMessage, ServerResponse } from 'http';
import { Namespace } from "cls-hooked";
import { Helper } from "./util/Helper";
import { Logger } from "./util/Logger";
import { Exception, HttpStatusCode, HttpStatusCodeMap, isPrevent } from "./core/Exception";

const pkg = require("../package.json");

/**
 * check node version
 * @return {void} []
 */
const checkEnv = () => {
    let nodeEngines = pkg.engines.node.slice(1) ?? '10.0.0';
    nodeEngines = nodeEngines.slice(0, nodeEngines.lastIndexOf('.'));
    let nodeVersion = process.version;
    if (nodeVersion[0] === 'v') {
        nodeVersion = nodeVersion.slice(1);
    }
    nodeVersion = nodeVersion.slice(0, nodeVersion.lastIndexOf('.'));

    if (Helper.toNumber(nodeEngines) > Helper.toNumber(nodeVersion)) {
        Logger.Error(`Koatty need node version > ${nodeEngines}, current version is ${nodeVersion}, please upgrade it.`);
        process.exit(-1);
    }
};

/**
 * Convert express middleware for koa
 *
 * @param {function} fn
 * @returns
 * @memberof Koatty
 */
const parseExp = function (fn: Function) {
    return function (ctx: KoattyContext, next: Function) {
        if (fn.length < 3) {
            fn(ctx.req, ctx.res);
            return next();
        }
        return new Promise((resolve, reject) => {
            fn(ctx.req, ctx.res, (err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(next());
                }
            });
        });

    };
};

/**
 *
 * @interface InitOptions
 */
interface InitOptions {
    rootPath?: string;
    appPath?: string;
    appDebug?: boolean;
}

/**
 * Koatty Context.
 *
 * @export
 * @interface KoattyContext
 * @extends {Koa.Context}
 */
export interface KoattyContext extends Koa.Context {

    /**
     * Request body parser
     *
     * @memberof KoattyContext
     */
    bodyParser: () => Promise<Object>;

    /**
     * QueryString parser
     *
     * @memberof KoattyContext
     */
    queryParser: () => Object;


    /**
     * Replace ctx.throw
     *
     * @type {(status: number, message?: string)}
     * @type {(message: string, code?: number, status?: HttpStatusCode)}
     * @memberof KoattyContext
     */
    throw(status: number, message?: string): never;
    throw(message: string, code?: number, status?: HttpStatusCode): never;
}

/**
 * Application
 * @export
 * @class Koatty
 * @extends {Koa}
 * @implements {BaseApp}
 */
export class Koatty extends Koa {
    public env: string;
    public rootPath: string;
    public appPath: string;
    public thinkPath: string;
    public appDebug: boolean;
    public options: InitOptions;
    public trace: Namespace;

    private handelMap: Map<string, unknown>;

    protected constructor(options: InitOptions) {
        super();
        this.options = options ?? {};
        this.init();
        this.handelMap = new Map<string, unknown>();
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
        // development env is default
        this.appDebug = !!(this.options.appDebug ?? this.appDebug);

        const env = (process.execArgv ?? []).join(",");
        if (env.indexOf('ts-node') > -1 || env.indexOf('--debug') > -1) {
            this.appDebug = true;
        }
        // app.env
        this.env = process.env.KOATTY_ENV ?? process.env.NODE_ENV;
        if ((env.indexOf('--production') > -1) || ((this.env ?? '').indexOf('pro') > -1)) {
            this.appDebug = false;
        }

        if (this.appDebug) {
            this.env = 'development';
            process.env.NODE_ENV = 'development';
            process.env.APP_DEBUG = 'true';
            Logger.setLevel("DEBUG");
        } else {
            this.env = 'production';
            process.env.NODE_ENV = 'production';
            Logger.setLevel("INFO");
        }

        // check env
        checkEnv();
        // catch error
        this.captureError();
        // define path
        const rootPath = (this.options?.rootPath) ?? this.rootPath ?? process.cwd();
        const appPath = this.appPath ?? (this.options?.appPath) ?? path.resolve(rootPath, env.indexOf('ts-node') > -1 ? 'src' : 'dist');
        const thinkPath = __dirname;
        Helper.define(this, 'rootPath', rootPath);
        Helper.define(this, 'appPath', appPath);
        Helper.define(this, 'thinkPath', thinkPath);

        process.env.ROOT_PATH = this.rootPath;
        process.env.APP_PATH = this.appPath;
        process.env.THINK_PATH = this.thinkPath;

        // Compatible with old version
        Helper.define(this, 'root_path', rootPath);
        Helper.define(this, 'app_path', appPath);
        Helper.define(this, 'think_path', thinkPath);
        Reflect.defineProperty(this, '_caches', {
            value: {},
            writable: true,
            configurable: false,
            enumerable: false,
        });
    }

    /**
     * Set application cache
     *
     * @param {string} key
     * @param {*} value
     * @memberof Koatty
     */
    setMap(key: string, value: any) {
        return this.handelMap.set(key, value);
    }

    /**
     * Get application cache by key
     *
     * @param {string} key
     * @memberof Koatty
     */
    getMap(key: string): any {
        return this.handelMap.get(key);
    }

    /**
     * Use the given koa middleware `fn`.
     * support generator func
     * @param {Function} fn
     * @returns {any}
     * @memberof Koatty
     */
    public use(fn: any): any {
        if (!Helper.isFunction) {
            Logger.Error('The paramter is not a function.');
            return;
        }
        return super.use(fn);
    }

    /**
     * Use the given Express middleware `fn`.
     *
     * @param {function} fn
     * @returns {any}
     * @memberof Koatty
     */
    public useExp(fn: Function): any {
        if (!Helper.isFunction) {
            Logger.Error('The paramter is not a function.');
            return;
        }
        fn = parseExp(fn);
        return this.use(fn);
    }

    /**
     * Read app configuration
     *
     * @param {any} name
     * @param {string} [type="config"]
     * @memberof Koatty
     */
    public config(name: string, type = 'config') {
        try {
            const caches = this.getMap('configs') ?? {};
            // tslint:disable-next-line: no-unused-expression
            caches[type] ?? (caches[type] = {});
            if (name === undefined) {
                return caches[type];
            }
            if (Helper.isString(name)) {
                // name不含. 一级
                if (name.indexOf('.') === -1) {
                    return caches[type][name];
                }  // name包含. 二级
                const keys = name.split('.');
                const value = caches[type][keys[0]] ?? {};
                return value[keys[1]];
            }
            return caches[type][name];

        } catch (err) {
            Logger.Error(err);
            return null;
        }
    }

    /**
     *
     *
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     * @returns {*}  {KoattyContext}
     * @memberof Koatty
     */
    public createContext(req: IncomingMessage, res: ServerResponse): KoattyContext {
        const context: any = super.createContext(req, res);
        context.bodyParser = null;
        context.queryParser = null;
        context.throw = function (message: string | number, code = 1, status?: HttpStatusCode) {
            if (typeof message === "number") {
                if (HttpStatusCodeMap.has(message)) {
                    status = message;
                    message = HttpStatusCodeMap.get(message);
                }
            }
            if (typeof code === "string") {
                message = code;
                code = 1;
            }
            throw new Exception(<string>message, code, status);
        };
        const koattyContext: KoattyContext = context;
        return koattyContext;
    }

    /**
     * registration exception handling
     *
     * @memberof Koatty
     */
    private captureError(): void {
        // koa error
        this.removeAllListeners('error');
        this.on('error', (err: unknown) => {
            if (!isPrevent(err)) {
                Logger.Error(err);
            }
            return;
        });
        // warning
        process.removeAllListeners('warning');
        process.on('warning', (warning) => {
            Logger.Warn(Helper.toString(warning));
            return;
        });

        // promise reject error
        process.removeAllListeners('unhandledRejection');
        process.on('unhandledRejection', (reason) => {
            if (!isPrevent(reason)) {
                Logger.Error(Helper.toString(reason));
            }
            return;
        });
        // uncaught exception
        process.removeAllListeners('uncaughtException');
        process.on('uncaughtException', (err) => {
            if (err.message.indexOf('EADDRINUSE') > -1) {
                Logger.Error(Helper.toString(err));
                process.exit(-1);
            }
            if (!isPrevent(err)) {
                Logger.Error(Helper.toString(err));
            }
            return;
        });
    }
}

  // const properties = ["constructor", "init"];
  // export const Koatty = new Proxy(Application, {
  //     set(target, key, value, receiver) {
  //         if (Reflect.get(target, key, receiver) === undefined) {
  //             return Reflect.set(target, key, value, receiver);
  //         } else if (key === "init") {
  //             return Reflect.set(target, key, value, receiver);
  //         } else {
  //             throw Error("Cannot redefine getter-only property");
  //         }
  //     },
  //     deleteProperty(target, key) {
  //         throw Error("Cannot delete getter-only property");
  //     },
  //     construct(target, args, newTarget) {
  //         Reflect.ownKeys(target.prototype).map((n) => {
  //             if (newTarget.prototype.hasOwnProperty(n) && !properties.includes(Helper.toString(n))) {
  //                 throw Error(`Cannot override the final method '${Helper.toString(n)}'`);
  //             }
  //         });
  //         return Reflect.construct(target, args, newTarget);
  //     }
  // });
