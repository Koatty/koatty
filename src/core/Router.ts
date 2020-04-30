/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-30 09:19:23
 */
import KoaRouter from "@koa/router";
import * as Koa from "koa";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Koatty } from "../Koatty";
import { Container, IOCContainer } from "./Container";
import { NAMED_TAG, ROUTER_KEY, PARAM_KEY, PARAM_RULE_KEY, PARAM_CHECK_KEY } from "./Constants";
import { recursiveGetMetadata } from "../util/Lib";
import { convertParamsType, ValidatorFuncs, plainToClass, ClassValidator } from 'think_validtion';

/**
 * Http timeout timer
 * @param tmr 
 * @param timeout 
 */
// const timer = function (tmr: any, timeout: number) {
//     return new Promise((resolve, reject) => {
//         tmr = setTimeout(function () {
//             const err: any = new Error("Request timeout");
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
function injectRouter(target: any, instance?: any) {
    // Controller router path
    const metaDatas = IOCContainer.listPropertyData(NAMED_TAG, target);
    let path = "";
    const identifier = IOCContainer.getIdentifier(target);
    if (metaDatas) {
        path = metaDatas[identifier] || "";
    }
    path = path.startsWith("/") || path === "" ? path : `/${path}`;

    const rmetaData = recursiveGetMetadata(ROUTER_KEY, target);
    const router: any = {};
    // tslint:disable-next-line: forin
    for (const metaKey in rmetaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.custom("think", "", `Register inject method Router key: ${metaKey} => value: ${JSON.stringify(rmetaData[metaKey])}`);
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
function injectParam(target: any, instance?: any) {
    instance = instance || target.prototype;
    // const methods = getMethodNames(target);
    const metaDatas = recursiveGetMetadata(PARAM_KEY, target);
    const vaildMetaDatas = recursiveGetMetadata(PARAM_RULE_KEY, target);
    const vaildatedMetaDatas = recursiveGetMetadata(PARAM_CHECK_KEY, target);
    const argsMetaObj: any = {};
    for (const meta in metaDatas) {
        if (instance[meta] && instance[meta].length <= metaDatas[meta].length) {
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.custom("think", "", `Register inject ${IOCContainer.getIdentifier(target)} param key: ${helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);

            // cover to obj
            const data = (metaDatas[meta] || []).sort((a: any, b: any) => a.index - b.index);
            const vaildData = vaildMetaDatas[meta] || [];
            const vaildMetaObj: any = {};
            data.map((v: any) => {
                vaildData.map((it: any) => {
                    if (v.index === it.index) {
                        vaildMetaObj[v.index] = it;
                    }
                });
            });
            argsMetaObj[meta] = {
                valids: vaildMetaObj,
                data,
                dtoCheck: (vaildatedMetaDatas[meta] && vaildatedMetaDatas[meta].dtoCheck) ? true : false
            };
        }
    }
    return argsMetaObj;
}


/**
 * Convert paramter types and valid check.
 *
 * @param {any[]} params
 * @param {*} valids
 * @param {boolean} dtoCheck
 * @param {Koa.Context} ctx
 * @returns
 */
async function getParamter(params: any[], valids: any, dtoCheck: boolean, ctx: Koa.Context) {
    //convert type
    const props: any[] = params.map(async function (v: any, k: number) {
        let value: any = null;
        if (v.fn && helper.isFunction(v.fn)) {
            value = v.fn(ctx);
        }
        if (v.isDto) {
            // DTO class
            const clazz = IOCContainer.getClass(v.type, "COMPONENT");
            if (clazz) {
                if (dtoCheck) {
                    value = await ClassValidator.valid(clazz, value, true);
                } else {
                    value = plainToClass(clazz, value, true);
                }
            }
        } else {
            value = convertParamsType(value, v.type);
            //@Valid()
            if (valids[k] && valids[k].type && valids[k].rule) {
                ValidatorFuncs(`${k}`, value, valids[k].type, valids[k].rule, valids[k].message, false);
            }
        }
        return value;
    });
    return Promise.all(props);
}

/**
 * Router class
 */
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
                    app.app_debug && logger.custom("think", "", `Register request mapping: [${ctlRouters[it].requestMethod}] : ["${ctlRouters[it].path}" => ${n}.${ctlRouters[it].method}]`);
                    kRouter[ctlRouters[it].requestMethod](ctlRouters[it].path, function (ctx: Koa.Context): Promise<any> {
                        const router = ctlRouters[it];
                        return execRouter(n, router, ctx, container, ctlParams[router.method]);
                    });
                }
            }

            app.use(kRouter.routes()).use(kRouter.allowedMethods());
            helper.define(app, "Router", kRouter);
        } catch (err) {
            logger.error(err);
        }
    }

    /**
     * Execute controller
     *
     * @param {string} identifier
     * @param {*} router
     * @param {Koa.Context} ctx
     * @param {Container} container
     * @param {*} ctlParams
     * @returns
     * @memberof Router
     */
    async execRouter(identifier: string, router: any, ctx: Koa.Context, container: Container, ctlParams: any) {
        const ctl: any = container.get(identifier, "CONTROLLER", [ctx]);
        // const ctl: any = container.get(identifier, "CONTROLLER");
        if (!ctx || !ctl.init) {
            return ctx.throw(404, `Controller ${identifier} not found.`);
        }
        // pre-method
        if (ctl.__before) {
            logger.info(`Execute the aspect __before()`);
            await ctl.__before();
        }
        // inject param
        let args = [];
        if (ctlParams) {
            args = await getParamter(ctlParams.data || [], ctlParams.valids || {}, ctlParams.dtoCheck, ctx);
        }
        try {
            return ctl[router.method](...args);
        } finally {
            // after-method
            if (ctl.__after) {
                logger.info(`Execute the aspect __after()`);
                await ctl.__after();
            }
        }
    }
}