/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-08 10:06:08
 */

const payload = require('think_payload');
import { Middleware } from '../core/Decorators';
import { Koatty } from '../Koatty';

@Middleware()
export class Payload {
    run(options: any, app: Koatty) {
        return payload(options, app);
    }
}