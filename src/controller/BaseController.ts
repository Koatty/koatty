/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-16 17:12:40
 */
import * as helper from "think_lib";
import { Scope } from '../core/Constants';

export interface BaseControllerOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
    router: [];
    params: {};
}

class Base {
    public ctx: any;
    public app: any;
    protected _options: BaseControllerOptions;

    /**
     * Creates an instance of BaseController.
     * @param {*} app
     * @memberof BaseController
     */
    protected constructor(app: any) {
        try {
            this.app = app;
            this.init();
        } catch (e) {
            throw Error(e.stack);
        }
    }

    /**
     * init
     */
    protected init() {

    }

    /**
     * Call if the action is not found
     *
     * @protected
     * @returns {*}
     * @memberof BaseController
     */
    protected get __empty(): any {
        return this.ctx.throw('404');
    }

    /**
     * Whether it is a GET request
     *
     * @protected
     * @returns {boolean}
     * @memberof BaseController
     */
    protected get isGet(): boolean {
        return this.ctx.method === 'GET';
    }

    /**
     * Whether it is a POST request
     *
     * @protected
     * @returns {boolean}
     * @memberof BaseController
     */
    protected get isPost(): boolean {
        return this.ctx.method === 'POST';
    }

    /**
     * Determines whether the METHOD request is specified
     *
     * @protected
     * @param {string} method
     * @returns {boolean}
     * @memberof BaseController
     */
    protected isMethod(method: string): boolean {
        return this.ctx.method === method.toUpperCase();
    }

    /**
     * Whether it is an AJAX request
     *
     * @protected
     * @returns {boolean}
     * @memberof BaseController
     */
    protected get isAjax(): boolean {
        return this.ctx.headers['x-requested-with'] === 'XMLHttpRequest';
    }

    /**
     * Whether it is a PJAX request
     *
     * @protected
     * @returns {boolean}
     * @memberof BaseController
     */
    protected get isPjax(): boolean {
        return this.ctx.headers['x-pjax'] || this.ctx.headers['X-Pjax'] || false;
    }

    /**
     * Whether it is jsonp call
     *
     * @protected
     * @param {string} [name='jsonpcallback']
     * @returns {boolean}
     * @memberof BaseController
     */
    protected isJsonp(name = 'jsonpcallback'): boolean {
        return !!this.ctx.query[name];
    }

    /**
     * Get and construct querystring parameters
     *
     * @protected
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    protected get(name?: string, value?: any): any {
        return this.ctx.querys(name, value);
    }

    /**
     * Get and construct POST parameters
     *
     * @protected
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    protected post(name?: string, value?: any): any {
        return this.ctx.post(name, value);
    }

    /**
     * Get post or get parameters, post priority
     *
     * @protected
     * @param {string} name
     * @returns {*}
     * @memberof BaseController
     */
    protected param(name?: string): any {
        return this.ctx.param(name);
    }

    /**
     * Obtain and construct uploaded files
     *
     * @protected
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    protected file(name?: string, value?: any): any {
        return this.ctx.file(name, value);
    }

    /**
     * Read app configuration
     *
     * @protected
     * @param {string} name
     * @param {string} [type='config']
     * @returns
     * @memberof BaseController
     */
    protected config(name: string, type = 'config') {
        return this.app.config(name, type);
    }

