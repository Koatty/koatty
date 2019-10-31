/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-31 18:29:13
 */
import { Controller, RestController, GetMaping, PathVariable } from '../../../src/index';

@Controller("rtest")
export class RtestController extends RestController {

    __before() {
        console.log('__before');
        return Promise.resolve();
    }
}