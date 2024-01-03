/*
 * @Description: base controller 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2024-01-03 21:57:20
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { Koatty, KoattyContext } from 'koatty_core';
import { formatApiData } from '../util/Helper';
import { ApiInput, ApiOutput, IController } from './Components';

/**
 * Base controller
 *
 * @export
 * @deprecated When the framework version is > 3.10.5, do not need to inherit the Base class.
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
   * @memberof BaseController
   */
  init(...arg: any[]): void {

  }


  /**
   * Response to normalize json format content for success
   *
   * @deprecated 使用 Output.ok 代替
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
   * @deprecated 使用 Output.fail 代替
   * @param {(string | ApiInput)} msg   
   * @param {*} [data]    
   * @param {number} [code=1]    
   * @returns {*}
   * @memberof BaseController
   */
  public fail(msg: Error | string | ApiInput, data?: any, code = 1) {
    const obj: ApiOutput = formatApiData(msg, data, code);
    this.ctx.body = obj.data;
    this.ctx.throw(obj.message, obj.code, 200);
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
