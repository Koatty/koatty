/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-10 11:49:15
 */
import { randomFillSync } from "crypto";
import * as koatty_lib from "koatty_lib";
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
