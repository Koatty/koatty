/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-27 14:48:27
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import { ObjectDefinitionOptions, TagClsMetadata } from './IContainer';
import { TAGGED_CLS } from "./Constants";

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export type decoratorKey = string | symbol;

export class Decorator extends Map {

    public static getDecoratorClassKey(decoratorNameKey: decoratorKey) {
        return decoratorNameKey.toString() + '_CLS';
    }

    public static getDecoratorMethodKey(decoratorNameKey: decoratorKey) {
        return decoratorNameKey.toString() + '_METHOD';
    }

    public static getDecoratorClsMethodPrefix(decoratorNameKey: decoratorKey) {
        return decoratorNameKey.toString() + '_CLS_METHOD';
    }

    public static getDecoratorClsMethodKey(decoratorNameKey: decoratorKey, methodKey: decoratorKey) {
        return Decorator.getDecoratorClsMethodPrefix(decoratorNameKey) + ':' + methodKey.toString();
    }

    public static getOriginMetadata(metaKey: string, target: Object, method?: string | symbol) {
        if (method) {
            // for property
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

    /**
     * the key for meta data store in class
     */
    public injectClassKeyPrefix = 'INJECTION_CLASS_META_DATA';
    /**
     * the key for method meta data store in class
     */
    public injectClassMethodKeyPrefix = 'INJECTION_CLASS_METHOD_META_DATA';

    /**
     * the key for method meta data store in method
     */
    public injectMethodKeyPrefix = 'INJECTION_METHOD_META_DATA';

    public saveModule(key: string | symbol, module: any) {
        if (!this.has(key)) {
            this.set(key, new Set());
        }
        this.get(key).add(module);
    }

    public listModule(key: string | symbol) {
        return Array.from(this.get(key) || {});
    }

    /**
     * save meta data to class or property
     * @param decoratorNameKey the alias name for decorator
     * @param data the data you want to store
     * @param target target class
     * @param propertyName
     */
    public saveMetadata(decoratorNameKey: decoratorKey, data: any, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Decorator.getOriginMetadata(this.injectMethodKeyPrefix, target, propertyName);
            originMap.set(Decorator.getDecoratorMethodKey(decoratorNameKey), data);
        } else {
            const originMap = Decorator.getOriginMetadata(this.injectClassKeyPrefix, target);
            originMap.set(Decorator.getDecoratorClassKey(decoratorNameKey), data);
        }
    }

    /**
     * attach data to class or property
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public attachMetadata(decoratorNameKey: decoratorKey, data: any, target: any, propertyName?: undefined) {
        let originMap;
        let key;
        if (propertyName) {
            originMap = Decorator.getOriginMetadata(this.injectMethodKeyPrefix, target, propertyName);
            key = Decorator.getDecoratorMethodKey(decoratorNameKey);
        } else {
            originMap = Decorator.getOriginMetadata(this.injectClassKeyPrefix, target);
            key = Decorator.getDecoratorClassKey(decoratorNameKey);
        }
        if (!originMap.has(key)) {
            originMap.set(key, []);
        }
        originMap.get(key).push(data);
    }

    /**
     * get single data from class or property
     * @param decoratorNameKey
     * @param target
     * @param propertyName
     */
    public getMetadata(decoratorNameKey: decoratorKey, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Decorator.getOriginMetadata(this.injectMethodKeyPrefix, target, propertyName);
            return originMap.get(Decorator.getDecoratorMethodKey(decoratorNameKey));
        } else {
            const originMap = Decorator.getOriginMetadata(this.injectClassKeyPrefix, target);
            return originMap.get(Decorator.getDecoratorClassKey(decoratorNameKey));
        }
    }

    /**
     * save property data to class
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public savePropertyDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(this.injectClassMethodKeyPrefix, target);
        originMap.set(Decorator.getDecoratorClsMethodKey(decoratorNameKey, propertyName), data);
    }

    /**
     * attach property data to class
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public attachPropertyDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(this.injectClassMethodKeyPrefix, target);
        const key = Decorator.getDecoratorClsMethodKey(decoratorNameKey, propertyName);
        if (!originMap.has(key)) {
            originMap.set(key, []);
        }
        originMap.get(key).push(data);
    }

    /**
     * get property data from class
     * @param decoratorNameKey
     * @param target
     * @param propertyName
     */
    public getPropertyDataFromClass(decoratorNameKey: decoratorKey, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(this.injectClassMethodKeyPrefix, target);
        return originMap.get(Decorator.getDecoratorClsMethodKey(decoratorNameKey, propertyName));
    }

