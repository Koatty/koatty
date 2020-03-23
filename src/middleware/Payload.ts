/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-23 15:06:03
 */
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";
const payloads = require("think_payload");

@Middleware()
export class Payload {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}