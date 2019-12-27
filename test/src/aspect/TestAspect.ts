/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 12:57:28
 */
import { Aspect } from "../../../src/index";

@Aspect()
export class TestAspect {
    run() {
        console.log('TestAspect');
    }
}