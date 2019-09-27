/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-27 10:46:58
 */
import * as helper from "think_lib";
import { Container } from './Container';
import { getModule, injectAutowired, injectValue, injectRouter, getIdentifier, injectParam } from './Injectable';
import { COMPONENT_KEY } from './Constants';
import { BaseController } from '../controller/BaseController';


export class RequestContainer extends Container {
    public constructor(app: any) {
        super(app);
        this.handlerMap = new WeakMap<any, any>();
    }

    public reg(identifier: any, target?: any, options?: any) {
        if (helper.isClass(identifier) || helper.isFunction(identifier)) {
            options = target;
            target = (identifier as any);
            identifier = getIdentifier(target);
        }
        options = {
            isAsync: false,
            initMethod: 'constructor',
            destroyMethod: 'distructor',
            scope: 'Request',
            router: "",
            params: {},
            ...options
        };
        try {
            let instance = this.handlerMap.get(target);

            if (!instance) {
                if (helper.isClass(target)) {
                    instance = target.prototype;

                    // inject options
                    helper.define(instance, 'options', options);
                    // inject autowired
                    injectAutowired(target, instance, this);
                    // inject value
                    injectValue(target, instance, this.app);
                    // inject router
                    injectRouter(target, instance);
                    // inject param
                    injectParam(target, instance);

                    this.handlerMap.set(target, target);

                } else {
                    instance = target;
                }
            }
            return instance;

        } catch (error) {
            console.error(error);
        }
    }

    /**
     * 
     * @param identifier 
     */
    public get<T>(identifier: string, type?: string): any {
        const ref = getModule(type || COMPONENT_KEY, identifier);
        let target = this.handlerMap.get(ref);
        if (!this.handlerMap.has(ref)) {
            target = this.reg(identifier, ref);
        }
        const instance = new target(this.app);
        return instance;
    }
}
