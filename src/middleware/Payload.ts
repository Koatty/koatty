/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-03 20:36:42
 */

const payloads = require("think_payload");
import { Middleware } from "../core/Component";
import { Koatty } from "../Koatty";

@Middleware()
export class Payload {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}