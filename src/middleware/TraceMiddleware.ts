/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 11:17:26
 */
import { Middleware, IMiddleware } from "../core/Component";
import { Koatty } from "../Koatty";
const traces = require("think_trace");

@Middleware()
export class TraceMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}