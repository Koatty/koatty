/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-30 15:19:16
 */
import * as helper from "think_lib";
import { Container, recursiveGetMetadata } from './Container';
import { ObjectDefinitionOptions } from './IContainer';
import { getIdentifier, getModule } from './Decorators';
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
            scope: 'Singleton', ...options
        };

        let instance = this.handlerMap.get(target);

        if (!this.handlerMap.has(target)) {
            const metaDatas = recursiveGetMetadata(TAGGED_PROP, target);
            instance = new target(this.app, this.ctx);
            // inject options
            helper.define(instance, 'options', options);

            // inject properties
            for (const metaData of metaDatas) {
                // tslint:disable-next-line: forin
                for (const metaKey in metaData) {
                    console.log(`=> register inject properties key = ${metaKey}`);
                    console.log(`=> register inject properties value = ${COMPONENT_KEY}:${metaData[metaKey]}`);
                    const ref = getModule(COMPONENT_KEY, metaData[metaKey]);
                    let dep = this.handlerMap.get(ref);
                    if (!this.handlerMap.has(ref)) {
                        dep = this.reg(ref);
                    }

                    helper.define(instance, metaKey, dep);
                    // Object.defineProperty(instance, metaKey, {
                    //     enumerable: true,
                    //     writable: false,
                    //     configurable: false,
                    //     value: dep
                    // });
                }
            }
            this.handlerMap.set(target, instance);
        }

        return instance;
    }
}
