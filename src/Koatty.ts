/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-23 19:21:20
 */

import * as path from "path";
import Koa from "koa";
import KoaRouter from "@koa/router";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { PREVENT_NEXT_PROCESS } from "./core/Constants";
import { Container } from "./core/Container";
const pkg = require("../package.json");

/**
 * check node version
 * @return {void} []
 */
const checkEnv = () => {
    let node_engines = pkg.engines.node.slice(1) || "10.0.0";
    node_engines = node_engines.slice(0, node_engines.lastIndexOf("."));
    let nodeVersion = process.version;
    if (nodeVersion[0] === "v") {
        nodeVersion = nodeVersion.slice(1);
    }
    nodeVersion = nodeVersion.slice(0, nodeVersion.lastIndexOf("."));

    if (helper.toNumber(node_engines) > helper.toNumber(nodeVersion)) {
        logger.error(`Koatty need node version > ${node_engines}, current version is ${nodeVersion}, please upgrade it.`);
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

interface ListenOptions {
    port?: number;
    host?: string;
    backlog?: number;
    path?: string;
    exclusive?: boolean;
    readableAll?: boolean;
    writableAll?: boolean;
    ipv6Only?: boolean;
}

/**
 * Application
 * @export
 * @class Koatty
 * @extends {Koa}
 * @implements {BaseApp}
 */
export class Koatty extends Koa {
    public root_path: string;
    public app_path: string;
    public think_path: string;
    public app_debug: boolean;
    public options: InitOptions;
    public Container: Container;
    public Router: KoaRouter;
    private handelMap: Map<string, any>;

    protected constructor(options: InitOptions) {
        super();
        this.options = options || {};
        this.init();
        this.handelMap = new Map<string, any>();
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
        this.app_debug = !!(this.options.app_debug || this.app_debug);

        const env = JSON.stringify(process.execArgv);
        if ((env.indexOf("--production") > -1) || (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "pro")) {
            this.app_debug = false;
        }
        if (env.indexOf("ts-node") > -1 || env.indexOf("--debug") > -1) {
            this.app_debug = true;
        }
        if (this.app_debug) {
            process.env.APP_DEBUG = "true";
        }

        // check env
        checkEnv();
        // define path  
        const root_path = (this.options && this.options.root_path) || this.root_path || process.cwd();
        const app_path = this.app_path || (this.options && this.options.app_path) || path.resolve(root_path, env.indexOf("ts-node") > -1 ? "src" : "dist");
        const think_path = __dirname;
        helper.define(this, "root_path", root_path);
        helper.define(this, "app_path", app_path);
        helper.define(this, "think_path", think_path);

        process.env.ROOT_PATH = this.root_path;
        process.env.APP_PATH = this.app_path;
        process.env.THINK_PATH = this.think_path;

        // Compatible with old version
        Reflect.defineProperty(this, "_caches", {
            value: {},
            writable: true,
            configurable: false,
            enumerable: false
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
    getMap(key: string) {
        return this.handelMap.get(key);
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
     * @param {string} [type="config"] 
     * @memberof ThinkKoa
     */
    public config(name: string, type = "config") {
        try {
            const caches = this.getMap("configs") || {};
            // tslint:disable-next-line: no-unused-expression
            caches[type] || (caches[type] = {});
            if (name === undefined) {
                return caches[type];
            }
            if (helper.isString(name)) {
                //name不含. 一级
                if (name.indexOf(".") === -1) {
                    return caches[type][name];
                } else { //name包含. 二级
                    const keys = name.split(".");
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
     * 
     * opts {
     * *   port?: number;
     * *   host?: string;
     * *   backlog?: number;
     * *   path?: string;
     * *   exclusive?: boolean;
     * *   readableAll?: boolean;
     * *   writableAll?: boolean;
     * *   ipv6Only?: boolean; //default false
     * 
     * }
     */
    // tslint:disable-next-line: no-object-literal-type-assertion
    public listen(opts: any = <ListenOptions>{
        host: "127.0.0.1",
        port: 3000
    }, listeningListener?: any) {
        //catch error
        this.captureError();
        //start server
        return super.listen(opts, listeningListener).on("clientError", function (err: any, sock: any) {
            // logger.error("Bad request, HTTP parse error");
            sock.end("400 Bad Request\r\n\r\n");
        });
    }

    /**
     * registration exception handling
     * 
     * @memberof ThinkKoa
     */
    private captureError(): void {
        const configs = this.getMap("configs") || {};
        //logger
        if (configs.config) {
            process.env.LOGS = configs.config.logs || false;
            process.env.LOGS_PATH = configs.config.logs_path || this.root_path + "/logs";
            process.env.LOGS_LEVEL = configs.config.logs_level || [];
        }

        //koa error
        this.removeAllListeners("error");
        this.on("error", (err: any) => {
            if (!this.isPrevent(err)) {
                logger.error(err);
            }
            return;
        });
        //warning
        process.removeAllListeners("warning");
        process.on("warning", (warning) => {
            logger.warn(helper.toString(warning));
            return;
        });

        //promise reject error
        process.removeAllListeners("unhandledRejection");
        process.on("unhandledRejection", (reason) => {
            if (!this.isPrevent(reason)) {
                logger.error(helper.toString(reason));
            }
            return;
        });
        //ubcaugth exception
        process.removeAllListeners("uncaughtException");
        process.on("uncaughtException", (err) => {
            if (err.message.indexOf("EADDRINUSE") > -1) {
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

// const propertys = ["constructor", "init"];
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
//             if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
//                 throw Error(`Cannot override the final method '${helper.toString(n)}'`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
