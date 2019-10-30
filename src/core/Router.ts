/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-30 16:58:24
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
            const kRouter: any = Reflect.construct(KoaRouter, this.options);
            helper.define(this.app, 'Router', kRouter);
            const controllers = this.app._caches.controllers || {};
            // tslint:disable-next-line: one-variable-per-declaration
            let ctl: any, ctlRouters: any[], ctlParams: any;
            const app = this.app;
            // tslint:disable-next-line: forin
            for (const n in controllers) {
                // inject router
                ctlRouters = injectRouter(controllers[n]);
                // inject param
                ctlParams = injectParam(controllers[n]);
                // ctlRouters = controllers[n].prototype._options.router || [];
                // ctlParams = controllers[n].prototype._options.params || {};
                ctlRouters.map((it: any) => {
                    // logger.custom('think', '', `=> register request mapping = ${it.requestMethod} : ${it.path} -> ${n}.${it.method}`);
                    app.Router[it.requestMethod](it.path, (ctx: Koa.Context) => {
                        ctl = app.Container.get(n, 'CONTROLLER', [app, ctx]);
                        if (!ctx || !ctl.init) {
                            ctx.throw(404, `Controller ${n} not found.`);
                        }
                        if (!ctl[it.method]) {
                            ctx.throw(404, `Action ${it.method} not found.`);
                        }
                        // inject param
                        let args = [];
                        if (ctlParams[it.method]) {
                            args = ctlParams[it.method].sort((a: any, b: any) => a.index - b.index).map((i: any) => i.fn(ctx, i.type));
                        }
                        return ctl[it.method](...args);
                    });
                });
            }

            app.use(app.Router.routes()).use(app.Router.allowedMethods());
        } catch (err) {
            logger.error(err);
        }
    }
}