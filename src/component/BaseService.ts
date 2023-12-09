/*
 * @Description: base service
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2023-12-09 23:03:23
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
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
