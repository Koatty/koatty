/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-15 12:14:23
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
import { IMiddleware } from './IMiddleware';
const traces = require("think_trace");

@Middleware()
export class TraceMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}