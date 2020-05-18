/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 11:16:32
 */
import * as Koa from "koa";
import { Koatty } from "../Koatty";
/**
 * interface for middleware
 */
export interface IMiddleware {
    run: (options: any, app: Koatty) => (ctx: Koa.Context, next: any) => Promise<any>;
}