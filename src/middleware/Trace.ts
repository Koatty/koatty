/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 16:08:02
 */
import { Middleware } from '../core/Decorators';
const trace = require('think_trace');

@Middleware()
export class Trace {
    run(options: any, app: any) {
        return trace(options, app);
    }
}