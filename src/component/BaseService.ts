/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-08 15:25:22
 * @LastEditTime: 2023-11-10 09:16:35
 */
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:24:49
 */
import { Koatty } from 'koatty_core';
import { IService } from './Components';

/**
 * Base service
 *
 * @export
 * @class Base
 */
export class BaseService implements IService {
  readonly app: Koatty;

  /**
   * instance of BaseController.
   * @param {Koatty} app
   * @param {KoattyContext} ctx
   * @memberof BaseController
   */
  protected constructor(...arg: any[]) {
    this.init(arg);
  }

  /**
   * init
   *
   * @protected
   * @memberof BaseController
   */
  init(...arg: any[]): void {

  }

}
