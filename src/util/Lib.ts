/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 19:09:20
 */
import { listPropertyData } from '../core/Injectable';
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 *
 *
 * @export
 * @param {string} p
 * @returns
 */
export function requireDefault(p: string) {
    /* eslint-disable global-require */
    const ex = require(p);
    return (ex && (typeof ex === 'object') && 'default' in ex) ? ex.default : ex;
}

/**
 *
 *
 * @export
 * @param {string} name
 * @param {string} [controllerSuffix='']
 * @returns
 */
let controllerReg: any = null;
export function ControllerMatch(name: string, controllerSuffix = '') {
    if (!controllerReg) {
        const controllerSuffix = '';
        controllerReg = new RegExp(`([a-zA-Z0-9_]+)${controllerSuffix}`);
    }

    const result = name.split('.')[0].match(controllerReg);
    return result;
}


/**
 * get parameter name from function
 * @param func
 */
export function getParamNames(func: { toString: () => { replace: (arg0: RegExp, arg1: string) => any } }) {
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null) {
        result = [];
    }
    return result;
}


const functionPrototype = Object.getPrototypeOf(Function);
// get property of an object
// https://tc39.github.io/ecma262/#sec-ordinarygetprototypeof
function ordinaryGetPrototypeOf(obj: any): any {
    const proto = Object.getPrototypeOf(obj);
    if (typeof obj !== 'function' || obj === functionPrototype) {
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
    const prototype = obj.prototype;
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
    if (constructor === obj) {
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
    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    const metadata = listPropertyData(metadataKey, target) || {};

    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        const pmetadata = listPropertyData(metadataKey, parent);
        if (pmetadata) {
            for (const n in pmetadata) {
                if (!metadata.hasOwnProperty(n)) {
                    metadata[n] = pmetadata[n];
                }
            }
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return metadata;
}

/**
 * Find all methods on a given object
 *
 * @param {*} target - object to enumerate on
 * @returns {string[]} - method names
 */
export function getMethodNames(target: any): string[] {
    const result: any[] = [];
    const enumerableOwnKeys: any[] = Object.getOwnPropertyNames(new target());
    // searching prototype chain for methods
    let parent = ordinaryGetPrototypeOf(target);
    while (parent && parent.constructor) {
        const allOwnKeysOnPrototype: any[] = Object.getOwnPropertyNames(new parent());
        // get methods from es6 class
        allOwnKeysOnPrototype.forEach((k) => {
            if (!result.includes(k)) {
                result.push(k);
            }
        });
        parent = ordinaryGetPrototypeOf(parent);
    }

    // leave out those methods on Object's prototype
    enumerableOwnKeys.map((k) => {
        if (!result.includes(k)) {
            result.push(k);
        }
    });
    return result;
}

/**
 * Find all property on a given object
 *
 * @export
 * @param {*} target
 * @returns {string[]}
 */
export function getPropertyNames(target: any): string[] {
    const result: any[] = [];
    const enumerableOwnKeys: any[] = Object.getOwnPropertyNames(target);
    // searching prototype chain for methods
    let parent = ordinaryGetPrototypeOf(target);
    while (parent) {
        const allOwnKeysOnPrototype: any[] = Object.getOwnPropertyNames(parent);
        // get methods from es6 class
        allOwnKeysOnPrototype.forEach((k) => {
            if (!result.includes(k)) {
                result.push(k);
            }
        });
        parent = ordinaryGetPrototypeOf(parent);
    }

    // leave out those methods on Object's prototype
    enumerableOwnKeys.map((k) => {
        if (!result.includes(k)) {
            result.push(k);
        }
    });
    return result;
}