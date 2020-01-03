/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-03 20:36:55
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
const traces = require("think_trace");

@Middleware()
export class Trace {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}