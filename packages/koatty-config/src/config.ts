/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2022-02-18 11:19:55
 * @LastEditTime: 2024-11-06 14:14:20
 */
import { IOCContainer, TAGGED_ARGS } from "koatty_container";
import * as Helper from "koatty_lib";
import { Load } from "koatty_loader";
const rc = require("run-con");
/**
 * LoadConfigs
 *
 * @export
 * @param {string[]} loadPath
 * @param {string} [baseDir]
 * @param {string[]} [pattern]
 * @param {string[]} [ignore]
 * @returns {*}  
 */
export function LoadConfigs(loadPath: string[], baseDir?: string, pattern?: string[], ignore?: string[]) {
  const conf: Record<string, any> = {};
  const env = process.env.KOATTY_ENV || process.env.NODE_ENV || "";

  Load(loadPath, baseDir, (name: string, path: string, exp: any) => {
    let tempConf: any = {};
    if (name.includes("_")) {
      const t = name.slice(name.lastIndexOf("_") + 1);
      if (t && env.startsWith(t)) {
        name = name.replace(`_${t}`, "");
        tempConf = rc(name, { [name]: parseEnv(exp) });
      }
    } else {
      tempConf = rc(name, { [name]: parseEnv(exp) });
    }
    conf[name] = tempConf[name];
  }, pattern, ignore);

  return conf;
}

/**
 * parse process.env to replace ${}
 *
 * @param {*} conf
 * @returns {*}  
 */
function parseEnv(conf: any) {
  if (!Helper.isObject(conf)) return conf;
  Object.keys(conf).forEach(key => {
    const element = conf[key];
    if (Helper.isObject(element)) {
      conf[key] = parseEnv(element);
    } else if (Helper.isString(element) && element.startsWith("${") && element.endsWith("}")) {
      const value = process.env[element.slice(2, -1)] || "";
      conf[key] = Helper.isTrueEmpty(value) ? "" : value;
    }
  });
  return conf;
}

/**
 * Indicates that an decorated configuration as a property.
 *
 * @export
 * @param {string} identifier configuration key
 * @param {string} [type] configuration type
 * @returns {PropertyDecorator}
 */
export function Config(key?: string, type?: string): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const propName = typeof propertyKey === 'symbol' ? propertyKey.toString() : propertyKey;
    IOCContainer.savePropertyData(TAGGED_ARGS, {
      name: propertyKey,
      method: () => {
        const app = IOCContainer.getApp();
        if (!app?.config) {
          return null;
        }
        key = key || propName;
        type = type || "config";
        return app.config(key, type);
      }
    }, target, propertyKey);
  };
}
