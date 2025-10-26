/*
 * @Description: framework helper
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2025-01-14 16:14:10
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

import { Helper } from "koatty_lib";
import { engines, version } from "../../package.json";
import { Logger } from "./Logger";

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export const KOATTY_VERSION = version;
export const ENGINES_VERSION = engines.node.slice(1) || '12.0.0';

/**
 * require default export
 *
 * @export
 * @param {string} p
 * @returns
 */
export function requireDefault(p: string) {
  // Dynamic require is necessary for runtime module loading
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ex = require(p);
  return (ex && (typeof ex === "object") && "default" in ex) ? ex.default : ex;
}

/**
 * controller match
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
 * Check class file 
 * name should be always the same as class name
 * class must be unique
 *
 * @export
 * @param {string} fileName
 * @param {string} xpath
 * @param {*} target
 * @param {Set<unknown>} [exSet]
 * @returns {*}  
 */
export function checkClass(fileName: string, xpath: string, target: any, exSet?: Set<unknown>) {
  if (Helper.isClass(target) && target.name != fileName) { // export default class name{}
    throw Error(`The file(${xpath}) name should be always the same as class name.`);
  }
  if (target["__esModule"]) {
    if (target.name === undefined) { // export class name{}
      const keys = Object.keys(target);
      if (keys[0] != fileName && Helper.isClass(target[keys[0]])) {
        throw Error(`The file(${xpath}) name should be always the same as class name.`);
      }
    } else if (target.name != fileName) { // export default class {}
      throw Error(`The file(${xpath}) name should be always the same as class name.`);
    }
  }
  if (!exSet) {
    return;
  }
  if (exSet.has(fileName)) {
    throw new Error(`A same class already exists. at \`${xpath}\`.`);
  }
  exSet.add(fileName);

  return;
}

/**
 * check node version
 * @return {void} []
 */
export function checkRuntime() {
  let nodeEngines = ENGINES_VERSION;
  nodeEngines = nodeEngines.slice(0, nodeEngines.lastIndexOf('.'));
  let nodeVersion = process.version;
  if (nodeVersion[0] === 'v') {
    nodeVersion = nodeVersion.slice(1);
  }
  nodeVersion = nodeVersion.slice(0, nodeVersion.lastIndexOf('.'));

  if (Helper.toNumber(nodeEngines) > Helper.toNumber(nodeVersion)) {
    Logger.Fatal(`Koatty need node version > ${nodeEngines}, current version is ${nodeVersion}, please upgrade it.`);
    process.exit(-1);
  }
}

/**
 * unittest running environment detection
 * only support jest
 * @returns {boolean}
 */
export const checkUTRuntime = (): boolean => {
  let isUTRuntime = false;
  // UT runtime detection, only support jest
  const argv = JSON.stringify(process.argv[1]);
  if (argv.indexOf('jest') > -1) {
    isUTRuntime = true;
  }
  return isUTRuntime;
};