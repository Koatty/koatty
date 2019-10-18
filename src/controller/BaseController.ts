/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-18 16:07:15
 */
// tslint:disable-next-line: no-implicit-dependencies
import * as Koa from "Koa";
import * as helper from "think_lib";
import { Scope } from '../core/Constants';
import { Base } from '../core/Base';
import { BaseApp } from '../Koatty';

export interface BaseControllerOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
    router: [];
    params: {};
}

export interface BaseControllerInterface extends Base {
    app: BaseApp;
    ctx: Koa.Context;
    readonly assign: Function;
    readonly config: Function;
    readonly deny: Function;
    readonly expires: Function;
    readonly fail: Function;
    readonly file: Function;
    readonly get: Function;
    readonly header: Function;
    readonly isJsonp: Function;
    readonly isMethod: Function;
    readonly json: Function;
    readonly jsonp: Function;
    readonly ok: Function;
    readonly param: Function;
    readonly post: Function;
    readonly redirect: Function;
    readonly referer: Function;
    readonly render: Function;
    readonly types: Function;
    readonly write: Function;
}

export class BaseController extends Base implements BaseControllerInterface {
    public app: BaseApp;
    public ctx: Koa.Context;
    protected _options: BaseControllerOptions;

    /**
     * Call if the action is not found
     *
     * @public
     * @returns {*}
     * @memberof BaseController
     */
    public get __empty(): any {
        return this.ctx.throw('404');
    }

    /**
     * Whether it is a GET request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public get isGet(): boolean {
        return this.ctx.method === 'GET';
    }

    /**
     * Whether it is a POST request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public get isPost(): boolean {
        return this.ctx.method === 'POST';
    }

    /**
     * Determines whether the METHOD request is specified
     *
     * @public
     * @param {string} method
     * @returns {boolean}
     * @memberof BaseController
     */
    public isMethod(method: string): boolean {
        return this.ctx.method === method.toUpperCase();
    }

    /**
     * Whether it is an AJAX request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public get isAjax(): boolean {
        return this.ctx.headers['x-requested-with'] === 'XMLHttpRequest';
    }

    /**
     * Whether it is a PJAX request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public get isPjax(): boolean {
        return this.ctx.headers['x-pjax'] || this.ctx.headers['X-Pjax'] || false;
    }

    /**
     * Whether it is jsonp call
     *
     * @public
     * @param {string} [name='jsonpcallback']
     * @returns {boolean}
     * @memberof BaseController
     */
    public isJsonp(name = 'jsonpcallback'): boolean {
        return !!this.ctx.query[name];
    }

    /**
     * Get and construct querystring parameters
     *
     * @public
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    public get(name?: string, value?: any): any {
        return this.ctx.querys(name, value);
    }

    /**
     * Get and construct POST parameters
     *
     * @public
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    public post(name?: string, value?: any): any {
        return this.ctx.post(name, value);
    }

    /**
     * Get post or get parameters, post priority
     *
     * @public
     * @param {string} name
     * @returns {*}
     * @memberof BaseController
     */
    public param(name?: string): any {
        return this.ctx.param(name);
    }

    /**
     * Obtain and construct uploaded files
     *
     * @public
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    public file(name?: string, value?: any): any {
        return this.ctx.file(name, value);
    }

    /**
     * Read app configuration
     *
     * @public
     * @param {string} name
     * @param {string} [type='config']
     * @returns
     * @memberof BaseController
     */
    public config(name: string, type = 'config') {
        return this.app.config(name, type);
    }

    /**
     * Get or set headers.
     *
     * @public
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    public header(name?: string, value?: any): any {
        if (name === undefined) {
            return this.ctx.headers;
        }
        if (value === undefined) {
            return this.ctx.get(name);
        }
        return this.ctx.set(name, value);
    }

    /**
     * Content-type operation
     *
     * @public
     * @param {string} contentType
     * @param {(string | boolean)} [encoding]
     * @returns {void}
     * @memberof BaseController
     */
    public types(contentType?: string, encoding?: string | boolean): void {
        if (!contentType) {
            return (this.ctx.headers['content-type'] || '').split(';')[0].trim();
        }
        if (encoding !== false && contentType.toLowerCase().indexOf('charset=') === -1) {
            contentType += '; charset=' + (encoding || this.app.config('encoding'));
        }
        this.ctx.type = contentType;
        return;
    }

    /**
     * Get referrer
     *
     * @public
     * @returns {string}
     * @memberof BaseController
     */
    public referer(): string {
        return this.ctx.headers.referer || this.ctx.headers.referrer || '';
    }

