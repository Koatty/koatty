/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:30:34
 */

const statics = require("think_static");
import { Middleware } from "../core/Decorators";
import { Koatty } from "../Koatty";

@Middleware()
export class Static {
    run(options: any, app: Koatty) {
        return statics(options, app);
    }
}