/*
 * @Author: richen
 * @Date: 2020-11-27 14:26:44
 * @LastEditors: linyyyang<linyyyang@tencent.com>
 * @LastEditTime: 2020-11-27 16:04:23
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */

import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Namespace, createNamespace } from "cls-hooked";
import { Koatty } from '../Koatty';
import { Helper } from '../util/Helper';

/**
 * Create Namespace
 *
 * @export
 * @returns {*}  
 */
export function TraceServerSetup(app: Koatty): Namespace {
    const traceCls = createNamespace('tkoatty-debug-trace');
    // app.trace = traceCls;
    Helper.define(app, 'trace', traceCls);
    return traceCls;
}

/**
 * debug/trace server handle binding
 *
 * @param {Koatty} app  app实例
 * @param {IncomingMessage | Http2ServerRequest} req  request对象
 * @param {ServerResponse | Http2ServerResponse} res  response对象
 * @param {boolean} openTrace 是否开启全链路debug/trace
 */
export function TraceHandler(
    app: Koatty,
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
    openTrace: boolean,
) {
    // 判断是否开启全链路debug/trace
    if (openTrace) {
        app.trace.run(() => {
            // 事件绑定
            app.trace.bindEmitter(req);
            app.trace.bindEmitter(res);
            // 执行app.callback
            app.callback()(req, res);
        });
    } else {
        app.callback()(req, res);
    }
}