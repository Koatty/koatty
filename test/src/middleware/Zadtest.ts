/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-05 10:35:16
 */
import { Middleware, Helper } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class Zadtest {
    run(options: any, app: any) {
        //应用启动执行一次
        app.once('appReady', async () => {
            console.log('Zadtest Middleware');
        });
        return function (ctx: any, next: any) {
            console.log('222222');
            return next();
        };
    }
}