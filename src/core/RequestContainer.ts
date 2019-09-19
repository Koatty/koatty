/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-19 09:41:51
 */
import * as helper from "think_lib";
import { Container } from './Container';
import { getModule } from './Injectable';
import { COMPONENT_KEY } from './Constants';


export class RequestContainer extends Container {
    public ctx: any;
    public constructor(app: any) {
        super(app);
        this.handlerMap = new WeakMap<any, any>();
    }

    public reg(identifier: any, target?: any, options?: any) {
        options = {
            isAsync: false,
            initMethod: 'constructor',
            destroyMethod: 'distructor',
            scope: 'Request', ...options
        };
        return super.reg(identifier, target, options);
    }

    public updateContext(ctx: any) {
        this.ctx = ctx;
    }

    /**
     * 
     * @param identifier 
     */
    public get<T>(identifier: string, type?: string): T {
        const ref = getModule(type || COMPONENT_KEY, identifier);
        let dep = this.handlerMap.get(ref);
        if (!this.handlerMap.has(ref)) {
            dep = this.reg(ref);
        }
        dep.ctx = this.ctx;
        return dep;
    }
}
