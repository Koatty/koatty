/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 15:42:35
 */
import { Middleware } from "../../../src";

const defaultOptions = {};

@Middleware()
export class Models {
    run(options: any, app: any) {
        return function (ctx: any, next: any) {

        };
    }
}