/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-08 10:06:21
 */
import { Middleware } from '../core/Decorators';
import { Koatty } from '../Koatty';
const trace = require('think_trace');

@Middleware()
export class Trace {
    run(options: any, app: Koatty) {
        return trace(options, app);
    }
}