    /**
     * set cache-control and expires header
     *
     * @public
     * @param {number} [timeout=30]
     * @returns {void}
     * @memberof BaseController
     */
    public expires(timeout = 30): void {
        timeout = helper.toNumber(timeout) * 1000;
        const date = new Date(Date.now() + timeout);
        this.ctx.set('Cache-Control', `max-age=${timeout}`);
        this.ctx.set('Expires', date.toUTCString());
        return;
    }

    /**
     * Url redirect
     *
     * @public
     * @param {string} urls
     * @param {string} [alt]
     * @returns {*}
     * @memberof BaseController
     */
    public redirect(urls: string, alt?: string): any {
        this.ctx.redirect(urls, alt);
        return this.app.prevent();
    }

    /**
     * Block access
     *
     * @public
     * @param {number} [code=403]
     * @returns {*}
     * @memberof BaseController
     */
    public deny(code = 403): any {
        this.ctx.throw(code);
        return this.app.prevent();
    }

    /**
     * Set response Body content
     *
     * @public
     * @param {*} data
     * @param {string} [contentType]
     * @param {string} [encoding]
     * @returns {*}
     * @memberof BaseController
     */
    public write(data: any, contentType?: string, encoding?: string): any {
        contentType = contentType || 'text/plain';
        encoding = encoding || this.app.config('encoding');
        this.types(contentType, encoding);
        this.ctx.body = data;
        return this.app.prevent();
    }

    /**
     * Respond to json formatted content
     *
     * @public
     * @param {*} data
     * @returns {*}
     * @memberof BaseController
     */
    public json(data: any): any {
        return this.write(data, 'application/json');
    }

    /**
     * Respond to jsonp formatted content
     *
     * @public
     * @param {*} data
     * @returns {*}
     * @memberof BaseController
     */
    public jsonp(data: any): any {
        let callback = this.ctx.querys('callback') || 'callback';
        //过滤callback值里的非法字符
        callback = callback.replace(/[^\w\.]/g, '');
        if (callback) {
            data = `${callback}(${(data !== undefined ? JSON.stringify(data) : '')})`;
        }
        return this.write(data, 'application/json');
    }

    /**
     * Response to normalize json format content for success
     *
     * @public
     * @param {string} errmsg
     * @param {*} data
     * @param {number} [code=200]
     * @returns {*}
     * @memberof BaseController
     */
    public ok(errmsg?: string, data?: any, code = 200): any {
        const obj: any = {
            'status': 1,
            'code': code,
            'message': errmsg || ''
        };
        if (data !== undefined) {
            obj.data = data;
        } else {
            obj.data = {};
        }
        return this.write(obj, 'application/json');
    }

    /**
     * Response to normalize json format content for fail
     *
     * @public
     * @param {*} errmsg
     * @param {*} data
     * @param {number} [code=500]
     * @returns {*}
     * @memberof BaseController
     */
    public fail(errmsg?: any, data?: any, code = 500): any {
        const obj: any = {
            'status': 0,
            'code': code,
            'message': (helper.isError(errmsg) ? errmsg.message : errmsg) || 'error'
        };
        if (data !== undefined) {
            obj.data = data;
        } else {
            obj.data = {};
        }
        return this.write(obj, 'application/json');
    }

    /**
     * Template assignment, dependent on middleware `think_view`
     *
     * @public
     * @param {string} name
     * @param {*} value
     * @returns {*}
     * @memberof BaseController
     */
    public assign(name?: string, value?: any): any {
        if (!this.ctx.assign) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        return this.ctx.assign(name, value);
    }

    /**
     * Positioning, rendering, output templates, dependent on middleware `think_view`
     *
     * @public
     * @param {string} templateFile
     * @param {string} [charset]
     * @param {string} [contentType]
     * @returns {*}
     * @memberof BaseController
     */
    public render(templateFile?: string, charset?: string, contentType?: string): any {
        if (!this.ctx.render) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        // tslint:disable-next-line: no-null-keyword
        return this.ctx.render(templateFile, null, charset, contentType);
    }

}


// const propertys = ['constructor', 'init'];
// export const BaseController = new Proxy(Base, {
//     set(target, key, value, receiver) {
//         if (Reflect.get(target, key, receiver) === undefined) {
//             return Reflect.set(target, key, value, receiver);
//         } else if (key === 'init') {
//             return Reflect.set(target, key, value, receiver);
//         } else {
//             throw Error('Cannot redefine getter-only property');
//         }
//     },
//     deleteProperty(target, key) {
//         throw Error('Cannot delete getter-only property');
//     },
//     construct(target, args, newTarget) {
//         Reflect.ownKeys(target.prototype).map((n) => {
//             if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
//                 throw Error(`Cannot override the final method '${helper.toString(n)}'`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });