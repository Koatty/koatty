/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:22
 */
import { IMiddleware } from "../core/Component";
import { Koatty } from 'koatty_core';
import { Payload } from "koatty_payload";

export class PayloadMiddleware implements IMiddleware {
    run(options: any, app: Koatty) {
        return Payload(options, app);
    }
}