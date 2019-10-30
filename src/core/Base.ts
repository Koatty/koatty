/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-30 18:16:57
 */
// tslint:disable-next-line: no-implicit-dependencies
import { Scope } from './Constants';
import { Koatty } from '../Koatty';


/**
 * base options
 *
 * @interface BaseOptions
 */
interface BaseOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
}

/**
 * base class
 *
 * @export
 * @class Base
 */
export class Base {
    public app: Koatty;
    protected _options: BaseOptions;

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
