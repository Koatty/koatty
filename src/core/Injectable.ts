/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-26 10:23:51
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { scheduleJob } from "node-schedule";
import { TAGGED_CLS, TAGGED_PROP, TAGGED_ARGS, NAMED_TAG, ROUTER_KEY, PARAM_KEY, PARAM_RULE_KEY, SCHEDULE_KEY } from "./Constants";
import { Container } from './Container';

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export class Injectable {

    /**
     *
     *
     * @static
     * @param {(string | symbol)} metadataKey
     * @param {any} target
     * @param {(string | symbol)} [propertyKey]
     * @returns
     * @memberof Injectable
     */
    public static getOriginMetadata(metadataKey: string | symbol, target: any, propertyKey?: string | symbol) {
        // filter Object.create(null)
        if (typeof target === 'object' && target.constructor) {
            target = target.constructor;
        }
        if (propertyKey) {
            // for property or method
            if (!Reflect.hasMetadata(metadataKey, target, propertyKey)) {
                Reflect.defineMetadata(metadataKey, new Map(), target, propertyKey);
            }
            return Reflect.getMetadata(metadataKey, target, propertyKey);
        } else {
            // for class
            if (!Reflect.hasMetadata(metadataKey, target)) {
                Reflect.defineMetadata(metadataKey, new Map(), target);
            }
            return Reflect.getMetadata(metadataKey, target);
        }
    }

    /**
     *
     *
     * @static
     * @param {(string | symbol)} metadataKey
     * @param {*} target
     * @param {(string | symbol)} [propertyKey]
     * @returns
     * @memberof Injectable
     */
    public getMetadataMap(metadataKey: string | symbol, target: any, propertyKey?: string | symbol) {
        // filter Object.create(null)
        if (typeof target === 'object' && target.constructor) {
            target = target.constructor;
        }
        if (!this.metadataMap.has(target)) {
            this.metadataMap.set(target, new Map());
        }
        if (propertyKey) {
            // for property or method
            const key = `${helper.toString(metadataKey)}:${helper.toString(propertyKey)}`;
            const map = this.metadataMap.get(target);
            if (!map.has(key)) {
                map.set(key, new Map());
            }
            return map.get(key);
        } else {
            // for class
            const map = this.metadataMap.get(target);
            if (!map.has(metadataKey)) {
                map.set(metadataKey, new Map());
            }
            return map.get(metadataKey);
        }
    }

    private handlerMap: Map<any, any>;
    private metadataMap: WeakMap<any, any>;

    /**
     * Creates an instance of Injectable.
     * @memberof Injectable
     */
    public constructor() {
        this.handlerMap = new Map();
        this.metadataMap = new WeakMap();
    }

    /**
     *
     *
     * @returns
     * @memberof Injectable
     */
    public clear() {
        return this.handlerMap.clear();
    }

    /**
     *
     *
     * @param {*} target
     * @returns
     * @memberof Injectable
     */
    public getIdentifier(target: any) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.id;
        } else {
            // return helper.camelCase(target.name, { pascalCase: true });
            return target.name;
        }
    }

    /**
     *
     *
     * @param {string} key
     * @param {*} module
     * @param {string} identifier
     * @memberof Injectable
     */
    public saveModule(key: string, module: any, identifier: string) {
        Reflect.defineMetadata(TAGGED_CLS, { id: identifier }, module);
        if (!this.handlerMap.has(module)) {
            this.handlerMap.set(`${key}:${identifier}`, module);
        }
    }

    /**
     *
     *
     * @param {string} key
     * @returns
     * @memberof Injectable
     */
    public listModule(key: string) {
        const modules: any[] = [];
        this.handlerMap.forEach((v, k) => {
            if (k.startsWith(key)) {
                modules.push({
                    id: k,
                    target: v
                });
            }
        });
        return modules;
    }

    /**
     *
     *
     * @param {string} key
     * @param {string} identifier
     * @returns
     * @memberof Injectable
     */
    public getModule(key: string, identifier: string) {
        return this.handlerMap.get(`${key}:${identifier}`);
    }

    /**
     * save meta data to class or property
     *
     * @param {string} type
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {*} target
     * @param {undefined} [propertyName]
     * @memberof Injectable
     */
    public saveClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = this.getMetadataMap(type, target, propertyName);
            originMap.set(decoratorNameKey, data);
        } else {
            const originMap = this.getMetadataMap(type, target);
            originMap.set(decoratorNameKey, data);
        }
    }

    /**
     * attach data to class or property
     *
     * @param {string} type
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {*} target
     * @param {string} [propertyName]
     * @memberof Injectable
     */
    public attachClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: any, propertyName?: string) {
        let originMap;
        if (propertyName) {
            originMap = this.getMetadataMap(type, target, propertyName);
        } else {
            originMap = this.getMetadataMap(type, target);
        }
        if (!originMap.has(decoratorNameKey)) {
            originMap.set(decoratorNameKey, []);
        }
        originMap.get(decoratorNameKey).push(data);
    }

    /**
     * get single data from class or property
     *
     * @param {string} type
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} target
     * @param {undefined} [propertyName]
     * @returns
     * @memberof Injectable
     */
    public getClassMetadata(type: string, decoratorNameKey: string | symbol, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = this.getMetadataMap(type, target, propertyName);
            return originMap.get(decoratorNameKey);
        } else {
            const originMap = this.getMetadataMap(type, target);
            return originMap.get(decoratorNameKey);
        }
    }

    /**
     * save property data to class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {*} target
     * @param {(string | symbol)} propertyName
     * @memberof Injectable
     */
    public savePropertyData(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        originMap.set(propertyName, data);
    }

    /**
     * attach property data to class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {*} target
     * @param {(string | symbol)} propertyName
     * @memberof Injectable
     */
    public attachPropertyData(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        if (!originMap.has(propertyName)) {
            originMap.set(propertyName, []);
        }
        // const map: any[] = originMap.get(propertyName);
        // let flag = true;
        // if (map.length > 0) {
        //     for (const n of map) {
        //         if (JSON.stringify(n) === JSON.stringify(data)) {
        //             flag = false;
        //         }
        //     }
        // }
        // if (flag) {
        originMap.get(propertyName).push(data);
        // }
    }

    /**
     *  get property data from class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} target
     * @param {(string | symbol)} propertyName
     * @returns
     * @memberof Injectable
     */
    public getPropertyData(decoratorNameKey: string | symbol, target: any, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        return originMap.get(propertyName);
    }

    /**
     * list property data from class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} target
     * @returns
     * @memberof Injectable
     */
    public listPropertyData(decoratorNameKey: string | symbol, target: any) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        const datas: any = {};
        for (const [key, value] of originMap) {
            datas[key] = value;
        }
        return datas;
    }
}


