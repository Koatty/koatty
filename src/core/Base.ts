/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-15 15:42:17
 */
import { Koatty } from "../Koatty";
import { ObjectDefinitionOptions } from "../core/IContainer";

/**
 * Base class
 *
 * @export
 * @class Base
 */
export class Base {
    public app: Koatty;
    protected _options: ObjectDefinitionOptions;

    /**
     * instance of Base.
     * @param {Koatty} app
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

    }
}
