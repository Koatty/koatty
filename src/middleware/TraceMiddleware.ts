/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-11 13:45:05
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
const traces = require("think_trace");

@Middleware()
export class TraceMiddleware {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}