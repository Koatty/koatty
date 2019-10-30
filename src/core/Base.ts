/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-30 18:16:57
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
        try {
            this.app = app;
            this.init();
        } catch (e) {
            throw Error(e.stack);
        }
    }

    /**
     * init
     */
    protected init(): void {

    }
}
