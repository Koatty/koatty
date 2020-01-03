/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-03 20:36:53
 */

const statics = require("think_static");
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";

@Middleware()
export class Static {
    run(options: any, app: Koatty) {
        return statics(options, app);
    }
}