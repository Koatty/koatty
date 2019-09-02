/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-02 15:47:04
 */

export class Base {
    public constructor(...args: any[]) {
        try {
            this.init(...args);
        } catch (e) {
            throw Error(e.stack);
        }
    }

    /**
     * init
     */
    public init(...args: any[]) {

    }
}