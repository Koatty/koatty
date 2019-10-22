/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-22 18:29:48
 */
import * as helper from "think_lib";
import { CompomentType } from './Constants';
import { IContainer, ObjectDefinitionOptions } from './IContainer';
import { getModule, getIdentifier, injectAutowired, injectValue, injectRouter, injectParam } from './Injectable';
import { BaseController } from '../controller/BaseController';

export class Container implements IContainer {
    public app: any;
    public handlerMap: WeakMap<any, any>;
    public constructor(app: any) {
        this.app = app;
        this.handlerMap = new WeakMap<any, any>();
    }
    public reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    public reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    public reg(identifier: any, target?: any, options?: ObjectDefinitionOptions) {
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
            args: [],
            ...options
        };

        let instance = this.handlerMap.get(target);

        if (!this.handlerMap.has(target)) {
            if (helper.isClass(target)) {
                instance = target.prototype;
                // inject options
                helper.define(instance, '_options', options);
                // inject autowired
                injectAutowired(target, instance, this);
                // inject value
                injectValue(target, instance, this.app);

                //Controller instance
                if (Reflect.getPrototypeOf(target) === BaseController) {
                    // inject router
                    injectRouter(target, instance);
                    // inject param
                    injectParam(target, instance);
                }
                instance = Reflect.construct(target, options.args && options.args.length ? options.args : [this.app]);
                this.handlerMap.set(target, instance);
            } else {
                instance = target;
            }
        }
        return instance;
    }

    /**
     * 
     * @param identifier 
     */
    public get<T>(identifier: string, type: CompomentType = 'SERVICE', args?: any[]): T {
        const ref = getModule(type, identifier);
        // 
        let target;
        if (args && args.length > 0) {
            // target = this.reg(identifier, ref, {
            //     isAsync: false,
            //     initMethod: 'constructor',
            //     destroyMethod: 'distructor',
            //     scope: 'Request',
            //     router: "",
            //     args
            // });
            return Reflect.construct(ref, args);
        }

        target = this.handlerMap.get(ref);
        if (!target) {
            target = this.reg(identifier, ref);
        }
        if (target._options && target._options.scope === 'Singleton') {
            return target;
        }
        // if (type === 'COMPONENT') {
        //     args = [];
        // } else {
        args = target._options && target._options.args && target._options.args.length ? target._options.args : [this.app];
        // }
        const instance = Reflect.construct(ref, args);
        return instance;
    }
}