    /**
     * list property data from class
     * @param decoratorNameKey
     * @param target
     */
    public listPropertyDataFromClass(decoratorNameKey: decoratorKey, target: any) {
        const originMap = Decorator.getOriginMetadata(this.injectClassMethodKeyPrefix, target);
        const res = [];
        for (const [key, value] of originMap) {
            if (key.indexOf(Decorator.getDecoratorClsMethodPrefix(decoratorNameKey)) !== -1) {
                res.push(value);
            }
        }
        return res;
    }
}


const manager = new Decorator();

/**
 * save data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 */
export function saveClassMetadata(decoratorNameKey: decoratorKey, data: any, target: any) {
    return manager.saveMetadata(decoratorNameKey, data, target);
}

/**
 * attach data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 */
export function attachClassMetadata(decoratorNameKey: decoratorKey, data: any, target: any) {
    return manager.attachMetadata(decoratorNameKey, data, target);
}

/**
 * get data from class
 * @param decoratorNameKey
 * @param target
 */
export function getClassMetadata(decoratorNameKey: decoratorKey, target: any) {
    return manager.getMetadata(decoratorNameKey, target);
}

/**
 * save method data to class
 * @deprecated
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param method
 */
export function saveMethodDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, method: any) {
    return manager.savePropertyDataToClass(decoratorNameKey, data, target, method);
}

/**
 * attach method data to class
 * @deprecated
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param method
 */
export function attachMethodDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, method: any) {
    return manager.attachPropertyDataToClass(decoratorNameKey, data, target, method);
}

/**
 * get method data from class
 * @deprecated
 * @param decoratorNameKey
 * @param target
 * @param method
 */
export function getMethodDataFromClass(decoratorNameKey: decoratorKey, target: any, method: any) {
    return manager.getPropertyDataFromClass(decoratorNameKey, target, method);
}

/**
 * list method data from class
 * @deprecated
 * @param decoratorNameKey
 * @param target
 */
export function listMethodDataFromClass(decoratorNameKey: decoratorKey, target: any) {
    return manager.listPropertyDataFromClass(decoratorNameKey, target);
}

/**
 * save method data
 * @deprecated
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param method
 */
export function saveMethodMetadata(decoratorNameKey: decoratorKey, data: any, target: any, method: any) {
    return manager.saveMetadata(decoratorNameKey, data, target, method);
}

/**
 * attach method data
 * @deprecated
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param method
 */
export function attachMethodMetadata(decoratorNameKey: decoratorKey, data: any, target: any, method: any) {
    return manager.attachMetadata(decoratorNameKey, data, target, method);
}

/**
 * get method data
 * @deprecated
 * @param decoratorNameKey
 * @param target
 * @param method
 */
export function getMethodMetadata(decoratorNameKey: decoratorKey, target: any, method: any) {
    return manager.getMetadata(decoratorNameKey, target, method);
}

/**
 * save property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: any) {
    return manager.savePropertyDataToClass(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data to class
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyDataToClass(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: any) {
    return manager.attachPropertyDataToClass(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data from class
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyDataFromClass(decoratorNameKey: decoratorKey, target: any, propertyName: any) {
    return manager.getPropertyDataFromClass(decoratorNameKey, target, propertyName);
}

/**
 * list property data from class
 * @param decoratorNameKey
 * @param target
 */
export function listPropertyDataFromClass(decoratorNameKey: decoratorKey, target: any) {
    return manager.listPropertyDataFromClass(decoratorNameKey, target);
}

/**
 * save property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function savePropertyMetadata(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: any) {
    return manager.saveMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * attach property data
 * @param decoratorNameKey
 * @param data
 * @param target
 * @param propertyName
 */
export function attachPropertyMetadata(decoratorNameKey: decoratorKey, data: any, target: any, propertyName: any) {
    return manager.attachMetadata(decoratorNameKey, data, target, propertyName);
}

/**
 * get property data
 * @param decoratorNameKey
 * @param target
 * @param propertyName
 */
export function getPropertyMetadata(decoratorNameKey: decoratorKey, target: any, propertyName: any) {
    return manager.getMetadata(decoratorNameKey, target, propertyName);
}

/**
 * save module to inner map
 * @param decoratorNameKey
 * @param target
 */
export function saveModule(decoratorNameKey: decoratorKey, target: any) {
    return manager.saveModule(decoratorNameKey, target);
}

/**
 * list module from decorator key
 * @param decoratorNameKey
 */
export function listModule(decoratorNameKey: decoratorKey) {
    return manager.listModule(decoratorNameKey);
}

/**
 * clear all module
 */
export function clearAllModule() {
    return manager.clear();
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

/**
 * get provider id from module
 * @param module
 */
export function getProviderId(module: Object) {
    const metaData = Reflect.getMetadata(TAGGED_CLS, module) as TagClsMetadata;
    if (metaData) {
        return metaData.id;
    }
}
