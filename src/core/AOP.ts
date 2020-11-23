/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:19:30
 */
import { Helper } from "../util/Helper";
import { Logger } from "../util/Logger";
import { IOCContainer } from 'koatty_container';


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
        async value(...props: any[]) {
            if (oldMethod) {
                // tslint:disable-next-line: no-invalid-this
                await Promise.resolve(Reflect.apply(oldMethod, this, props));
            }
            if (methodName) {
                // tslint:disable-next-line: one-variable-per-declaration
                let aspect, name = "";
                if (Helper.isFunction(methodName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.getInsByClass(methodName);
                    name = IOCContainer.getIdentifier(<Function>methodName) || (<Function>methodName).name || "";
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.get(<string>methodName, "COMPONENT");
                    name = <string>methodName;
                }
                if (aspect && Helper.isFunction(aspect.run)) {
                    Logger.Info(`Execute the aspect ${name}`);
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
        identifier = identifier || IOCContainer.getIdentifier(target);
        if (!identifier.endsWith("Aspect")) {
            throw Error("Aspect class names must use a suffix `Aspect`.");
        }
        const oldMethod = Reflect.get(target.prototype, "run");
        if (!oldMethod) {
            throw Error("The aspect class must implement the `run` method.");
        }
        IOCContainer.saveClass("COMPONENT", target, identifier);
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
            async value(...props: any[]) {
                // tslint:disable-next-line: one-variable-per-declaration
                let aspect, name = "";
                if (Helper.isFunction(aopName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.getInsByClass(aopName);
                    name = IOCContainer.getIdentifier(<Function>aopName) || (<Function>aopName).name || "";
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.get(<string>aopName, "COMPONENT");
                    name = <string>aopName;
                }
                if (aspect && Helper.isFunction(aspect.run)) {
                    Logger.Info(`Execute the aspect ${name}`);
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
// export function BeforeEach(aopName?: string | Function): ClassDecorator {
//     return (target: any) => {
//         // only used in Controller
//         const type = IOCContainer.getType(target);
//         if (type !== "CONTROLLER") {
//             throw Error("BeforeEach decorator is only used in the controller class.");
//         }
//         if (aopName && aopName !== "__before") {
//             defineNewProperty(target, "__before", aopName);
//         }
//     };
// }

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
            async value(...props: any[]) {
                // tslint:disable-next-line: one-variable-per-declaration
                let aspect, name = "";
                if (Helper.isFunction(aopName)) {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.getInsByClass(aopName);
                    name = IOCContainer.getIdentifier(<Function>aopName) || (<Function>aopName).name || "";
                } else {
                    // tslint:disable-next-line: no-invalid-this
                    aspect = IOCContainer.get(<string>aopName, "COMPONENT");
                    name = <string>aopName;
                }
                if (aspect && Helper.isFunction(aspect.run)) {
                    Logger.Info(`Execute the aspect ${name}`);
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
// export function AfterEach(aopName?: string | Function): ClassDecorator {
//     return (target: any) => {
//         // only used in Controller
//         const type = IOCContainer.getType(target);
//         if (type !== "CONTROLLER") {
//             throw Error("AfterEach decorator is only used in the controller class.");
//         }
//         if (aopName && aopName !== "__after") {
//             defineNewProperty(target, "__after", aopName);
//         }
//     };
// }