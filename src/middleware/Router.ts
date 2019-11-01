/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-01 18:48:15
 */

import * as Koa from 'koa';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { Middleware } from '../core/Decorators';
import * as KRouter from '../core/Router';
const trace = require('think_trace');

const defaultOpt = {
    /**
     * Prefix for all routes.
     */
    // prefix: string;
    /**
     * Methods which should be supported by the router.
     */
    // methods?: string[];
    // routerPath?: string;
    /**
     * Whether or not routing should be case-sensitive.
     */
    // sensitive?: boolean;
    /**
     * Whether or not routes should matched strictly.
     *
     * If strict matching is enabled, the trailing slash is taken into
     * account when matching routes.
     */
    // strict?: boolean;

    timeout: 30,
    error_code: 500, //报错时的状态码
    error_no_key: 'code', //错误号的key
    error_msg_key: 'message', //错误消息的key
    error_path: '' //错误模板目录配置.该目录下放置404.html、502.html等,框架会自动根据status进行渲染(支持模板变量,依赖think_view中间件;如果think_view中间件未加载,仅输出模板内容)
};

@Middleware()
export class Router {
    run(options: any, app: any) {
        options = helper.extend(defaultOpt, options);
        app.once('appStart', () => {
            logger.custom('think', '', 'LoadRouters ...');
            const router = new KRouter.Router(app, app.Container, options);
            router.loadRouter();
        });

        return trace(options, app);
    }
}