/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-11 17:30:33
 */
import { Middleware } from "../../../dist/index";

const defaultOptions = {};

@Middleware()
export class Models {
    run(options: any, app: any) {
        return function (ctx: any, next: any) {

        };
    }
}