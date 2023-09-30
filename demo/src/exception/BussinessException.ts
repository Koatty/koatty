/*
 * @Description: 业务异常全局处理
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-14 11:26:20
 * @LastEditTime: 2023-09-25 19:14:04
 */

import { KoattyContext } from "koatty_core";
import { Exception, ExceptionHandler } from "koatty_exception";

@ExceptionHandler()
export class BussinessException extends Exception {
  async handler(ctx: KoattyContext): Promise<any> {
    ctx.status = this.status;
    ctx.type = "application/json";
    const body: any = JSON.stringify(ctx.body || null);
    switch (ctx.protocol) {
      case "ws":
      case "wss":
        if (ctx.websocket) {
          ctx.websocket.send(body);
          ctx.websocket.emit('finish');
        }
        break;
      case "grpc":
        if (ctx.rpc && ctx.rpc.callback) {
          ctx.rpc.callback(null, body);
        }
        break;
      default:
        ctx.res.end(`{"code": ${this.code}, "message": "${this.message || ctx.message}", "data": ${body}}`);
        break;
    }
  }
}