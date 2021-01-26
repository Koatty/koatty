/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-07-06 11:19:30
 */
import * as helper from "koatty_lib";
import { DefaultLogger as logger } from "koatty_logger";
import { Container, getMethodNames, IOCContainer, TAGGED_CLS } from "koatty_container";
import { TAGGED_AOP } from "./Constants";
import { Koatty } from "../Koatty";

/**
 * defined AOP type
 *
 * @export
 * @enum {number}
 */
enum AOPType {
    "Before" = "Before",
    "After" = "After"
}

/**
 * Aspect interface
 *
 * @export
 * @interface IAspect
 */
export interface IAspect {
    app: Koatty;

    run: (...args: any[]) => Promise<any>;
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
 * Executed before specifying the PointCut method.
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
                await executeAspect(aopName, props);
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            },
        };
        return descriptor;
    };
}

/**
 * Executed after execution of each method of the specified PointCut class.
 *
 * @export
 * @param {string} [aopName]
 * @returns {Function}
 */
export function BeforeEach(aopName?: string | Function): ClassDecorator {
    return (target: any) => {
        IOCContainer.saveClassMetadata(TAGGED_CLS, TAGGED_AOP, {
            type: AOPType.Before,
            name: aopName
        }, target);
    };
}

/**
 * Executed after specifying the PointCut method.
 *
 * @export
 * @param {(string | Function)} aopName
 * @returns {MethodDecorator}
 */
export function After(aopName: string | Function): MethodDecorator {
    return (target: any, methodName: symbol | string, descriptor: PropertyDescriptor) => {
        if (!aopName) {
            throw Error("AopName is required.");
        }
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            async value(...props: any[]) {
                // tslint:disable-next-line: no-invalid-this
                const res = await value.apply(this, props);
                await executeAspect(aopName, props);
                return res;
            }
        };
        return descriptor;
    };
}

/**
 * Executed after execution of each method of the specified PointCut class.
 *
 * @export
 * @param {string} aopName
 * @returns {Function}
 */
export function AfterEach(aopName?: string | Function): ClassDecorator {
    return (target: any) => {
        IOCContainer.saveClassMetadata(TAGGED_CLS, TAGGED_AOP, {
            type: AOPType.After,
            name: aopName
        }, target);
    };
}

/**
 * Execute aspect
 *
 * @param {(string | Function)} aopName
 * @param {any[]} props
 * @returns {*}  
 */
async function executeAspect(aopName: string | Function, props: any[]) {
    // tslint:disable-next-line: one-variable-per-declaration
    let aspect, name = "";
    if (helper.isClass(aopName)) {
        // tslint:disable-next-line: no-invalid-this
        aspect = IOCContainer.getInsByClass(aopName);
        name = IOCContainer.getIdentifier(<Function>aopName) || (<Function>aopName).name || "";
    } else {
        // tslint:disable-next-line: no-invalid-this
        aspect = IOCContainer.get(<string>aopName, "COMPONENT");
        name = <string>aopName;
    }
    if (aspect && helper.isFunction(aspect.run)) {
        logger.Info(`Execute the aspect ${name}`);
        // tslint:disable-next-line: no-invalid-this
        await aspect.run(props);
    }
    return Promise.resolve();
}

/**
 * inject AOP
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectAOP(target: any, instance: any, container: Container) {
    // If the class has defined the default AOP method, @BeforeEach and @AfterEach will not take effect
    const flag = hasDefaultAOP(target);
    if (flag) {
        // inject default AOP method
        injectDefaultAOP(target, instance, container);
    } else {
        const classMetaData = IOCContainer.getClassMetadata(TAGGED_CLS, TAGGED_AOP, target);
        if (classMetaData) {
            const { type, name } = classMetaData;
            if (type && name) {
                const methods = getMethodNames(target, true).filter((m: string) =>
                    !["constructor", "init", "__before", "__after"].includes(m)
                );
                methods.forEach((element) => {
                    // tslint:disable-next-line: no-unused-expression
                    process.env.APP_DEBUG && logger.Custom("think", "", `Register inject AOP ${target.name} method: ${element} => ${type}`);
                    defineAOPProperty(target, element, name, type);
                });
            }
        }
    }
}

/**
 * Determine whether the class contains the default AOP method
 *
 * @param {*} target
 * @returns {*}  {boolean}
 */
function hasDefaultAOP(target: any): boolean {
    const allMethods = getMethodNames(target).filter((m: string) =>
        !["constructor", "init"].includes(m)
    );
    // class contains the default AOP method
    if (allMethods.includes("__before") || allMethods.includes("__after")) {
        return true;
    }
    return false;
}

/**
 * inject default AOP
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 * @returns {*}
 */
function injectDefaultAOP(target: any, instance: any, container: Container) {
    // class methods
    const methods = getMethodNames(target, true).filter((m: string) =>
        !["constructor", "init", "__before", "__after"].includes(m)
    );
    // tslint:disable-next-line: no-unused-expression
    process.env.APP_DEBUG && logger.Warn(`The ${target.name} class has a default AOP method, @BeforeEach and @AfterEach maybe not take effect`);
    methods.forEach((element) => {
        if (helper.isFunction(instance.__before)) {
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.Custom("think", "", `Register inject default AOP ${target.name} method: ${element} => __before`);
            defineAOPProperty(target, element, "__before", AOPType.Before);
        }
        if (helper.isFunction(instance.__after)) {
            // tslint:disable-next-line: no-unused-expression
            process.env.APP_DEBUG && logger.Custom("think", "", `Register inject default AOP ${target.name} method: ${element} => __after`);
            defineAOPProperty(target, element, "__after", AOPType.After);
        }
    });
}

/**
 * Dynamically add methods for target class types
 *
 * @param {Function} classes
 * @param {string} protoName
 * @param {(string | Function)} aopName
 */
function defineAOPProperty(classes: Function, protoName: string, aopName: string | Function, type: AOPType) {
    const oldMethod = Reflect.get(classes.prototype, protoName);
    if (!oldMethod) {
        throw Error(`${protoName} method does not exist.`);
    }
    Reflect.defineProperty(classes.prototype, protoName, {
        writable: true,
        async value(...props: any[]) {
            if (type === AOPType.Before) {
                if (aopName) {
                    if (aopName === "__before") {
                        logger.Info(`Execute the aspect ${classes.name}.__before`);
                        // tslint:disable-next-line: no-invalid-this
                        await Reflect.apply(this.__before, this, props);
                    } else {
                        await executeAspect(aopName, props);
                    }
                }
                // tslint:disable-next-line: no-invalid-this
                return Reflect.apply(oldMethod, this, props);
            } else {
                // tslint:disable-next-line: no-invalid-this
                const res = await Reflect.apply(oldMethod, this, props);
                if (aopName) {
                    if (aopName === "__after") {
                        logger.Info(`Execute the aspect ${classes.name}.__after`);
                        // tslint:disable-next-line: no-invalid-this
                        await Reflect.apply(this.__after, this, props);
                    } else {
                        await executeAspect(aopName, props);
                    }
                }
                return res;
            }
        }
    });
}


