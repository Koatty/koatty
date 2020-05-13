/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-11 13:50:51
 */
import { Middleware, Helper } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class ZadtestMiddleware {
    run(options: any, app: any) {
        //应用启动执行一次
        app.once('appReady', async () => {
            app.test = 'wwwwwwwww';
            console.log('Zadtest Middleware');
        });
        return function (ctx: any, next: any) {
            console.log(222222);
            console.log(app.test);
            return next();
        };
    }
}