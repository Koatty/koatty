/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:24:49
 */
import { Koatty } from 'koatty_core';
import { ObjectDefinitionOptions } from "koatty_container";
import { IService } from '../core/Component';
import { Logger } from "../util/Logger";

/**
 * Base class
 *
 * @export
 * @class Base
 */
export class BaseService implements IService {
    public app: Koatty;
    protected _options: ObjectDefinitionOptions;

    /**
     * instance of Base.
     * @param {...any[]} arg
     * @memberof Base
     */
    protected constructor(...arg: any[]) {
        this.init(arg);
    }

    /**
     * init
     *
     * @protected
     * @param {...any[]} arg
     * @memberof Base
     */
    protected init(...arg: any[]): void {
        // todo
        Logger.Debug(arg)
    }

}
