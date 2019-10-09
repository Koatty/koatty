/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 16:08:10
 */

const payload = require('think_payload');
import { Middleware } from '../core/Decorators';

@Middleware()
export class Payload {
    run(options: any, app: any) {
        return payload(options, app);
    }
}