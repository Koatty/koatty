/*
 * @Description: trace & catcher middleware
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 22:55:54
 * @LastEditTime: 2023-12-09 23:00:44
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { IMiddleware } from "../component/Components";
import { Koatty } from 'koatty_core';
import { Trace } from "koatty_trace";

export class TraceMiddleware implements IMiddleware {
  run(options: any, app: Koatty) {
    return Trace(options, app);
  }
}