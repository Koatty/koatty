/*
 * @Description: output data
 * @Usage: 
 * @Author: richen
 * @Date: 2024-01-03 22:03:34
 * @LastEditTime: 2024-01-03 22:07:20
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { formatApiData } from "../util/Helper";
import { ApiInput, ApiOutput } from "./Components";

export class Output {
  /**
   * Response to normalize json format content for success
   *
   * @param {KoattyContext} ctx  
   * @param {(string | ApiInput)} msg   待处理的message消息
   * @param {*} [data]    待处理的数据
   * @param {number} [code=200]    错误码，默认0
   * @returns {*}
   * @memberof BaseController
   */
  public static ok(ctx: KoattyContext, msg: string | ApiInput, data?: any, code = 0) {
    const obj: ApiOutput = formatApiData(msg, data, code);
    return Promise.resolve(obj);
  }

  /**
   * Response to normalize json format content for fail
   *
   * @param {KoattyContext} ctx   
   * @param {(string | ApiInput)} msg   
   * @param {*} [data]    
   * @param {number} [code=1]    
   * @returns {*}
   * @memberof BaseController
   */
  public static fail(ctx: KoattyContext, msg: Error | string | ApiInput, data?: any, code = 1) {
    const obj: ApiOutput = formatApiData(msg, data, code);
    ctx.body = obj.data;
    ctx.throw(obj.message, obj.code, 200);
  }
}