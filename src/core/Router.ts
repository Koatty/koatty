/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 14:23:43
 */
import { Koatty } from "../Koatty";
import { NewRouter } from "koatty_router";

/**
 * get instance of router
 *
 * @export
 * @param {Koatty} app
 * @returns {*}  
 */
export function newRouter(app: Koatty) {
    const serveMode = app.config("serve_mod") ?? "http";
    const options = app.config(undefined, 'router') ?? {};
    return NewRouter(serveMode, <any>app, options);
}