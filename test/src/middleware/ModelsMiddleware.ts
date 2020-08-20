/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 11:16:41
 */
import { Middleware, Helper, Value, GetMapping, IMiddleware, KoattyContext } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class ModelsMiddleware implements IMiddleware {
    @Value("test")
    config: any;

    run(options: any, app: any) {
        Helper.define(app, "mm1", 111);
        //应用启动执行一次
        app.once('appReady', async () => {
            console.log('Models Middleware');
            Helper.define(app, "mm2", 222);
        });
        return function (ctx: KoattyContext, next: Function) {
            console.log('111111');
            return next();
        };
    }
}