/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-20 15:45:24
 */
import { formatApiData } from "../util/Helper";
import { Koatty, KoattyContext } from 'koatty_core';
import { ApiInput, ApiOutput, IController } from '../core/Component';

/**
 * Base controller
 *
 * @export
 * @class BaseController
 * @implements {IController}
 */
export class BaseController implements IController {
    readonly app: Koatty;
    readonly ctx: KoattyContext;

    /**
     * instance of BaseController.
     * @param {Koatty} app
     * @param {KoattyContext} ctx
     * @memberof BaseController
     */
    protected constructor(ctx: KoattyContext, ...arg: any[]) {
        this.ctx = ctx;
        this.init(arg);
    }

    /**
     * init
     *
     * @protected
     * @memberof BaseController
     */
    protected init(...arg: any[]): void {

    }

    // /**
    //  * Class pre-execution method (except constructor, init, __after).
    //  *
    //  * @returns {Promise<any>}
    //  * @memberof BaseController
    //  */
    // public __before(): Promise<any> {
    //     return Promise.resolve();
    // }

    // /**
    //  * Class after-execution method (except constructor, init, __before).
    //  *
    //  * @public
    //  * @returns {*}
    //  * @memberof BaseController
    //  */
    // public __after(): Promise<any> {
    //     return Promise.resolve();
    // }

    /**
     * Response to normalize json format content for success
     *
     * @param {(string | ApiInput)} msg   待处理的message消息
     * @param {*} [data]    待处理的数据
     * @param {number} [code=200]    错误码，默认0
     * @returns {*}
     * @memberof BaseController
     */
    public ok(msg: string | ApiInput, data?: any, code = 0) {
        const obj: ApiOutput = formatApiData(msg, data, code);
        return Promise.resolve(obj);
    }

    /**
     * Response to normalize json format content for fail
     *
     * @param {(string | ApiInput)} msg   
     * @param {*} [data]    
     * @param {number} [code=1]    
     * @returns {*}
     * @memberof BaseController
     */
    public fail(msg: Error | string | ApiInput, data?: any, code = 1): any {
        const obj: ApiOutput = formatApiData(msg, data, code);
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
