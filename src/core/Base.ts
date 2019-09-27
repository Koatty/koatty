/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-27 20:08:23
 */

export class Base {
    public app: any;
    public constructor(app: any) {
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
    protected init() {

    }
}