/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-12 09:42:16
 */
import { Middleware } from "../../../src/index";

const defaultOptions = {};

@Middleware()
export class Models {
    run(options: any, app: any) {
        return function (ctx: any, next: any) {

        };
    }
}