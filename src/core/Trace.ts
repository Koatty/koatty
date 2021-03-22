/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-12-10 11:49:15
 */
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { Namespace, createNamespace } from "cls-hooked";
import { Koatty, KoattyContext } from '../Koatty';
import { Helper, UUID } from '../util/Helper';
import { Logger } from '../util/Logger';
import { Exception } from './Exception';

/**
 * Create Namespace
 *
 * @export
 * @returns {*}  
 */
export function TraceServerSetup(app: Koatty): Namespace {
    const traceCls = createNamespace('koatty-debug-trace');
    // app.trace = traceCls;
    Helper.define(app, 'trace', traceCls);
    return traceCls;
}

/**
 * debug/trace server handle binding
 *
 * @param {Koatty} app  app instance
 * @param {IncomingMessage | Http2ServerRequest} req  request
 * @param {ServerResponse | Http2ServerResponse} res  response
 * @param {boolean} openTrace enable full stack debug & trace
 */
export function TraceBinding(
    app: Koatty,
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
    openTrace: boolean,
) {
    // if enable full stack debug & trace
    if (openTrace) {
        app.trace.run(() => {
            // event binding
            app.trace.bindEmitter(req);
            app.trace.bindEmitter(res);
            // execute app.callback
            app.callback()(req, res);
        });
    } else {
        app.callback()(req, res);
    }
}

/**
 * Trace middleware handler
 *
 * @export
 * @param {Koatty} app
 * @returns {*}  
 */
export function TraceHandler(app: Koatty) {
    const timeout = (app.config('http_timeout') || 10) * 1000;
    const encoding = app.config('encoding') || 'utf-8';

    return async function (ctx: KoattyContext, next: Function): Promise<any> {
        // set ctx start time
        Helper.define(ctx, 'startTime', Date.now());
        // http version
        Helper.define(ctx, 'version', ctx.req.httpVersion);
        // originalPath
        Helper.define(ctx, 'originalPath', ctx.path);
        // Encoding
        ctx.encoding = encoding;
        // auto send security header
        ctx.set('X-Powered-By', 'Koatty');
        ctx.set('X-Content-Type-Options', 'nosniff');
        ctx.set('X-XSS-Protection', '1;mode=block');

        // if enable full stack debug & trace，created traceId
        let currTraceId = '';
        if (app.trace) {
            // some key
            const traceId = ctx.headers.traceId || ctx.query.traceId;
            const requestId = ctx.headers.requestId || ctx.query.requestId;

            // traceId
            const parentId = traceId || requestId;
            // current traceId
            currTraceId = parentId || `koatty-${UUID()}`;
            app.trace.set('parentId', parentId || '');
            app.trace.set('traceId', currTraceId);
            app.trace.set('ctx', ctx);
            ctx.set('X-Trace-Id', currTraceId);
        }
        // response finish
        ctx.res.once('finish', () => {
            const { method, startTime, status, originalPath } = ctx;
            const now = Date.now();
            if (currTraceId) {
                const duration = (now - startTime) || 0;
                Logger.Write("TRACE", {
                    action: method,
                    code: status,
                    startTime,
                    duration,
                    traceId: currTraceId,
                    endTime: now,
                    cmd: originalPath || '/',
                });
            }
            Logger[(ctx.status >= 400 ? 'Error' : 'Info')](`${method} ${status} ${originalPath || '/'}`);
            ctx = null;
        });

        // try /catch
        const response: any = ctx.res;
        try {
            response.timeout = null;
            // promise.race
            const res = await Promise.race([new Promise((resolve, reject) => {
                const err: any = new Error('Request Timeout');
                err.status = 408;
                response.timeout = setTimeout(reject, timeout, err);
                return;
            }), next()]);
            if (res && ctx.status !== 304) {
                ctx.body = res;
            }
            if (ctx.body !== undefined && ctx.status === 404) {
                ctx.status = 200;
            }
            // // error
            // if (ctx.status >= 400) {
            //     ctx.throw(ctx.status, ctx.message);
            // }
            return null;
        } catch (err: any) {
            if (err instanceof Exception) {
                return catcher(app, ctx, err);
            }
            app.emit('error', err, ctx);
            return null;
        } finally {
            clearTimeout(response.timeout);
        }
    };
}

