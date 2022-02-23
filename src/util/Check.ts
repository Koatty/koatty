/*
* @Description: 
* @Usage: 
* @Author: richen
* @Date: 2021-12-17 11:54:06
 * @LastEditTime: 2022-02-23 16:12:34
*/
import { Helper } from "koatty_lib";
import { Logger } from "./Logger";
import { version, engines } from "../../package.json";

export const KOATTY_VERSION = version;
export const ENGINES_VERSION = engines.node.slice(1) || '12.0.0';

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
        Logger.Error(`Koatty need node version > ${nodeEngines}, current version is ${nodeVersion}, please upgrade it.`);
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
    // UT运行环境判断，暂时先只判断jest
    const argv = JSON.stringify(process.argv[1]);
    if (argv.indexOf('jest') > -1) {
        isUTRuntime = true;
    }
    return isUTRuntime;
};