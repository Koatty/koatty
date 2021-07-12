/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:22
 */
import { Middleware, IMiddleware } from "../core/Component";
import { Koatty } from 'koatty_core';
import { Payload } from "koatty_payload";

@Middleware()
export class PayloadMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return Payload(options, app);
    }
}