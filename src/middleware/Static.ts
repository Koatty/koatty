/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-23 15:06:09
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
const statics = require("think_static");

@Middleware()
export class Static {
    run(options: any, app: Koatty) {
        return statics(options, app);
    }
}