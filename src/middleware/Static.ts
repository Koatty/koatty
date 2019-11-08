/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-08 10:06:12
 */

const statics = require('think_static');
import { Middleware } from '../core/Decorators';
import { Koatty } from '../Koatty';

@Middleware()
export class Static {
    run(options: any, app: Koatty) {
        return statics(options, app);
    }
}