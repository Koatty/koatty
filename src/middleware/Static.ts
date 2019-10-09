/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 16:14:09
 */

const statics = require('think_static');
import { Middleware } from '../core/Decorators';

@Middleware()
export class Static {
    run(options: any, app: any) {
        return statics(options, app);
    }
}