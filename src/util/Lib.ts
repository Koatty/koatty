/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 10:41:30
 */

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