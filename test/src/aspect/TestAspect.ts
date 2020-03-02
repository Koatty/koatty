/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-02 13:36:19
 */
import { Aspect } from "../../../src/index";

@Aspect()
export class TestAspect {
    run(aa: number) {
        console.log('TestAspect', aa);
        return Promise.reject({ status: 401, message: "切面执行异常" });
    }
}