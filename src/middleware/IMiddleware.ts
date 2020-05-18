/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-15 12:06:13
 */
import * as Koa from "koa";
import { Koatty } from "../Koatty";
/**
 * interface for middleware
 */
export interface IMiddleware {
    run: (options: any, app: Koatty) => (ctx: Koa.Context, next: any) => Promise<any>;
}