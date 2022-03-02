/*
 * @Description: 业务异常全局处理
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-14 11:26:20
 * @LastEditTime: 2022-03-02 10:33:35
 */

import { KoattyContext } from "koatty_core";
import { Exception, ExceptionHandler, HttpStatusCodeMap } from "koatty_exception";

@ExceptionHandler()
export class BussinessException extends Exception {
    // type = "BussinessException";
    async handler(ctx: KoattyContext): Promise<any> {
        ctx.status = this.status;
        ctx.type = "application/json";

        switch (ctx.protocol) {
            case "ws":
            case "wss":
                return ctx.websocket.send(this.message, () => ctx.websocket.emit('finish'));
            case "grpc":
                return ctx.rpc.callback(null, this.message);
            default:
                return ctx.res.end(`{"code": "${this.code}", "message": "${this.message || HttpStatusCodeMap.get(this.status)}", "data": null}`);
        }
    }
}