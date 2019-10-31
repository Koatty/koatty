/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-31 18:44:57
 */
import KoaRouter from 'koa-router';
import * as Koa from 'koa';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Container } from './Container';
import { injectRouter, injectParam } from './Injectable';

export class Router {
    app: any;
    container: Container;
    options: any;

    constructor(app: any, container: Container, options?: any) {
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
            prefix: '', ...options
        };
    }

    /**
     *
     *
     * @memberof Router
     */
    loadRouter() {
        try {
            const kRouter: any = new KoaRouter(this.options);

            const controllers = this.app._caches.controllers || {};
            const app = this.app;
            // tslint:disable-next-line: forin
            for (const n in controllers) {
                // inject router
                const ctlRouters = injectRouter(controllers[n]);
                // inject param
                const ctlParams = injectParam(controllers[n]);
                // tslint:disable-next-line: forin
                for (const it in ctlRouters) {
                    // tslint:disable-next-line: no-unused-expression
                    app.app_debug && logger.custom('think', '', `register request mapping: [${ctlRouters[it].requestMethod}] : ["${ctlRouters[it].path}" => ${n}.${ctlRouters[it].method}]`);
                    kRouter[ctlRouters[it].requestMethod](ctlRouters[it].path, async function (ctx: Koa.Context) {
                        const tmp = ctlRouters[it];
                        // ctl = app.Container.get(n, 'CONTROLLER', [app, ctx]);
                        const ctl = app.Container.get(n, 'CONTROLLER');
                        if (!ctx || !ctl.init) {
                            ctx.throw(404, `Controller ${n} not found.`);
                        }
                        // inject properties
                        ctl.app = app;
                        ctl.ctx = ctx;
                        // empty-method
                        if (!ctl[tmp.method]) {
                            // ctx.throw(404, `Action ${tmp.method} not found.`);
                            return ctl.__empty();
                        }
                        // pre-method
                        if (ctl.__before) {
                            await ctl.__before();
                        }
                        // inject param
                        let args = [];
                        if (ctlParams[tmp.method]) {
                            args = ctlParams[tmp.method].sort((a: any, b: any) => a.index - b.index).map((i: any) => i.fn(ctx, i.type));
                        }
                        return ctl[tmp.method](...args);
                    });
                }
            }

            app.use(kRouter.routes()).use(kRouter.allowedMethods());
            helper.define(this.app, 'Router', kRouter);
        } catch (err) {
            logger.error(err);
        }
    }
}