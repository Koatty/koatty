/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-20 19:27:02
 */
import * as helper from "think_lib";
import { COMPONENT_KEY } from './Constants';
import { IContainer, ObjectDefinitionOptions } from './IContainer';
import { getModule, getIdentifier, injectAutowired, injectValue } from './Injectable';

export class Container implements IContainer {
    public app: any;
    public handlerMap: WeakMap<any, any>;
    public constructor(app: any) {
        this.app = app;
        this.handlerMap = new WeakMap<any, any>();
    }
    public reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    public reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
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
            scope: 'Singleton',
            router: "",
            ...options
        };
        try {
            let instance = this.handlerMap.get(target);

            if (!this.handlerMap.has(target)) {
                if (helper.isClass(target)) {
                    instance = new target(this.app);
                    // inject options
                    helper.define(instance, 'options', options);
                    // inject autowired
                    injectAutowired(target, instance, this);
                    // inject value
                    injectValue(target, instance, this.app);

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

