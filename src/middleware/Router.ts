/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-27 10:43:14
 */

import Router from 'koa-router';
import * as Koa from 'koa';
import * as helper from "think_lib";
import { CONTROLLER_KEY } from '../core/Constants';
import { BaseController } from '../controller/BaseController';
import * as logger from "think_logger";
const debug = require('debug')('middleware:router');


const defaultOpt = {
    //默认配置项
    prefix: ''
};

module.exports = function (options: any, app: any) {
    options = helper.extend(defaultOpt, options);
    app.once('appReady', () => {
        try {
            const koaRouter: any = new Router(options);
            helper.define(app, 'Router', koaRouter);
            const controllers = app._caches.controllers || {};
            // tslint:disable-next-line: one-variable-per-declaration
            let ctl: any, ctlRouters: [], ctlParams: any;
            // tslint:disable-next-line: forin
            for (const n in controllers) {
                ctl = app.Container.get(n, CONTROLLER_KEY);
                if (!(ctl instanceof BaseController)) {
                    logger.error(`class ${n} does not inherit the BaseController`);
                    continue;
                } else {
                    ctlRouters = ctl.options.router || [];
                    ctlParams = ctl.options.params || {};
                    ctlRouters.map((it: any) => {
                        debug(`register ${it.requestMethod} - ${it.method} -${it.path}`);
                        app.Router[it.requestMethod](it.path, (ctx: Koa.Context) => {
                            // inject ctx 
                            ctl.ctx = ctx;
                            // inject param
                            const args = ctlParams[it.method].sort((a: any, b: any) => a.index - b.index).map((i: any) => i.fn(ctx, i.type));
                            ctl[it.method](...args);
                        });
                    });
                }
            }

            app.use(app.Router.routes()).use(app.Router.allowedMethods());
        } catch (err) {
            logger.error(err);
        }
    });
    return function (ctx: Koa.Context, next: any) {
        return next();
    };
};