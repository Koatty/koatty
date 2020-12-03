/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-20 15:45:24
 */
import { Helper } from "../util/Helper";
import { Koatty, KoattyContext } from "../Koatty";
import { ObjectDefinitionOptions } from "koatty_container";
import { ApiInput, ApiOutput, IController } from '../core/Component';

/**
 * Base controller
 *
 * @export
 * @class BaseController
 * @implements {IController}
 */
export class BaseController implements IController {
    public app: Koatty;
    public ctx: KoattyContext;

    protected _options: ObjectDefinitionOptions;

    /**
     * instance of BaseController.
     * @param {Koatty} app
     * @param {KoattyContext} ctx
     * @memberof BaseController
     */
    protected constructor(ctx: KoattyContext) {
        this.ctx = ctx;
        this.init();
    }

    /**
     * init
     *
     * @protected
     * @memberof BaseController
     */
    protected init(): void {

    }

    /**
     * Class pre-execution method, executed before each class member methods (except constructor, init, __after) are executed.
     *
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public __before(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Class after-execution method,after each class member methods (except constructor, init, __before) are executed.
     *
     * @public
     * @returns {*}
     * @memberof BaseController
     */
    public __after(): Promise<any> {
        return Promise.resolve();
    }

    /**
     * Whether it is a GET request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public isGet(): boolean {
        return this.ctx.method === "GET";
    }

    /**
     * Whether it is a POST request
     *
     * @public
     * @returns {boolean}
     * @memberof BaseController
     */
    public isPost(): boolean {
        return this.ctx.method === "POST";
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
     * Get/Set headers.
     *
     * @public
     * @param {string} [name]
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
     * Get POST/GET parameters, the POST value is priority.
     *
     * @param {string} [name]
     * @returns
     * @memberof BaseController
     */
    public param(name?: string) {
        return this.ctx.bodyParser().then((body: any) => {
            const getParams: any = this.ctx.queryParser() || {};
            const postParams = (body.post ? body.post : body) || {};
            if (name !== undefined) {
                return postParams[name] === undefined ? getParams[name] : postParams[name];
            }
            return { ...getParams, ...postParams };
        });
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
    public type(contentType: string, encoding?: string | boolean): string {
        if (encoding !== false && !contentType.includes("charset")) {
            contentType = `${contentType}; charset=${encoding || this.app.config("encoding")}`;
        }
        this.ctx.type = contentType;
        return contentType;
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
        timeout = Helper.toNumber(timeout) * 1000;
        const date = new Date(Date.now() + timeout);
        this.ctx.set("Cache-Control", `max-age=${timeout}`);
        return this.ctx.set("Expires", date.toUTCString());
    }

    /**
     * Url redirect
     *
     * @param {string} urls
     * @param {string} [alt]
     * @returns {void}
     * @memberof BaseController
     */
    public redirect(urls: string, alt?: string): void {
        return this.ctx.redirect(urls, alt);
    }

    /**
     * Block access
     *
     * @param {number} [code=403]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public deny(code = 403): Promise<any> {
        return this.ctx.throw(code);
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
    public body(data: any, contentType?: string, encoding?: string): Promise<any> {
        contentType = contentType || "text/plain";
        encoding = encoding || this.app.config("encoding") || "utf-8";
        this.type(contentType, encoding);
        this.ctx.body = data;
        // return this.app.prevent();
        return null;
    }

    /**
     * Respond to json formatted content
     *
     * @param {*} data
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public json(data: any) {
        return this.body(data, "application/json");
    }

    /**
     * 格式化api接口数据格式
     *
     * @private
     * @param {Error | string | ApiInput} msg   待处理的接口数据信息｜接口msg
     * @param {*} data    待返回的数据
     * @param {number} defaultCode   默认错误码
     * @returns {ApiOutput}   格式化之后的接口数据
     * @memberof BaseController
     */
    protected formatApiData(msg: any, data: any, defaultCode: number): ApiOutput {
        let obj: ApiOutput = {
            code: defaultCode,
            message: '',
            data: null,
        };
        if (Helper.isError(msg)) {
            const { c, m } = <any>msg;
            obj.code = c || defaultCode;
            obj.message = m;
        } else if (Helper.isObject(msg)) {
            obj = { ...obj, ...msg };
        } else {
            obj.message = msg;
            obj.data = data;
        }
        return obj;
    }

    /**
     * Response to normalize json format content for success
     *
     * @param {(string | ApiInput)} msg   待处理的message消息
     * @param {*} [data]    待处理的数据
     * @param {number} [code=200]    错误码，默认0
     * @returns {Promise<ApiOutput>}
     * @memberof BaseController
     */
    public ok(msg: string | ApiInput, data?: any, code = 0): Promise<ApiOutput> {
        const obj: ApiOutput = this.formatApiData(msg, data, code);
        return this.json(obj);
    }

    /**
     * Response to normalize json format content for fail
     *
     * @param {(string | ApiInput)} msg   待处理的message消息
     * @param {*} [data]    待处理的数据
     * @param {number} [code=500]    错误码，默认1
     * @returns {Promise<ApiOutput>}
     * @memberof BaseController
     */
    public fail(msg: Error | string | ApiInput, data?: any, code = 1): Promise<ApiOutput> {
        const obj: ApiOutput = this.formatApiData(msg, data, code);
        return this.json(obj);
    }

    /**
     * Prevent next process
     *
     * @returns {*}  
     * @memberof BaseController
     */
    public prevent() {
        return this.app.prevent();
    }

}


// const propertys = ["constructor", "init"];
// export const BaseController = new Proxy(Base, {
//     set(target, key, value, receiver) {
//         if (Reflect.get(target, key, receiver) === undefined) {
//             return Reflect.set(target, key, value, receiver);
//         } else if (key === "init") {
//             return Reflect.set(target, key, value, receiver);
//         } else {
//             throw Error("Cannot redefine getter-only property");
//         }
//     },
//     deleteProperty(target, key) {
//         throw Error("Cannot delete getter-only property");
//     },
//     construct(target, args, newTarget) {
//         Reflect.ownKeys(target.prototype).map((n) => {
//             if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(Helper.toString(n))) {
//                 throw Error(`Cannot override the final method "${Helper.toString(n)}"`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
