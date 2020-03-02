/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-02 14:08:39
 */
import * as helper from "think_lib";
import { saveModule, getIdentifier } from "./Injectable";
import { COMPONENT_KEY } from "./Constants";


/**
 * Dynamically add methods for target class types
 *
 * @param {Function} clazz
 * @param {string} protoName
 * @param {(string | Function)} methodName
 */
function defineNewProperty(clazz: Function, protoName: string, methodName: string | Function) {
    const oldMethod = Reflect.get(clazz.prototype, protoName);
    Reflect.defineProperty(clazz.prototype, protoName, {
        writable: true,
        value: async function fn(...props: any[]) {
            if (oldMethod) {
                // tslint:disable-next-line: no-invalid-this
                await Promise.resolve(Reflect.apply(oldMethod, this, props));
            }
            if (methodName) {
                let aspect;
                if (helper.isFunction(methodName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.getClsByClass(methodName);
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.get(methodName, "COMPONENT");
                }
                if (aspect && helper.isFunction(aspect.run)) {
                    // tslint:disable-next-line: no-invalid-this
                    await Promise.resolve(Reflect.apply(aspect.run, this, props));
                }
            }

            return Promise.resolve();
        }
    });
}

/**
 * Indicates that an decorated class is a "aspect".
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
 * Executed before specifying the pointcut method.
 *
 * @export
 * @param {(string | Function)} aopName
 * @returns {MethodDecorator}
 */
export function Before(aopName: string | Function): MethodDecorator {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function before(...props: any[]) {
                let aspect;
                if (helper.isFunction(aopName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.getClsByClass(aopName);
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.get(aopName, "COMPONENT");
                }
                if (aspect && helper.isFunction(aspect.run)) {
                    // tslint:disable-next-line: no-invalid-this
                    await Promise.resolve(Reflect.apply(aspect.run, this, props));
                }
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };
}

/**
 * Executed after execution of each method of the specified pointcut class.
 *
 * @export
 * @param {string} [aopName]
 * @returns {Function}
 */
export function BeforeEach(aopName = "__before"): ClassDecorator {
    return (target: any) => {
        return defineNewProperty(target, "__before", aopName === "__before" ? "" : aopName);
    };
}

/**
 * Executed after specifying the pointcut method.
 *
 * @export
 * @param {(string | Function)} aopName
 * @returns {MethodDecorator}
 */
export function After(aopName: string | Function): MethodDecorator {
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
                let aspect;
                if (helper.isFunction(aopName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.getClsByClass(aopName);
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = this.app.Container.get(aopName, "COMPONENT");
                }
                if (aspect && helper.isFunction(aspect.run)) {
                    // tslint:disable-next-line: no-invalid-this
                    await Promise.resolve(Reflect.apply(aspect.run, this, props));
                }
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };
}

/**
 * Executed after execution of each method of the specified pointcut class.
 *
 * @export
 * @param {string} aopName
 * @returns {Function}
 */
export function AfterEach(aopName = "__after"): ClassDecorator {
    return (target: any) => {
        return defineNewProperty(target, "__after", aopName === "__after" ? "" : aopName);
    };
}