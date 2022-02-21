/*
 * @Description: 业务异常全局处理
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-14 11:26:20
 * @LastEditTime: 2022-02-21 10:34:50
 */

import { KoattyContext } from "koatty_core";
import { Exception, ExceptionHandler } from "koatty_exception";

@ExceptionHandler()
export class BussinessException extends Exception {
    // type = "BussinessException";
    async handler(ctx: KoattyContext): Promise<any> {
        return ctx.res.end(`BussinessException: ${this.message}`);
    }
}