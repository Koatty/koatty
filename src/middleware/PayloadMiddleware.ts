/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-15 12:14:07
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
import { IMiddleware } from "./IMiddleware";
const payloads = require("think_payload");

@Middleware()
export class PayloadMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}