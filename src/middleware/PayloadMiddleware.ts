/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-11 13:45:01
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
const payloads = require("think_payload");

@Middleware()
export class PayloadMiddleware {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}