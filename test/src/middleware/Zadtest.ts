/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-21 10:14:58
 */
import { Middleware, Helper } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class Zadtest {
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