    /**
     * Get or set headers.
     *
     * @protected
     * @param {string} name
     * @param {*} [value]
     * @returns {*}
     * @memberof BaseController
     */
    protected header(name?: string, value?: any): any {
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
     * @protected
     * @param {string} contentType
     * @param {(string | boolean)} [encoding]
     * @returns {void}
     * @memberof BaseController
     */
    protected types(contentType?: string, encoding?: string | boolean): void {
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
     * @protected
     * @returns {string}
     * @memberof BaseController
     */
    protected referer(): string {
        return this.ctx.headers.referer || this.ctx.headers.referrer || '';
    }

    /**
     * set cache-control and expires header
     *
     * @protected
     * @param {number} [timeout=30]
     * @returns {void}
     * @memberof BaseController
     */
    protected expires(timeout = 30): void {
        timeout = helper.toNumber(timeout) * 1000;
        const date = new Date(Date.now() + timeout);
        this.ctx.set('Cache-Control', `max-age=${timeout}`);
        this.ctx.set('Expires', date.toUTCString());
        return;
    }

    /**
     * Url redirect
     *
     * @protected
     * @param {string} urls
     * @param {string} [alt]
     * @returns {*}
     * @memberof BaseController
     */
    protected redirect(urls: string, alt?: string): any {
        this.ctx.redirect(urls, alt);
        return this.app.prevent();
    }

    /**
     * Block access
     *
     * @protected
     * @param {number} [code=403]
     * @returns {*}
     * @memberof BaseController
     */
    protected deny(code = 403): any {
        this.ctx.throw(code);
        return this.app.prevent();
    }

    /**
     * Set response Body content
     *
     * @protected
     * @param {*} data
     * @param {string} [contentType]
     * @param {string} [encoding]
     * @returns {*}
     * @memberof BaseController
     */
    protected write(data: any, contentType?: string, encoding?: string): any {
        contentType = contentType || 'text/plain';
        encoding = encoding || this.app.config('encoding');
        this.types(contentType, encoding);
        this.ctx.body = data;
        return this.app.prevent();
    }

    /**
     * Respond to json formatted content
     *
     * @protected
     * @param {*} data
     * @returns {*}
     * @memberof BaseController
     */
    protected json(data: any): any {
        return this.write(data, 'application/json');
    }

    /**
     * Respond to jsonp formatted content
     *
     * @protected
     * @param {*} data
     * @returns {*}
     * @memberof BaseController
     */
    protected jsonp(data: any): any {
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
     * @protected
     * @param {string} errmsg
     * @param {*} data
     * @param {number} [code=200]
     * @returns {*}
     * @memberof BaseController
     */
    protected success(errmsg?: string, data?: any, code = 200): any {
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
     * Response to normalize json format content for success
     *
     * @protected
     * @param {string} errmsg
     * @param {*} data
     * @param {number} [code=200]
     * @returns {*}
     * @memberof BaseController
     */
    protected ok(errmsg?: string, data?: any, code = 200): any {
        return this.success(errmsg, data, code);
    }

    /**
     * Response to normalize json format content for fail
     *
     * @protected
     * @param {*} errmsg
     * @param {*} data
     * @param {number} [code=500]
     * @returns {*}
     * @memberof BaseController
     */
    protected error(errmsg?: any, data?: any, code = 500): any {
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
     * Response to normalize json format content for fail
     *
     * @protected
     * @param {*} errmsg
     * @param {*} data
     * @param {number} [code=500]
     * @returns {*}
     * @memberof BaseController
     */
    protected fail(errmsg?: any, data?: any, code = 500): any {
        return this.error(errmsg, data, code);
    }

    /**
     * Cookie operation, dependent on middleware `think_cookie`
     *
     * @protected
     * @param {*} name
     * @param {*} [value]
     * @param {*} [option]
     * @returns {*}
     * @memberof BaseController
     */
    protected cookie(name: any, value?: any, option?: any): any {
        if (!this.ctx.cookie) {
            return this.ctx.throw('500', 'The think_cookie middleware is not installed or configured incorrectly.');
        }
        return this.ctx.cookie(name, value, option);
    }

    /**
     * Session operation, dependent on middleware `think_session`
     *
     * @protected
     * @param {*} name
     * @param {*} [value]
     * @param {number} [timeout]
     * @returns {*}
     * @memberof BaseController
     */
    protected session(name: any, value?: any, timeout?: number): any {
        if (!this.ctx.session) {
            return this.ctx.throw('500', 'The think_session middleware is not installed or configured incorrectly.');
        }
        return this.ctx.session(name, value, timeout);
    }

    /**
     * Cache operation, dependent on middleware `think_cache`
     *
     * @protected
     * @param {*} name
     * @param {*} [value]
     * @param {number} [timeout]
     * @returns {*}
     * @memberof BaseController
     */
    protected cache(name: any, value?: any, timeout?: number): any {
        if (!this.app.cache) {
            return this.app.throw('500', 'The think_cache middleware is not installed or configured incorrectly.');
        }
        return this.app.cache(name, value, timeout);
    }

    /**
     * Template assignment, dependent on middleware `think_view`
     *
     * @protected
     * @param {string} name
     * @param {*} value
     * @returns {*}
     * @memberof BaseController
     */
    protected set(name?: string, value?: any): any {
        return this.assign(name, value);
    }

    /**
     * Template assignment, dependent on middleware `think_view`
     *
     * @protected
     * @param {string} name
     * @param {*} value
     * @returns {*}
     * @memberof BaseController
     */
    protected assign(name?: string, value?: any): any {
        if (!this.ctx.assign) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        return this.ctx.assign(name, value);
    }

    /**
     * Render the template and return the content, dependent on middleware `think_view`
     *
     * @protected
     * @param {string} templateFile
     * @param {*} data
     * @returns {*}
     * @memberof BaseController
     */
    protected compile(templateFile?: string, data?: any): any {
        if (!this.ctx.compile) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        return this.ctx.compile(templateFile, data);
    }

    /**
     * Positioning, rendering, output templates, dependent on middleware `think_view`
     *
     * @protected
     * @param {string} templateFile
     * @param {string} [charset]
     * @param {string} [contentType]
     * @returns {*}
     * @memberof BaseController
     */
    protected display(templateFile?: string, charset?: string, contentType?: string): any {
        return this.render(templateFile, charset, contentType);
    }

    /**
     * Positioning, rendering, output templates, dependent on middleware `think_view`
     *
     * @protected
     * @param {string} templateFile
     * @param {string} [charset]
     * @param {string} [contentType]
     * @returns {*}
     * @memberof BaseController
     */
    protected render(templateFile?: string, charset?: string, contentType?: string): any {
        if (!this.ctx.render) {
            return this.ctx.throw('500', 'The think_view middleware is not installed or configured incorrectly.');
        }
        // tslint:disable-next-line: no-null-keyword
        return this.ctx.render(templateFile, null, charset, contentType);
    }
}


const propertys = ['constructor', 'init'];
export const BaseController = new Proxy(Base, {
    set(target, key, value, receiver) {
        if (Reflect.get(target, key, receiver) === undefined) {
            return Reflect.set(target, key, value, receiver);
        } else if (key === 'init') {
            return Reflect.set(target, key, value, receiver);
        } else {
            throw Error('Cannot redefine getter-only property');
        }
    },
    deleteProperty(target, key) {
        throw Error('Cannot delete getter-only property');
    },
    construct(target, args, newTarget) {
        Reflect.ownKeys(target.prototype).map((n) => {
            if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
                throw Error(`Cannot override the final method '${helper.toString(n)}'`);
            }
        });
        return Reflect.construct(target, args, newTarget);
    }
});