/**
 * error catcher
 *
 * @param {Koatty} app
 * @param {KoattyContext} ctx
 * @param {Error} err
 * @returns {*}  
 */
function catcher(app: Koatty, ctx: KoattyContext, err: Exception) {
    try {
        ctx.status = err.status || ctx.status || 500;
        if (ctx.body) {
            err.message = ctx.body;
        } else {
            err.message = err.message ?? ctx.message;
        }
    
        return responseBody(app, ctx, err);
    } catch (error) {
        Logger.Error(error);
        return null;
    }
}

/**
 *
 *
 * @param {Koatty} app
 * @param {KoattyContext} ctx
 * @returns {*}  
 */
function responseBody(app: Koatty, ctx: KoattyContext, err: Exception) {
    const contentType = parseResContentType(ctx);
    // accepted types
    switch (contentType) {
        case 'json':
            return jsonRend(ctx, err);
            break;
        case 'html':
            return htmlRend(ctx, err);
            break;
        case 'text':
        default:
            return textRend(ctx, err);
            break;
    }
}

/**
 * Parse response type
 *
 * @param {KoattyContext} ctx
 * @returns {*}  
 */
function parseResContentType(ctx: KoattyContext) {
    let type = '';
    if (ctx.request.type === "") {
        type = <string>ctx.accepts('json', 'html', 'text');
    } else {
        type = <string>ctx.request.is('json', 'html', 'text');
    }
    if (type) {
        return type;
    }
    return '';
}

/**
 *
 *
 * @param {KoattyContext} ctx
 * @param {Exception} err
 * @returns {*}  
 */
function htmlRend(ctx: KoattyContext, err: Exception) {
    let contentType = 'text/html';
    if (ctx.encoding !== false && contentType.indexOf('charset=') === -1) {
        contentType = `${contentType}; charset=${ctx.encoding}`;
    }
    ctx.type = contentType;

    const { code, message } = err;
    const body = `<!DOCTYPE html><html><head><title>Error - ${code || 1}</title><meta name="viewport" content="user-scalable=no, width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>body {padding: 50px 80px;font: 14px 'Microsoft YaHei','微软雅黑',Helvetica,Sans-serif;}h1, h2 {margin: 0;padding: 10px 0;}h1 {font-size: 2em;}h2 {font-size: 1.2em;font-weight: 200;color: #aaa;}pre {font-size: .8em;}</style>
    </head><body><div id="error"><h1>Error</h1><p>Oops! Your visit is rejected!</p><h2>Message:</h2><pre><code>${Helper.escapeHtml(message) || ""}</code></pre></div></body></html>`;
    ctx.set("content-Length", `${body.length}`);
    return ctx.res.end(body);
}

/**
 *
 *
 * @param {KoattyContext} ctx
 * @param {Exception} err
 * @returns {*}  
 */
function jsonRend(ctx: KoattyContext, err: Exception) {
    let contentType = 'application/json';
    if (ctx.encoding !== false && contentType.indexOf('charset=') === -1) {
        contentType = `${contentType}; charset=${ctx.encoding}`;
    }
    ctx.type = contentType;
    const { code, message } = err;
    const body = `{"code":${code || 1},"message":"${message || ""}"}`;
    ctx.set("content-Length", `${body.length}`);
    return ctx.res.end(`{"code":${code || 1},"message":"${message || ""}"}`);
}

/**
 * 
 *
 * @param {KoattyContext} ctx
 * @param {Exception} err
 * @returns {*}  
 */
function textRend(ctx: KoattyContext, err: Exception) {
    let contentType = 'text/plain';
    if (ctx.encoding !== false && contentType.indexOf('charset=') === -1) {
        contentType = `${contentType}; charset=${ctx.encoding}`;
    }
    ctx.type = contentType;
    const { code, message } = err;
    const body = `{"code":${code || 1},"message":"${message || ""}"}`;
    ctx.set("content-Length", `${body.length}`);
    return ctx.res.end(body);
}

