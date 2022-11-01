/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2022-10-31 15:47:36
 * @LastEditTime: 2022-10-31 15:47:54
 */

import { IMiddleware, Middleware } from "../../../src";
import { App } from "../App";
const session = require('koa-session');


@Middleware()
export class SessionMiddleware implements IMiddleware {
  run(options: any, app: App) {
    return session(options, app);
  }
}