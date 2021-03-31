/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:44
 */
import { Middleware, Helper, IMiddleware, KoattyContext, Exception, prevent } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class ZadtestMiddleware implements IMiddleware {
    run(options: any, app: any) {
        //应用启动执行一次
        // app.once('appReady', async () => {
        //     // app.test = 'wwwwwwwww';
        //     console.log('Zadtest Middleware');
        // });
        return async function (ctx: KoattyContext, next: Function) {
            //    ctx.status = 403;
            // ctx.body = "band!!!!!!";
            // throw new Error("ZadtestMiddleware");
            //    throw new Exception("band", 1, 403);
            // ctx.body = "sss";
            // ctx.throw(403, "ssss");
            return next();
        };
    }
}