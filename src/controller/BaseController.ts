/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-20 15:45:24
 */
import { Helper } from "../util/Helper";
import { Koatty, KoattyContext } from 'koatty_core';
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

    // /**
    //  * Class pre-execution method, executed before each class member methods (except constructor, init, __after) are executed.
    //  *
    //  * @returns {Promise<any>}
    //  * @memberof BaseController
    //  */
    // public __before(): Promise<any> {
    //     return Promise.resolve();
    // }

    // /**
    //  * Class after-execution method,after each class member methods (except constructor, init, __before) are executed.
    //  *
    //  * @public
    //  * @returns {*}
    //  * @memberof BaseController
    //  */
    // public __after(): Promise<any> {
    //     return Promise.resolve();
    // }

    /**
     * Format api interface data format
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
            const { code, message } = <any>msg;
            obj.code = code || defaultCode;
            obj.message = message;
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
        return Promise.resolve(obj);
    }

    /**
     * Response to normalize json format content for fail
     *
     * @param {(string | ApiInput)} msg   
     * @param {*} [data]    
     * @param {number} [code=1]    
     * @returns {Promise<ApiOutput>}
     * @memberof BaseController
     */
    public fail(msg: Error | string | ApiInput, data?: any, code = 1): Promise<ApiOutput> {
        const obj: ApiOutput = this.formatApiData(msg, data, code);
        return Promise.resolve(obj);
    }

}


// const properties = ["constructor", "init"];
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
//             if (newTarget.prototype.hasOwnProperty(n) && !properties.includes(Helper.toString(n))) {
//                 throw Error(`Cannot override the final method "${Helper.toString(n)}"`);
//             }
//         });
//         return Reflect.construct(target, args, newTarget);
//     }
// });
