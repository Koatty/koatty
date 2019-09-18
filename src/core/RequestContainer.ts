/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-18 14:15:24
 */
import * as helper from "think_lib";
import { Container } from './Container';
import { ObjectDefinitionOptions } from './IContainer';
import { getIdentifier, getModule, recursiveGetMetadata, injectAutowired, injectValue } from './Injectable';
import { TAGGED_PROP, COMPONENT_KEY } from './Constants';


export class RequestContainer extends Container {
    public ctx: any;
    public constructor(app: any, ctx: any) {
        super(app);
        this.ctx = ctx;
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
            scope: 'Request', ...options
        };
        try {
            let instance = this.handlerMap.get(target);

            if (!this.handlerMap.has(target)) {
                instance = new target(this.app, this.ctx);
                // inject options
                helper.define(instance, 'options', options);
                // inject autowired
                injectAutowired(target, instance, this);
                // inject value
                injectValue(target, instance, this);

                this.handlerMap.set(target, instance);
            }

            return instance;
        } catch (error) {
            console.error(error);
        }
    }
}
