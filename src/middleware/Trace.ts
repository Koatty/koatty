/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:30:38
 */
import { Middleware } from "../core/Decorators";
import { Koatty } from "../Koatty";
const traces = require("think_trace");

@Middleware()
export class Trace {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}