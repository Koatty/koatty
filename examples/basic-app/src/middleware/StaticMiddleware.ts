/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:17:26
 */
import { Middleware, IMiddleware, KoattyContext, KoattyNext } from '../../../../src/index';
import { App } from '../App';
// import { Static } from "koatty_static";

@Middleware()
export class StaticMiddleware {
  run(options: any, app: App) {
    return function (ctx: KoattyContext, next: KoattyNext) {
      return next();
    }
    // return Static(options, app);
  }
}