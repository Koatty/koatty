/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-15 14:45:15
 */
import { Middleware } from '../core/Decorators';
import { Koatty } from '../Koatty';
const traces = require('think_trace');

@Middleware()
export class Trace {
    run(options: any, app: Koatty) {
        return traces(options, app);
    }
}