const manager = new Injectable();

/**
 * save data to class
 * @param type
 * @param decoratorNameKey
 * @param data
 * @param target
 */
export function saveClassMetadata(type: string, decoratorNameKey: string, data: any, target: any) {
    return manager.saveClassMetadata(type, decoratorNameKey, data, target);
}

/**
 * get data from class
 * @param type
 * @param decoratorNameKey
 * @param target
 */
export function getClassMetadata(type: string, decoratorNameKey: string, target: any) {
    return manager.getClassMetadata(type, decoratorNameKey, target);
}

/**
 * attach data from class
 *
 * @export
 * @param {string} type
 * @param {string} decoratorNameKey
 * @param {*} data
 * @param {*} target
 * @param {string} [propertyName]
 * @returns
 */
export function attachClassMetadata(type: string, decoratorNameKey: string, data: any, target: any, propertyName?: string) {
    return manager.attachClassMetadata(type, decoratorNameKey, data, target, propertyName);
}

/**
 * save property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyData(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.savePropertyData(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyData(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.attachPropertyData(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data from class
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyData(decoratorNameKey: string, target: any, propertyName: any) {
    return manager.getPropertyData(decoratorNameKey, target, propertyName);
}

/**
 * list property data from class
 * @param decoratorNameKey
 * @param target
 */
export function listPropertyData(decoratorNameKey: string, target: any) {
    return manager.listPropertyData(decoratorNameKey, target);
}

/**
 * save property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyMetadata(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.savePropertyData(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyMetadata(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.attachPropertyData(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyMetadata(decoratorNameKey: string, target: any, propertyName: any) {
    return manager.getPropertyData(decoratorNameKey, target, propertyName);
}

/**
 * clear all module
 */
export function clearAllModule() {
    return manager.clear();
}

/**
 * list module 
 * @param key
 */
export function listModule(key: string) {
    return manager.listModule(key);
}

/**
 * save module
 */
export function saveModule(key: string, module: any, identifier: string) {
    return manager.saveModule(key, module, identifier);
}

/**
 * get module
 */
export function getModule(key: string, identifier: string) {
    return manager.getModule(key, identifier);
}

/**
 * get identifier
 * @param target 
 */
