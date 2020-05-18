/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-18 11:00:43
 */
// tslint:disable-next-line: no-implicit-dependencies
import * as Koa from "koa";
import * as path from "path";
import * as helper from "think_lib";
import { Koatty } from "../Koatty";
import { IController } from "./IController";
import { ObjectDefinitionOptions } from "think_container";

/**
 * Base controller
 *
 * @export
 * @class BaseController
 * @implements {BaseControllerInterface}
 */
export class BaseController implements IController {
    public app: Koatty;
    public ctx: Koa.Context;

    protected _options: ObjectDefinitionOptions;

    /**
     * instance of BaseController.
     * @param {Koatty} app
     * @param {Koa.Context} ctx
     * @memberof BaseController
     */
    protected constructor(ctx: Koa.Context) {
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
     * Set response content-type
     *
     * @public
     * @param {string} contentType
     * @param {(string | boolean)} [encoding]
     * @returns {string}
     * @memberof BaseController
     */
    public type(contentType?: string, encoding?: string | boolean): string {
        if (!contentType) {
            return (this.ctx.headers["content-type"] || "").split(";")[0].trim();
        }
        if (encoding !== false && contentType.toLowerCase().indexOf("charset=") === -1) {
            contentType += "; charset=" + (encoding || this.app.config("encoding"));
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
        timeout = helper.toNumber(timeout) * 1000;
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
    public body(data: any, contentType?: string, encoding?: string) {
        contentType = contentType || "text/plain";
        encoding = encoding || this.app.config("encoding") || "utf-8";
        this.type(contentType, encoding);
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
    public json(data: any) {
        return this.body(data, "application/json");
    }

    /**
     * Response to normalize json format content for success
     *
     * @param {string} [msg]
     * @param {*} [data]
     * @param {number} [code=200]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public ok(msg?: string, data?: any, code = 200): Promise<any> {
        this.ctx.type = "application/json";
        const obj: any = {
            "status": code,
            "message": msg || ""
        };
        if (data !== undefined) {
            obj.data = data;
        }
        return this.json(obj);
    }

    /**
     * Response to normalize json format content for fail
     *
     * @param {string} [msg]
     * @param {*} [data]
     * @param {number} [code=500]
     * @returns {Promise<any>}
     * @memberof BaseController
     */
    public fail(msg?: any, data?: any, code = 500): Promise<any> {
        this.ctx.type = "application/json";
        const obj: any = {
            "status": code,
            "message": msg || ""
        };
        if (data !== undefined) {
            obj.data = data;
        }
        return this.json(obj);
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
//             if (newTarget.prototype.hasOwnProperty(n) && !propertys.includes(helper.toString(n))) {
//                 throw Error(`Cannot override the final method "${helper.toString(n)}"`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
