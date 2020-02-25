/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-02-24 16:06:42
 */
import { Middleware, Helper } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class Zadtest {
    run(options: any, app: any) {
        return function (ctx: any, next: any) {
            console.log('222222');
            return next();
        };
    }
}