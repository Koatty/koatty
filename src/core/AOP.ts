/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 14:22:25
 */
import * as helper from 'think_lib';
import { saveModule, getIdentifier } from "./Injectable";
import { COMPONENT_KEY } from './Constants';

/**
 *
 *
 * @param {Function} clazz
 * @param {string} protoName
 * @param {string} methodName
 */
function defineNewProperty(clazz: Function, protoName: string, methodName: string) {
    const oldMethod = Reflect.get(clazz.prototype, protoName);
    Reflect.defineProperty(clazz.prototype, protoName, {
        writable: true,
        value: async function fn(...props: any[]) {
            if (oldMethod) {
                // tslint:disable-next-line: no-invalid-this
                await Promise.resolve(Reflect.apply(oldMethod, this, props));
            }
            // tslint:disable-next-line: no-invalid-this
            const target = this.app.Container.get(methodName, "COMPONENT");
            if (target && helper.isFunction(target.run)) {
                // tslint:disable-next-line: no-invalid-this
                await Promise.resolve(Reflect.apply(target.run, this, []));
            }
            return Promise.resolve();
        }
    });
}

/**
 * 
 *
 * @export
 * @param {string} [identifier]
 * @returns {ClassDecorator}
 */
export function Aspect(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || getIdentifier(target);
        if (!identifier.endsWith("Aspect")) {
            throw Error("Aspect class names must use a suffix `Aspect`.");
        }
        const oldMethod = Reflect.get(target.prototype, "run");
        if (!oldMethod) {
            throw Error("The aspect class must implement the `run` method.");
        }
        saveModule(COMPONENT_KEY, target, identifier);
    };
}

/**
 *
 *
 * @export
 * @param {string} aopName
 * @returns {MethodDecorator}
 */
export function Before(aopName: string): MethodDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function before(...props: any[]) {
                // tslint:disable-next-line: no-invalid-this
                const aspect = this.app.Container.get(aopName, "COMPONENT");
                if (aspect && helper.isFunction(aspect.run)) {
                    // tslint:disable-next-line: no-invalid-this
                    await Promise.resolve(Reflect.apply(aspect.run, this, []));
                }
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };
}

/**
 *
 *
 * @export
 * @param {string} aopName
 * @returns {Function}
 */
export function BeforeEach(aopName: string): ClassDecorator {
    return (target: any) => {
        return defineNewProperty(target, '__before', aopName);
    };
}

/**
 *
 *
 * @export
 * @param {string} aopName
 * @returns {Function}
 */
export function After(aopName: string): MethodDecorator | ClassDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        if (!aopName) {
            throw Error("AopName is required.");
        }
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function before(...props: any[]) {
                // tslint:disable-next-line: no-invalid-this
                const aspect = this.app.Container.get(aopName, "COMPONENT");
                if (aspect && helper.isFunction(aspect.run)) {
                    // tslint:disable-next-line: no-invalid-this
                    await Promise.resolve(Reflect.apply(aspect.run, this, []));
                }
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };
}

/**
 *
 *
 * @export
 * @param {string} aopName
 * @returns {Function}
 */
export function AfterEach(aopName: string): ClassDecorator {
    return (target: any) => {
        return defineNewProperty(target, '__after', aopName);
    };
}