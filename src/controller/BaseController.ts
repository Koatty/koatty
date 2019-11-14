/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-14 14:06:34
 */
// tslint:disable-next-line: no-implicit-dependencies
import * as Koa from "Koa";
import * as helper from "think_lib";
import { Koatty } from '../Koatty';
import { ObjectDefinitionOptions } from '../core/IContainer';
import { Value } from '../core/Decorators';

/**
 *
 * @interface BaseControllerInterface
 */
interface BaseControllerInterface {
    app: Koatty;
    ctx: Koa.Context;
    encoding: string;
    init: () => void;
    __before: () => Promise<any>;
    __empty: () => Promise<any>;
    readonly assign: (name?: string, value?: any) => Promise<any>;
    readonly deny: (code?: number) => Promise<any>;
    readonly expires: (timeout: number) => void;
    readonly fail: (errmsg?: Error | string, data?: any, code?: number) => Promise<any>;
    readonly header: (name?: string, value?: any) => any;
    readonly isAjax: () => boolean;
    readonly isGet: () => boolean;
    readonly isJsonp: () => boolean;
    readonly isMethod: (method: string) => boolean;
    readonly isPjax: () => boolean;
    readonly isPost: () => boolean;
    readonly json: (data: any) => Promise<any>;
    readonly jsonp: (data: any) => Promise<any>;
    readonly ok: (errmsg?: Error | string, data?: any, code?: number) => Promise<any>;
    readonly param: (name?: string) => any;
    readonly redirect: (urls: string, alt?: string) => Promise<any>;
    readonly referer: () => string;
    readonly render: (templateFile?: string, charset?: string, contentType?: string) => Promise<any>;
    readonly resType: (contentType?: string, encoding?: string | boolean) => string;
    readonly write: (data: any, contentType?: string, encoding?: string) => Promise<any>;
}

/**
 * base controller
 *
 * @export
 * @class BaseController
 * @implements {BaseControllerInterface}
 */
export class BaseController implements BaseControllerInterface {
    public app: Koatty;
    public ctx: Koa.Context;
    @Value("encoding")
    public encoding: string;
    protected _options: ObjectDefinitionOptions;


    /**
     * instance of BaseController.
     * @param {Koatty} app
     * @param {Koa.Context} ctx
     * @memberof BaseController
     */
    protected constructor(app: Koatty, ctx: Koa.Context) {
        this.app = app;
        this.ctx = ctx;
        this.init();
    }

    /**
     * init
     */
    public init() {

    }

    /**
     * Class pre-method, which is executed before all class member methods are execute
     *
     * @memberof BaseController
     */
    public __before(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Call if the action is not found
     *
     * @public
     * @returns {*}
     * @memberof BaseController
     */
    public __empty(): Promise<any> {
        return this.ctx.throw('404');
    }

    /**
     * Whether it is a GET request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public isGet(): boolean {
        return this.ctx.method === 'GET';
    }

    /**
     * Whether it is a POST request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public isPost(): boolean {
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
    public isAjax(): boolean {
        return this.ctx.headers['x-requested-with'] === 'XMLHttpRequest';
    }

    /**
     * Whether it is a PJAX request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public isPjax(): boolean {
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
     * Set response content-type
     *
     * @public
     * @param {string} contentType
     * @param {(string | boolean)} [encoding]
     * @returns {string}
     * @memberof BaseController
     */
    public resType(contentType?: string, encoding?: string | boolean): string {
        if (!contentType) {
            return (this.ctx.headers['content-type'] || '').split(';')[0].trim();
        }
        if (encoding !== false && contentType.toLowerCase().indexOf('charset=') === -1) {
            contentType += '; charset=' + (encoding || this.app.config('encoding'));
        }
        return this.ctx.type = contentType;
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
        return this.ctx.set('Expires', date.toUTCString());
    }

    /**
     * Url redirect
     *
     * @param {string} urls
     * @param {string} [alt]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public redirect(urls: string, alt?: string): Promise<any> {
        this.ctx.redirect(urls, alt);
        return this.app.prevent();
    }

    /**
     * Block access
     *
     * @param {number} [code=403]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public deny(code = 403): Promise<any> {
        this.ctx.throw(code);
        return this.app.prevent();
    }

    /**
     * Set response Body content
     *
     * @param {*} data
     * @param {string} [contentType]
     * @param {string} [encoding]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public write(data: any, contentType?: string, encoding?: string): Promise<any> {
        contentType = contentType || 'text/plain';
        encoding = encoding || this.encoding || 'utf-8';
        this.resType(contentType, encoding);
        this.ctx.body = data;
        return this.app.prevent();
    }

    /**
     * Respond to json formatted content
     *
     * @param {*} data
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public json(data: any): Promise<any> {
        return this.write(data, 'application/json');
    }

    /**
     * Respond to jsonp formatted content
     *
     * @param {*} data
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public jsonp(data: any): Promise<any> {
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
     * @param {string} [errmsg]
     * @param {*} [data]
     * @param {number} [code=200]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public ok(errmsg?: string, data?: any, code = 200): Promise<any> {
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
     * @param {*} [errmsg]
     * @param {*} [data]
     * @param {number} [code=500]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public fail(errmsg?: any, data?: any, code = 500): Promise<any> {
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
     * @param {string} [name]
     * @param {*} [value]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public assign(name?: string, value?: any): Promise<any> {
        if (!this.ctx.assign) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        return this.ctx.assign(name, value);
    }

    /**
     * Positioning, rendering, output templates, dependent on middleware `think_view`
     *
     * @param {string} [templateFile]
     * @param {string} [charset]
     * @param {string} [contentType]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public render(templateFile?: string, charset?: string, contentType?: string): Promise<any> {
        if (!this.ctx.render) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        charset = charset || this.encoding || "utf-8";
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
