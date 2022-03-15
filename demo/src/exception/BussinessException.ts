/*
 * @Description: 业务异常全局处理
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-14 11:26:20
 * @LastEditTime: 2022-03-15 14:24:38
 */

import { KoattyContext } from "koatty_core";
import { Exception, ExceptionHandler } from "koatty_exception";

// @ExceptionHandler()
export class BussinessException extends Exception {
  async handler(ctx: KoattyContext): Promise<any> {
    ctx.status = this.status;
    ctx.type = "application/json";
    const body = ctx.body ? JSON.stringify(ctx.body) : (ctx.body || null);
    switch (ctx.protocol) {
      case "ws":
      case "wss":
        return ctx.websocket.send(body, () => ctx.websocket.emit('finish'));
      case "grpc":
        return ctx.rpc.callback(null, body);
      default:
        return ctx.res.end(`{"code": ${this.code}, "message": "${this.message || ctx.message}", "data": ${body}}`);
    }
  }
}