/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-04 15:26:41
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { TAGGED_CLS, TAGGED_PROP, TAGGED_ARGS, NAMED_TAG, ROUTER_KEY, PARAM_KEY } from "./Constants";
import { Container } from './Container';

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export class Injectable {

    /**
     *
     *
     * @static
     * @param {(string | symbol)} metaKey
     * @param {Object} target
     * @param {(string | symbol)} [method]
     * @returns
     * @memberof Injectable
     */
    public static getOriginMetadata(metaKey: string | symbol, target: Object, method?: string | symbol) {
        if (method) {
            // for property or method
            if (!Reflect.hasMetadata(metaKey, target, method)) {
                Reflect.defineMetadata(metaKey, new Map(), target, method);
            }
            return Reflect.getMetadata(metaKey, target, method);
        } else {
            // filter Object.create(null)
            if (typeof target === 'object' && target.constructor) {
                target = target.constructor;
            }
            // for class
            if (!Reflect.hasMetadata(metaKey, target)) {
                Reflect.defineMetadata(metaKey, new Map(), target);
            }
            return Reflect.getMetadata(metaKey, target);
        }
    }

    private handlerMap: Map<any, any>;

    /**
     * Creates an instance of Injectable.
     * @memberof Injectable
     */
    public constructor() {
        this.handlerMap = new Map();
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
     * @param {string} [identifier]
     * @memberof Injectable
     */
    public saveModule(key: string, module: any, identifier?: string) {
        identifier = identifier || this.getIdentifier(module);
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
    public saveMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Injectable.getOriginMetadata(type, target, propertyName);
            originMap.set(decoratorNameKey, data);
        } else {
            const originMap = Injectable.getOriginMetadata(type, target);
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
     * @param {undefined} [propertyName]
     * @memberof Injectable
     */
    public attachMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: any, propertyName?: undefined) {
        let originMap;
        if (propertyName) {
            originMap = Injectable.getOriginMetadata(type, target, propertyName);
        } else {
            originMap = Injectable.getOriginMetadata(type, target);
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
    public getMetadata(type: string, decoratorNameKey: string | symbol, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Injectable.getOriginMetadata(type, target, propertyName);
            return originMap.get(decoratorNameKey);
        } else {
            const originMap = Injectable.getOriginMetadata(type, target);
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
    public savePropertyDataToClass(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
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
    public attachPropertyDataToClass(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        if (!originMap.has(propertyName)) {
            originMap.set(propertyName, []);
        }
        const map: any[] = originMap.get(propertyName);
        let flag = true;
        if (map.length > 0) {
            for (const n of map) {
                if (JSON.stringify(n) === JSON.stringify(data)) {
                    flag = false;
                }
            }
        }
        if (flag) {
            originMap.get(propertyName).push(data);
        }
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
    public getPropertyDataFromClass(decoratorNameKey: string | symbol, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
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
    public listPropertyDataFromClass(decoratorNameKey: string | symbol, target: any) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        const res: any[] = [];
        for (const [key, value] of originMap) {
            res.push({ [key]: value });
        }
        return res;
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
    return manager.saveMetadata(type, decoratorNameKey, data, target);
}

/**
 * attach data to class
 * @param type
 * @param decoratorNameKey
 * @param data
 * @param target
 */
export function attachClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: any) {
    return manager.attachMetadata(type, decoratorNameKey, data, target);
}

/**
 * get data from class
 * @param type
 * @param decoratorNameKey
 * @param target
 */
export function getClassMetadata(type: string, decoratorNameKey: string, target: any) {
    return manager.getMetadata(type, decoratorNameKey, target);
}

/**
 * save property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyDataToClass(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.savePropertyDataToClass(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyDataToClass(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.attachPropertyDataToClass(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data from class
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyDataFromClass(decoratorNameKey: string, target: any, propertyName: any) {
    return manager.getPropertyDataFromClass(decoratorNameKey, target, propertyName);
}

/**
 * list property data from class
 * @param decoratorNameKey
 * @param target
 */
export function listPropertyDataFromClass(decoratorNameKey: string, target: any) {
    return manager.listPropertyDataFromClass(decoratorNameKey, target);
}

/**
 * save property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyMetadata(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.saveMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyMetadata(decoratorNameKey: string, data: any, target: any, propertyName: any) {
    return manager.attachMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyMetadata(decoratorNameKey: string, target: any, propertyName: any) {
    return manager.getMetadata(decoratorNameKey, target, propertyName);
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
export function saveModule(key: string, module: any, identifier?: string) {
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
    const metadatas = new Set();

    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    const metadata = listPropertyDataFromClass(metadataKey, target);
    if (metadata) {
        metadata.map((it: any) => {
            metadatas.add(it);
        });
    }

    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        const pmetadata = listPropertyDataFromClass(metadataKey, parent);
        if (pmetadata) {
            pmetadata.map((it: any) => {
                metadatas.add(it);
            });
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return Array.from(metadatas);
}

/**
 * Find methods on a given object
 *
 * @param {*} target - object to enumerate on
 * @returns {string[]} - method names
 */
export function getMethodNames(target: any): string[] {
    const result: any[] = [];
    let enumerableOwnKeys: any[] = Reflect.ownKeys(target.prototype);
    // get methods from es6 class
    enumerableOwnKeys = enumerableOwnKeys.filter((k) => typeof target.prototype[k] === 'function' && k !== 'constructor');
    // searching prototype chain for methods
    let parent = ordinaryGetPrototypeOf(target);
    while (parent && parent.prototype) {
        const allOwnKeysOnPrototype: any[] = Reflect.ownKeys(parent.prototype);
        // get methods from es6 class
        allOwnKeysOnPrototype.forEach((k) => {
            if (typeof target.prototype[k] === 'function' && k !== 'constructor' && !result.includes(k)) {
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
 * @param {boolean} isLazy
 */
export function injectAutowired(target: any, instance: any, container: Container, isLazy = false) {
    const metaDatas = recursiveGetMetadata(TAGGED_PROP, target);
    for (const metaData of metaDatas) {
        // tslint:disable-next-line: forin
        for (const metaKey in metaData) {
            let dep;
            const { type, identifier, delay, args } = metaData[metaKey] || { type: '', identifier: '', delay: false, args: [] };
            if (type && identifier) {
                if (!delay || isLazy) {
                    //不能依赖注入控制器
                    if (type === 'CONTROLLER') {
                        throw new Error(`Controller ${metaKey || ''} cannot be injected!`);
                    }
                    dep = container.get(identifier, type, args);
                    if (dep) {
                        // tslint:disable-next-line: no-unused-expression
                        process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${target.name} properties key: ${metaKey} => value: ${JSON.stringify(metaData[metaKey])}`);
                        Reflect.defineProperty(instance, metaKey, {
                            enumerable: false,
                            configurable: false,
                            writable: true,
                            value: dep
                        });
                    } else {
                        throw new Error(`Component ${metaData[metaKey].identifier || ''} not found. It's autowired in class ${target.name}`);
                    }
                } else {
                    target.prototype._delay = true;
                }
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
 * @param {*} app
 */
export function injectValue(target: any, instance: any, app: any) {
    const metaDatas = recursiveGetMetadata(TAGGED_ARGS, target);
    for (const metaData of metaDatas) {
        // tslint:disable-next-line: forin
        for (const metaKey in metaData) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} config key: ${metaKey} => value: ${metaData[metaKey]}`);
            const propKeys = metaData[metaKey].split('|');
            const [propKey, type] = propKeys;
            const prop = app.config(propKey, type);
            Reflect.defineProperty(instance, metaKey, {
                enumerable: false,
                configurable: false,
                writable: true,
                value: prop
            });
        }
    }
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} [instance]
 */
export function injectRouter(target: any, instance?: any) {
    // Controller router path
    const metaDatas = listPropertyDataFromClass(NAMED_TAG, target);
    let path = '';
    if (metaDatas.length > 0 && metaDatas[0]) {
        const identifier = getIdentifier(target);
        path = metaDatas[0][identifier] || '';
    }

    const routerMetaDatas = listPropertyDataFromClass(ROUTER_KEY, target);
    const router: any = {};
    for (const rmetaData of routerMetaDatas) {
        // tslint:disable-next-line: forin
        for (const metaKey in rmetaData) {
            // tslint:disable-next-line: no-unused-expression
            process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject method Router key: ${metaKey} => value: ${JSON.stringify(rmetaData[metaKey])}`);

            // if (instance._options) {
            // tslint:disable-next-line: no-unused-expression
            // !instance._options.router && (instance._options.router = []);
            for (const val of rmetaData[metaKey]) {
                const tmp = {
                    ...val,
                    path: `${path.startsWith("/") || path === "" ? path : '/' + path}${val.path}`
                };
                // instance._options.router.push(tmp);
                router[`${tmp.path}-${tmp.requestMethod}`] = tmp;
            }
            // }
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
 */
export function injectParam(target: any, instance?: any) {
    instance = instance || target.prototype;
    const methods = getMethodNames(target);
    const metaDatas = listPropertyDataFromClass(PARAM_KEY, target);
    const argsMetaObj: any = {};
    for (const m of methods) {
        for (const meta of metaDatas) {
            if (meta && meta[m] && instance[m].length <= meta[m].length) {
                // if (meta && meta[m]) {
                // tslint:disable-next-line: no-unused-expression
                process.env.NODE_ENV === 'development' && logger.custom('think', '', `Register inject ${getIdentifier(target)} param key: ${helper.toString(m)} => value: ${JSON.stringify(meta[m])}`);
                argsMetaObj[m] = meta[m];
                break;
            }
        }
    }
    // tslint:disable-next-line: no-unused-expression
    // !instance._options.params && (instance._options.params = {});
    // Reflect.defineProperty(instance._options, 'params', {
    //     enumerable: false,
    //     configurable: false,
    //     writable: true,
    //     value: argsMetaObj
    // });
    return argsMetaObj;
}
