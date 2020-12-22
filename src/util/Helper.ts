/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-10 11:49:15
 */
import { randomFillSync } from "crypto";
import * as koatty_lib from "koatty_lib";
import { IOCContainer } from 'koatty_container';
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;
// export Helper
export const Helper = koatty_lib;

const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
const regex = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).substr(1));
}

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
    return (ex && (typeof ex === "object") && "default" in ex) ? ex.default : ex;
}

/**
 *
 *
 * @export
 * @param {string} name
 * @param {string} [controllerSuffix=""]
 * @returns
 */
let controllerReg: any = null;
export function ControllerMatch(name: string, controllerSuffix = "") {
    if (!controllerReg) {
        const controllerSuffix = "";
        controllerReg = new RegExp(`([a-zA-Z0-9_]+)${controllerSuffix}`);
    }

    const result = name.split(".")[0].match(controllerReg);
    return result;
}


/**
 * get parameter name from function
 * @param func
 */
export function getParamNames(func: { toString: () => { replace: (arg0: RegExp, arg1: string) => any } }) {
    const fnStr = func.toString().replace(STRIP_COMMENTS, "");
    let result = fnStr.slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")")).match(ARGUMENT_NAMES);
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
    if (typeof obj !== "function" || obj === functionPrototype) {
        return proto;
    }

    // TypeScript doesn't set __proto__ in ES5, as it's non-standard.
    // Try to determine the superclass constructor. Compatible implementations
    // must either set __proto__ on a subclass constructor to the superclass constructor,
    // or ensure each class has a valid `constructor` property on its prototype that
    // points back to the constructor.

    // If this is not the same as Function.[[Prototype]], then this is definitely inherited.
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
    if (typeof constructor !== "function") {
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
 * @param metadataKey metadata key
 * @param target the target of metadataKey
 */
export function RecursiveGetMetadata(metadataKey: any, target: any, propertyKey?: string | symbol): any[] {
    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    const metadata = IOCContainer.listPropertyData(metadataKey, target) || {};

    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        const pMetadata = IOCContainer.listPropertyData(metadataKey, parent);
        if (pMetadata) {
            for (const n in pMetadata) {
                if (!metadata.hasOwnProperty(n)) {
                    metadata[n] = pMetadata[n];
                }
            }
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return metadata;
}


/**
 * Find all methods on a given ES6 class
 *
 * @param {*} target 
 * @param {boolean} isSelfProperties 
 * @returns {string[]}
 */
export function getMethodNames(target: any, isSelfProperties = false): string[] {
    const result: any[] = [];
    const enumerableOwnKeys: any[] = Object.getOwnPropertyNames(target.prototype);
    if (!isSelfProperties) {
        // searching prototype chain for methods
        let parent = ordinaryGetPrototypeOf(target);
        while (Helper.isClass(parent) && parent.constructor) {
            const allOwnKeysOnPrototype: any[] = Object.getOwnPropertyNames(parent.prototype);
            // get methods from es6 class
            allOwnKeysOnPrototype.forEach((k) => {
                if (!result.includes(k) && Helper.isFunction(parent.prototype[k])) {
                    result.push(k);
                }
            });
            parent = ordinaryGetPrototypeOf(parent);
        }
    }

    // leave out those methods on Object's prototype
    enumerableOwnKeys.forEach((k) => {
        if (!result.includes(k) && Helper.isFunction(target.prototype[k])) {
            result.push(k);
        }
    });
    return result;
}

/**
 * Find all property on a given ES6 class 
 *
 * @export
 * @param {*} target
 * @param {boolean} isSelfProperties 
 * @returns {string[]}
 */
export function getPropertyNames(target: any, isSelfProperties = false): string[] {
    const result: any[] = [];
    const enumerableOwnKeys: any[] = Object.getOwnPropertyNames(target);
    if (!isSelfProperties) {
        // searching prototype chain for methods
        let parent = ordinaryGetPrototypeOf(target);
        while (Helper.isClass(parent) && parent.constructor) {
            const allOwnKeysOnPrototype: any[] = Object.getOwnPropertyNames(parent);
            // get methods from es6 class
            allOwnKeysOnPrototype.forEach((k) => {
                if (!result.includes(k) && !Helper.isFunction(parent.prototype[k])) {
                    result.push(k);
                }
            });
            parent = ordinaryGetPrototypeOf(parent);
        }
    }

    // leave out those methods on Object's prototype
    enumerableOwnKeys.forEach((k) => {
        if (!result.includes(k) && !Helper.isFunction(target.prototype[k])) {
            result.push(k);
        }
    });
    return result;
}



/**
 * Generate UUID
 *
 * @export
 * @returns {*}  
 */
export function UUID() {
    if (poolPtr > (rnds8Pool.length - 16)) {
        randomFillSync(rnds8Pool);
        poolPtr = 0;
    }
    const rnds = rnds8Pool.slice(poolPtr, poolPtr += 16);
    rnds[6] = rnds[6] & 0x0F | 0x40;
    rnds[8] = rnds[8] & 0x3F | 0x80; // Copy bytes to buffer, if provided


    return stringifyUUID(rnds);
}


/**
 *
 *
 * @param {any[]} arr
 * @param {number} [offset=0]
 * @returns {*}  
 */
function stringifyUUID(arr: Uint8Array, offset = 0) {
    // Note: Be careful editing this code!  It's been tuned for performance
    // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
    const uuid = (
        byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] + '-' +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] + '-' +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] + '-' +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] + '-' +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]
    ).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
    // of the following:
    // - One or more input array values don't map to a hex octet (leading to
    // "undefined" in the uuid)
    // - Invalid input values for the RFC `version` or `variant` fields

    if (!validateUUID(uuid)) {
        throw TypeError('Stringified UUID is invalid');
    }

    return uuid;
}

/**
 *
 *
 * @param {string} uuid
 * @returns {*}  
 */
function validateUUID(uuid: string) {
    return typeof uuid === 'string' && regex.test(uuid);
}
