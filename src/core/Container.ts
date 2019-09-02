/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-02 15:34:42
 */
import * as helper from "think_lib";
import { TAGGED_PROP, COMPONENT_KEY } from './Constants';
import { IContainer, ObjectDefinitionOptions } from './IContainer';
import { listPropertyDataFromClass, getModule, getIdentifier } from './Injectable';

export class Container implements IContainer {
    public handlerMap: WeakMap<any, any>;
    public app: any;
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
            scope: 'Singleton', ...options
        };
        try {
            let instance = this.handlerMap.get(target);

            if (!this.handlerMap.has(target)) {
                const metaDatas = recursiveGetMetadata(TAGGED_PROP, target);
                instance = new target(this.app);
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
        } catch (error) {
            console.error(error);
        }

    }

    /**
     * 
     * @param identifier 
     */
    public get<T>(identifier: string): T {
        const ref = getModule(COMPONENT_KEY, identifier);
        let dep = this.handlerMap.get(ref);
        if (!this.handlerMap.has(ref)) {
            dep = this.reg(ref);
        }
        return dep;
    }
}

const functionPrototype = Object.getPrototypeOf(Function);
// get property of an object
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function ordinaryGetPrototypeOf(O: any): any {
    const proto = Object.getPrototypeOf(O);
    if (typeof O !== 'function' || O === functionPrototype) {
        return proto;
    }

    // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
    // Try to determine the superclass constructor. Compatible implementations
    // must either set __proto__ on a subclass constructor to the superclass constructor,
    // or ensure each class has a valid `constructor` property on its prototype that
    // points back to the constructor.

    // If this is not the same as Function.[[Prototype]], then this is definately inherited.
    // This is the case when in ES6 or when using __proto__ in a compatible browser.
    if (proto !== functionPrototype) {
        return proto;
    }

    // If the super prototype is Object.prototype, null, or undefined, then we cannot determine the heritage.
    const prototype = O.prototype;
    const prototypeProto = prototype && Object.getPrototypeOf(prototype);
    // tslint:disable-next-line: triple-equals
    if (prototypeProto == undefined || prototypeProto === Object.prototype) {
        return proto;
    }

    // If the constructor was not a function, then we cannot determine the heritage.
    const constructor = prototypeProto.constructor;
    if (typeof constructor !== 'function') {
        return proto;
    }

    // If we have some kind of self-reference, then we cannot determine the heritage.
    if (constructor === O) {
        return proto;
    }

    // we have a pretty good guess at the heritage.
    return constructor;
}
/**
 * get metadata value of a metadata key on the prototype chain of an object and property
 * @param metadataKey metadata's key
 * @param target the target of metadataKey
 */
export function recursiveGetMetadata(metadataKey: any, target: any, propertyKey?: string | symbol): any[] {
    const metadatas: any[] = [];

    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    let metadata = listPropertyDataFromClass(metadataKey, target);
    if (metadata) {
        metadatas.push(...metadata);
    }

    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        metadata = listPropertyDataFromClass(metadataKey, parent);
        if (metadata) {
            metadatas.push(...metadata);
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return metadatas;
}

