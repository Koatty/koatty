/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-25 10:06:23
 */

import Router from 'koa-router';
import * as Koa from 'koa';
import * as helper from "think_lib";
import { CONTROLLER_KEY } from '../core/Constants';
const debug = require('debug')('middleware:router');


const defaultOpt = {
    //默认配置项
    prefix: ''
};

const bind = function (router: Router, controller: any) {

};

module.exports = function (options: any, app: any) {
    options = helper.extend(defaultOpt, options);
    app.once('appReady', () => {
        const koaRouter: any = new Router(options);
        helper.define(app, 'Router', koaRouter);
        const controllers = app._caches.controllers || [];
        // tslint:disable-next-line: one-variable-per-declaration
        let ctl: any, ctlRouters: [];
        controllers.map((item: string) => {
            if (app.Container) {
                ctl = app.Container.get(item, CONTROLLER_KEY);
                if (ctl.options) {
                    const argsMeta = recursiveGetMetadata(ROUTER_KEY, target);
                    ctlRouters = ctl.options.router || [];
                    ctlRouters.map((it: any) => {
                        debug(`register ${it.requestMethod} - ${it.method} -${it.path}`);
                        app.Router[it.requestMethod](it.path, (ctx: Koa.Context) => {
                            // inject ctx 
                            const args = argsMeta.filter(i => i.name === name).sort((a, b) => a.index - b.index).map(i => i.fn(ctx))
                            ctl.ctx = ctx;
                            ctl[it.method]();
                        });
                    });
                }
            }
        });
        app.use(app.Router.routes()).use(app.Router.allowedMethods());
    });
    return function (ctx: Koa.Context, next: any) {
        return next();
    };
};