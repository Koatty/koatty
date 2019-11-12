/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-12 21:25:13
 */
import { Koatty } from '../Koatty';
import { ObjectDefinitionOptions } from '../core/IContainer';

/**
 * base class
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
    protected constructor(app: Koatty) {
        this.app = app;
    }

    /**
     * init
     */
    protected init(): void {

    }
}
