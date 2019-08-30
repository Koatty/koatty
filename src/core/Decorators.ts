/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-30 15:08:13
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { TAGGED_CLS } from "./Constants";

const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const ARGUMENT_NAMES = /([^\s,]+)/g;

export class Decorator {

    public static getOriginMetadata(metaKey: string, target: Object, method?: string | symbol) {
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
    public saveMetadata(type: string, decoratorNameKey: string, data: any, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Decorator.getOriginMetadata(type, target, propertyName);
            originMap.set(decoratorNameKey, data);
        } else {
            const originMap = Decorator.getOriginMetadata(type, target);
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
    public attachMetadata(type: string, decoratorNameKey: string, data: any, target: any, propertyName?: undefined) {
        let originMap;
        if (propertyName) {
            originMap = Decorator.getOriginMetadata(type, target, propertyName);
        } else {
            originMap = Decorator.getOriginMetadata(type, target);
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
    public getMetadata(type: string, decoratorNameKey: string, target: any, propertyName?: undefined) {
        if (propertyName) {
            const originMap = Decorator.getOriginMetadata(type, target, propertyName);
            return originMap.get(decoratorNameKey);
        } else {
            const originMap = Decorator.getOriginMetadata(type, target);
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
    public savePropertyDataToClass(decoratorNameKey: string, data: any, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(decoratorNameKey, target);
        originMap.set(propertyName, data);
    }

    /**
     * attach property data to class
     * @param decoratorNameKey
     * @param data
     * @param target
     * @param propertyName
     */
    public attachPropertyDataToClass(decoratorNameKey: string, data: any, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(decoratorNameKey, target);
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
    public getPropertyDataFromClass(decoratorNameKey: string, target: any, propertyName: string | symbol) {
        const originMap = Decorator.getOriginMetadata(decoratorNameKey, target);
        return originMap.get(propertyName);
    }

    /**
     * list property data from class
     * @param decoratorNameKey
     * @param target
     */
    public listPropertyDataFromClass(decoratorNameKey: string, target: any) {
        const originMap = Decorator.getOriginMetadata(decoratorNameKey, target);
        const res = [];
        for (const [key, value] of originMap) {
            res.push({ [key]: value });
        }
        return res;
    }
}


const manager = new Decorator();

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
export function attachClassMetadata(type: string, decoratorNameKey: string, data: any, target: any) {
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

