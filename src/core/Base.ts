/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 01:25:45
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
    protected constructor(app: Koatty) {
        this.app = app;
        this.init();
    }

    /**
     * init
     */
    protected init(): void {

    }
}
