/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:22
 */
import { Middleware, IMiddleware } from "../core/Component";
import { Koatty } from "../Koatty";
import { payload } from "koatty_payload";

@Middleware()
export class PayloadMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return payload(options, app);
    }
}