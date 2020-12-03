/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-03-05 14:12:17
 */
import { Aspect } from "../../../src/index";

@Aspect()
export class TestAspect {
    run(aa: number) {
        console.log('TestAspect', aa);
        // return Promise.reject({ status: 401, message: "切面执行异常" });
    }
}