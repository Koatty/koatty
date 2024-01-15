/*
 * @Description: output data
 * @Usage: 
 * @Author: richen
 * @Date: 2024-01-03 22:03:34
 * @LastEditTime: 2024-01-16 01:20:36
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { KoattyContext } from "koatty_core";
import { Helper } from "koatty_lib";

/**
 * Interface for Api output
 */
interface ApiOutput {
  code: number; // 错误码
  message: string; // 消息内容
  data: any; // 数据
}

/**
 * Interface for Api input
 */
interface ApiInput {
  code?: number; // 错误码
  message?: string; // 消息内容
  data?: any; // 数据
}


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
function formatApiData(msg: any, data: any, defaultCode: number): ApiOutput {
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