export function getIdentifier(target: any) {
    return manager.getIdentifier(target);
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

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 * @param {boolean} [isLazy=false]
 */
export function injectAutowired(target: any, instance: any, container: Container, isLazy = false) {
    const metaData = recursiveGetMetadata(TAGGED_PROP, target);

    // tslint:disable-next-line: forin
    for (const metaKey in metaData) {
        let dep;
        const { type, identifier, delay, args } = metaData[metaKey] || { type: '', identifier: '', delay: false, args: [] };
        if (type && identifier) {
            if (!delay || isLazy) {
                dep = container.get(identifier, type, args);
                if (dep) {
                    // tslint:disable-next-line: no-unused-expression
                    process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${target.name} properties key: ${metaKey} => value: ${JSON.stringify(metaData[metaKey])}`);
                    Reflect.defineProperty(instance, metaKey, {
                        enumerable: true,
                        configurable: false,
                        writable: true,
                        value: dep
                    });
                } else {
                    throw new Error(`Component ${metaData[metaKey].identifier || ''} not found. It's autowired in class ${target.name}`);
                }
            } else {
                // Delay loading solves the problem of cyclic dependency
                // tslint:disable-next-line: no-unused-expression
                container.app.once && container.app.once("appLazy", () => {
                    // lazy inject autowired
                    injectAutowired(target, instance, container, true);
                });
            }
        }
    }
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectValue(target: any, instance: any, container: Container) {
    const metaData = recursiveGetMetadata(TAGGED_ARGS, target);
    // tslint:disable-next-line: forin
    for (const metaKey in metaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} config key: ${metaKey} => value: ${metaData[metaKey]}`);
        const propKeys = metaData[metaKey].split('|');
        const [propKey, type] = propKeys;
        const prop = container.app.config(propKey, type);
        Reflect.defineProperty(instance, metaKey, {
            enumerable: true,
            configurable: false,
            writable: true,
            value: prop
        });
    }
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} [instance]
 * @returns
 */
export function injectRouter(target: any, instance?: any) {
    // Controller router path
    const metaDatas = listPropertyData(NAMED_TAG, target);
    let path = '';
    const identifier = getIdentifier(target);
    if (metaDatas) {
        path = metaDatas[identifier] || "";
    }
    path = path.startsWith("/") || path === "" ? path : '/' + path;

    const rmetaData = recursiveGetMetadata(ROUTER_KEY, target);
    const router: any = {};
    // tslint:disable-next-line: forin
    for (const metaKey in rmetaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject method Router key: ${metaKey} => value: ${JSON.stringify(rmetaData[metaKey])}`);
        //.sort((a, b) => b.priority - a.priority) 
        for (const val of rmetaData[metaKey]) {
            const tmp = {
                ...val,
                path: `${path}${val.path}`.replace("//", "/")
            };
            router[`${tmp.path}-${tmp.requestMethod}`] = tmp;
        }
    }

    return router;
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} [instance]
 * @returns
 */
export function injectParam(target: any, instance?: any) {
    instance = instance || target.prototype;
    // const methods = getMethodNames(target);
    const metaDatas = recursiveGetMetadata(PARAM_KEY, target);
    const argsMetaObj: any = {};
    for (const meta in metaDatas) {
        if (instance[meta] && instance[meta].length <= metaDatas[meta].length) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} param key: ${helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);
            argsMetaObj[meta] = metaDatas[meta];
        }
    }
    // vaild 
    const vaildMetaDatas = recursiveGetMetadata(PARAM_RULE_KEY, target);
    for (const vmeta in vaildMetaDatas) {
        if (vaildMetaDatas[vmeta] && vaildMetaDatas[vmeta].length > 0 && argsMetaObj[vmeta]) {
            for (const vn of vaildMetaDatas[vmeta]) {
                argsMetaObj[vmeta] = argsMetaObj[vmeta].map((it: any) => {
                    if (it.index === vn.index && vn.fn && vn.rule) {
                        const fn = (ctx: any, type: string) => {
                            const value = it.fn(ctx, type);
                            return vn.fn(ctx, value, type, vn.rule, vn.msg);
                        };
                        return {
                            name: it.name,
                            fn,
                            index: it.index,
                            type: it.type
                        };
                    } else {
                        return it;
                    }
                });
            }
        }
    }
    return argsMetaObj;
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectSchedule(target: any, instance: any, container: Container) {
    const metaDatas = recursiveGetMetadata(SCHEDULE_KEY, target);
    // tslint:disable-next-line: forin
    for (const meta in metaDatas) {
        for (const val of metaDatas[meta]) {
            if (val.cron && helper.isFunction(instance[meta])) {
                // tslint:disable-next-line: no-unused-expression
                process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} schedule key: ${helper.toString(meta)} => value: ${JSON.stringify(metaDatas[meta])}`);
                scheduleJob(val.cron, async function () {
                    try {
                        const res = await instance[meta]();
                        return res;
                    } catch (e) {
                        logger.error(e);
                    }
                });
            }
        }
    }
}