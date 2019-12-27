/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:30:30
 */

const payloads = require("think_payload");
import { Middleware } from "../core/Decorators";
import { Koatty } from "../Koatty";

@Middleware()
export class Payload {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}