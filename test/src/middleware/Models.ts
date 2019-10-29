/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-23 21:18:10
 */
import { Middleware, helper } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class Models {
    run(options: any, app: any) {
        helper.define(app, "mm1", 111);
        //应用启动执行一次
        app.once('appReady', () => {
            helper.define(app, "mm2", 222);
        });
        return function (ctx: any, next: any) {
            return next();
        };
    }
}