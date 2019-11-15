/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-15 14:45:05
 */

const payloads = require('think_payload');
import { Middleware } from '../core/Decorators';
import { Koatty } from '../Koatty';

@Middleware()
export class Payload {
    run(options: any, app: Koatty) {
        return payloads(options, app);
    }
}