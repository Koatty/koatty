/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-16 17:13:07
 */
import { Scope } from './Constants';

export interface BaseInterface {
    init(...args: any[]): any;
}

export interface BaseOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
}

export class Base implements BaseInterface {
    public app: any;
    protected _options: BaseOptions;

    protected constructor(app: any) {
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
    public init() {

    }
}