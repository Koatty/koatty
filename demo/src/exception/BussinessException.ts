/*
 * @Description: 业务异常全局处理
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-14 11:26:20
 * @LastEditTime: 2024-02-02 09:38:35
 */

import { KoattyContext } from "koatty_core";
import { Exception, ExceptionHandler } from "koatty_exception";
import { DefaultLogger as Logger } from "koatty_logger";

@ExceptionHandler()
export class BussinessException extends Exception {
  async handler(ctx: KoattyContext): Promise<any> {
    try {
      ctx.status = this.status || ctx.status;
      if (ctx.protocol !== "grpc") {
        // api mode the status always be 200
        ctx.status = 200;
      }
      // LOG
      this.log(ctx);
      let contentType = 'application/json';
      if (ctx.encoding !== false) {
        contentType = `${contentType}; charset=${ctx.encoding}`;
      }
      ctx.type = contentType;
      const body = JSON.stringify(ctx.body || "");
      return this.output(ctx, body);
    } catch (error) {
      Logger.Error(error);
    }
  }
}