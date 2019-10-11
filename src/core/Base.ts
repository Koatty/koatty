/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-11 09:45:45
 */

export interface BaseInterface {
    init(...args: any[]): any;
}

export class Base implements BaseInterface {
    public app: any;
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