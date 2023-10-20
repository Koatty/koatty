/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:24:49
 */
import { Koatty } from 'koatty_core';
import { IService } from './Component';

/**
 * Base class
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
  protected init(...arg: any[]): void {

  }

}
