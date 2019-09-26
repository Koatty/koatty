/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-26 12:53:42
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { TAGGED_CLS, TAGGED_PROP, COMPONENT_KEY, TAGGED_ARGS, NAMED_TAG, ROUTER_KEY, PARAM } from "./Constants";
import { Container } from './Container';

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export class Injectable {

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

    public handlerMap: Map<any, any>;

    public constructor() {
        this.handlerMap = new Map();
    }

    /**
     * 
     * @param target 
     */
    public getIdentifier(target: any) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.id;
        } else {
            return helper.camelCase(target.name, { pascalCase: true });
        }
    }

    /**
     * 
     * @param key 
     * @param module 
     * @param identifier 
     */
    public saveModule(key: string, module: any, identifier?: string) {
        identifier = identifier || this.getIdentifier(module);
        if (!this.handlerMap.has(module)) {
            this.handlerMap.set(`${key}:${identifier}`, module);
        }
    }

    /**
     * 
     * @param key 
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
     * @param key 
     * @param identifier 
     */
    public getModule(key: string, identifier: string) {
        return this.handlerMap.get(`${key}:${identifier}`);
    }

    /**
     * save meta data to class or property
     * @param type the type name for components
     * @param decoratorNameKey the alias name for decorator
     * @param data the data you want to store
     * @param target target class
     * @param propertyName
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
     * @param type the type name for components
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
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
     * @param type the type name for components
     * @param decoratorNameKey
     * @param target
     * @param propertyName
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
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public savePropertyDataToClass(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        originMap.set(propertyName, data);
    }

    /**
     * attach property data to class
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public attachPropertyDataToClass(decoratorNameKey: string | symbol, data: any, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        if (!originMap.has(propertyName)) {
            originMap.set(propertyName, []);
        }
        originMap.get(propertyName).push(data);
    }

    /**
     * get property data from class
     * @param decoratorNameKey
     * @param target
     * @param propertyName
     */
    public getPropertyDataFromClass(decoratorNameKey: string | symbol, target: any, propertyName: string | symbol) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        return originMap.get(propertyName);
    }

    /**
     * list property data from class
     * @param decoratorNameKey
     * @param target
     */
    public listPropertyDataFromClass(decoratorNameKey: string | symbol, target: any) {
        const originMap = Injectable.getOriginMetadata(decoratorNameKey, target);
        const res = [];
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
    return manager.handlerMap.clear();
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
    const metadatas: any[] = [];

    // get metadata value of a metadata key on the prototype
    // let metadata = Reflect.getOwnMetadata(metadataKey, target, propertyKey);
    let metadata = listPropertyDataFromClass(metadataKey, target);
    if (metadata) {
        metadatas.push(...metadata);
    }

    // get metadata value of a metadata key on the prototype chain
    let parent = ordinaryGetPrototypeOf(target);
    while (parent !== null) {
        // metadata = Reflect.getOwnMetadata(metadataKey, parent, propertyKey);
        metadata = listPropertyDataFromClass(metadataKey, parent);
        if (metadata) {
            metadatas.push(...metadata);
        }
        parent = ordinaryGetPrototypeOf(parent);
    }
    return metadatas;
}

/**
 * Find methods on a given object
 *
 * @param {*} obj - object to enumerate on
 * @returns {string[]} - method names
 */
export function getMethodNames(obj: any): string[] {
    const enumerableOwnKeys: string[] = Object.keys(obj);
    const ownKeysOnObjectPrototype = Object.getOwnPropertyNames(Object.getPrototypeOf({}));
    // methods on obj itself should be always included
    const result = enumerableOwnKeys.filter((k) => typeof obj[k] === 'function');

    // searching prototype chain for methods
    let proto = obj;
    do {
        proto = Object.getPrototypeOf(proto);
        const allOwnKeysOnPrototype: string[] = Object.getOwnPropertyNames(proto);
        // get methods from es6 class
        allOwnKeysOnPrototype.forEach((k) => {
            if (typeof obj[k] === 'function' && k !== 'constructor') {
                result.push(k);
            }
        });
    }
    while (proto && proto !== Object.prototype);

    // leave out those methods on Object's prototype
    return result.filter((k) => {
        return ownKeysOnObjectPrototype.indexOf(k) === -1;
    });
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectAutowired(target: any, instance: any, container: Container) {
    const metaDatas = recursiveGetMetadata(TAGGED_PROP, target);
    for (const metaData of metaDatas) {
        // tslint:disable-next-line: forin
        for (const metaKey in metaData) {
            console.log(`=> register inject ${getIdentifier(target)} properties key = ${metaKey}`);
            console.log(`=> register inject ${getIdentifier(target)} properties value = ${metaData[metaKey]}`);
            const ref = getModule(COMPONENT_KEY, metaData[metaKey]);
            let dep = container.handlerMap.get(ref);
            if (!container.handlerMap.has(ref)) {
                dep = container.reg(ref);
            }

            helper.define(instance, metaKey, dep);
            // Object.defineProperty(instance, metaKey, {
            //     enumerable: true,
            //     writable: false,
            //     configurable: false,
            //     value: dep
            // });
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
            console.log(`=> register inject ${getIdentifier(target)} config key = ${metaKey}`);
            console.log(`=> register inject ${getIdentifier(target)} config value = ${metaData[metaKey]}`);
            const propKeys = metaData[metaKey].split('|');
            const [propKey, type] = propKeys;
            const prop = app.config(propKey, type);
            helper.define(instance, metaKey, prop);
            // Object.defineProperty(instance, metaKey, {
            //     enumerable: true,
            //     writable: false,
            //     configurable: false,
            //     value: prop
            // });
        }
    }
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 */
export function injectRouter(target: any, instance: any) {
    // Controller router path
    const metaDatas = recursiveGetMetadata(NAMED_TAG, target);
    let path = '';
    if (metaDatas.length > 0 && metaDatas[0]) {
        const identifier = getIdentifier(target);
        path = metaDatas[0][identifier] || '';
    }

    const routerMetaDatas = recursiveGetMetadata(ROUTER_KEY, target);
    console.log('routerMetaDatas', routerMetaDatas);
    for (const rmetaData of routerMetaDatas) {
        // tslint:disable-next-line: forin
        for (const metaKey in rmetaData) {
            console.log(`=> register inject method Router key = ${metaKey}`);
            console.log(`=> register inject method Router value = ${JSON.stringify(rmetaData[metaKey])}`);

            if (instance.options) {
                // tslint:disable-next-line: no-unused-expression
                !instance.options.router && (instance.options.router = []);
                for (const val of rmetaData[metaKey]) {
                    val.path = `${path}${val.path}`;
                    instance.options.router.push(val);
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
export function injectParam(target: any, instance: any, app: any) {
    const metaDatas = recursiveGetMetadata(PARAM, target);
    const methods = getMethodNames(instance);
    const argsMetaObj: any = {};
    methods.map((m) => {
        metaDatas.map((a) => {
            if (a[m]) {
                console.log(`=> register inject ${getIdentifier(target)} param key = ${m}`);
                console.log(`=> register inject ${getIdentifier(target)} param value = ${JSON.stringify(a[m])}`);
                argsMetaObj[m] = a[m];
            }
        });
    });
    // tslint:disable-next-line: no-unused-expression
    !instance.options.params && (instance.options.params = {});
    helper.define(instance.options, 'params', argsMetaObj);
    // Object.defineProperty(instance, 'params', {
    //     enumerable: true,
    //     writable: false,
    //     configurable: false,
    //     value: argsMetaObj
    // });
}