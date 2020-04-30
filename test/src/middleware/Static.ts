/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-30 15:02:08
 */
import { Koatty, Middleware } from "../../../src/index";
const statics = require("think_static");

@Middleware()
export class Static {
    run(options: any, app: Koatty) {
        return statics(options, app);
    }
}