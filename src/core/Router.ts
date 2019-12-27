/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 15:33:49
 */
import KoaRouter from '@koa/router';
import * as Koa from 'koa';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Koatty } from '../Koatty';
import { Container } from './Container';
import { listPropertyData, getIdentifier, recursiveGetMetadata } from './Injectable';
import { NAMED_TAG, ROUTER_KEY, PARAM_KEY, PARAM_RULE_KEY } from './Constants';

/**
 * Http timeout timer
 * @param tmr 
 * @param timeout 
 */
// const timer = function (tmr: any, timeout: number) {
//     return new Promise((resolve, reject) => {
//         tmr = setTimeout(function () {
//             const err: any = new Error('Request timeout');
//             err.status = 408;
//             reject(err);
//         }, timeout);
//     });
// };


/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} [instance]
 * @returns
 */
export function injectRouter(target: any, instance?: any) {
    // Controller router path
    const metaDatas = listPropertyData(NAMED_TAG, target);
    let path = '';
    const identifier = getIdentifier(target);
    if (metaDatas) {
        path = metaDatas[identifier] || "";
    }
    path = path.startsWith("/") || path === "" ? path : '/' + path;

    const rmetaData = recursiveGetMetadata(ROUTER_KEY, target);
    const router: any = {};
    // tslint:disable-next-line: forin
    for (const metaKey in rmetaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject method Router key: ${metaKey} => value: ${JSON.stringify(rmetaData[metaKey])}`);
        //.sort((a, b) => b.priority - a.priority) 
        for (const val of rmetaData[metaKey]) {
            const tmp = {
                ...val,
                path: `${path}${val.path}`.replace("//", "/")
            };
            router[`${tmp.path}-${tmp.requestMethod}`] = tmp;
        }
    }

    return router;
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} [instance]
 * @returns
 */
export function injectParam(target: any, instance?: any) {
    instance = instance || target.prototype;
    // const methods = getMethodNames(target);
    const metaDatas = recursiveGetMetadata(PARAM_KEY, target);
    const argsMetaObj: any = {};
    for (const meta in metaDatas) {
        if (instance[meta] && instance[meta].length <= metaDatas[meta].length) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} param key: ${helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);
            argsMetaObj[meta] = metaDatas[meta];
        }
    }
    // vaild 
    const vaildMetaDatas = recursiveGetMetadata(PARAM_RULE_KEY, target);
    for (const vmeta in vaildMetaDatas) {
        if (vaildMetaDatas[vmeta] && vaildMetaDatas[vmeta].length > 0 && argsMetaObj[vmeta]) {
            for (const vn of vaildMetaDatas[vmeta]) {
                argsMetaObj[vmeta] = argsMetaObj[vmeta].map((it: any) => {
                    if (it.index === vn.index && vn.fn && vn.rule) {
                        const fn = (ctx: any, type: string) => {
                            const value = it.fn(ctx, type);
                            return vn.fn(ctx, value, type, vn.rule, vn.msg);
                        };
                        return {
                            name: it.name,
                            fn,
                            index: it.index,
                            type: it.type
                        };
                    } else {
                        return it;
                    }
                });
            }
        }
    }
    return argsMetaObj;
}

export class Router {
    app: Koatty;
    container: Container;
    options: any;

    constructor(app: Koatty, container: Container, options?: any) {
        this.app = app;
        this.container = container;
        // prefix: string;
        // /**
        //  * Methods which should be supported by the router.
        //  */
        // methods ?: string[];
        // routerPath ?: string;
        // /**
        //  * Whether or not routing should be case-sensitive.
        //  */
        // sensitive ?: boolean;
        // /**
        //  * Whether or not routes should matched strictly.
        //  *
        //  * If strict matching is enabled, the trailing slash is taken into
        //  * account when matching routes.
        //  */
        // strict ?: boolean;
        this.options = {
            ...options
        };
    }

    /**
     * Loading router
     *
     * @memberof Router
     */
    loadRouter() {
        try {
            const app = this.app;
            const options = this.options;
            const execRouter = this.execRouter;
            const container = this.container;

            const controllers = app.getMap("controllers") || {};
            const kRouter: any = new KoaRouter(options);
            // tslint:disable-next-line: forin
            for (const n in controllers) {
                // inject router
                const ctlRouters = injectRouter(controllers[n]);
                // inject param
                const ctlParams = injectParam(controllers[n]);
                // tslint:disable-next-line: forin
                for (const it in ctlRouters) {
                    // tslint:disable-next-line: no-unused-expression
                    app.app_debug && logger.custom('think', '', `Register request mapping: [${ctlRouters[it].requestMethod}] : ["${ctlRouters[it].path}" => ${n}.${ctlRouters[it].method}]`);
                    kRouter[ctlRouters[it].requestMethod](ctlRouters[it].path, async function (ctx: Koa.Context): Promise<any> {
                        // tslint:disable-next-line: prefer-const
                        // let tmr = null;
                        // // try /catch
                        // try {
                        //     const router = ctlRouters[it];
                        //     const startTime = ctx.startTime || Date.now();
                        //     const timeout = ((options.timeout || 30) * 1000) - (Date.now() - startTime);
                        //     // promise.race
                        //     return Promise.race([timer(tmr, timeout), execRouter(n, router, app, ctx, container, ctlParams)]);
                        // } finally {
                        //     // tslint:disable-next-line: no-unused-expression
                        //     tmr && clearTimeout(tmr);
                        // }
                        const router = ctlRouters[it];
                        return execRouter(n, router, app, ctx, container, ctlParams);
                    });
                }
            }

            app.use(kRouter.routes()).use(kRouter.allowedMethods());
            helper.define(app, 'Router', kRouter);
        } catch (err) {
            logger.error(err);
        }
    }

    /**
     * Execute controller
     *
     * @param {string} identifier
     * @param {*} router
     * @param {*} app
     * @param {Koa.Context} ctx
     * @param {Container} container
     * @param {*} [params]
     * @returns
     * @memberof Router
     */
    async execRouter(identifier: string, router: any, app: any, ctx: Koa.Context, container: Container, params?: any) {
        // const ctl: any = container.get(identifier, 'CONTROLLER', [app, ctx]);
        const ctl: any = container.get(identifier, 'CONTROLLER');
        if (!ctx || !ctl.init) {
            return ctx.throw(404, `Controller ${identifier} not found.`);
        }
        // inject properties
        ctl.app = app;
        ctl.ctx = ctx;
        // empty-method
        if (!ctl[router.method]) {
            //return ctx.throw(404, `Action ${router.method} not found.`);
            return ctl.__empty();
        }
        // pre-method
        if (ctl.__before) {
            await ctl.__before();
        }
        // inject param
        let args = [];
        if (params[router.method]) {
            args = params[router.method].sort((a: any, b: any) => a.index - b.index).map((i: any) => i.fn(ctx, i.type));
        }
        return ctl[router.method](...args);
    }
}