/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-24 20:25:53
 */
import * as helper from "think_lib";
import { Container } from './Container';
import { getModule, injectAutowired, injectValue, injectRouter, getIdentifier } from './Injectable';
import { COMPONENT_KEY } from './Constants';


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
            ...options
        };
        try {
            let instance = this.handlerMap.get(target);

            if (!instance) {
                if (helper.isClass(target)) {
                    instance = new target(this.app);
                    // inject options
                    helper.define(instance, 'options', options);
                    // inject autowired
                    injectAutowired(target, instance, this);
                    // inject value
                    injectValue(target, instance, this.app);
                    // inject router
                    injectRouter(target, instance);

                    this.handlerMap.set(target, instance);
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
    public get<T>(identifier: string, type?: string): T {
        const ref = getModule(type || COMPONENT_KEY, identifier);
        let dep = this.handlerMap.get(ref);
        if (!this.handlerMap.has(ref)) {
            dep = this.reg(identifier, ref);
        }
        return dep;
    }
}
