/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-30 18:16:57
 */
// tslint:disable-next-line: no-implicit-dependencies
import { Scope } from './Constants';
import { BaseApp } from '../Koatty';

export interface BaseOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
}

export class Base {
    public app: BaseApp;
    protected _options: BaseOptions;

    protected constructor(app: BaseApp) {
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