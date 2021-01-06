/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-03-05 14:12:17
 */
import { Aspect, Exception, IAspect, Koatty } from "../../../src/index";

@Aspect()
export class TestAspect implements IAspect {
    app: Koatty;
    run(...args: any[]) {
        console.log('TestAspect', args[0]);
        // return Promise.reject({ status: 401, message: "切面执行异常" });
        // throw new Exception(401, "切面执行异常");
        return Promise.resolve();
    }
}