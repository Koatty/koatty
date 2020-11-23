/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:44
 */
import { Middleware, Helper, IMiddleware, KoattyContext } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class ZadtestMiddleware implements IMiddleware {
    run(options: any, app: any) {
        //应用启动执行一次
        app.once('appReady', async () => {
            // app.test = 'wwwwwwwww';
            console.log('Zadtest Middleware');
        });
        return async function (ctx: KoattyContext, next: Function) {
            console.log('before');
            console.log(app.test);
            await next();
            console.log('after');
        };
    }
}