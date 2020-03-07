/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-06 14:56:29
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { TAGGED_CLS } from "./Constants";

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
        if (typeof target === "object" && target.constructor) {
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
        if (typeof target === "object" && target.constructor) {
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
     * @param {*} target
     * @returns
     * @memberof Injectable
     */
    public getType(target: any) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.type;
        } else {
            const name = target.name || target.constructor.name || "";
            if (~name.indexOf("Controller")) {
                return "CONTROLLER";
            } else if (~name.indexOf("Middleware")) {
                return "MIDDLEWARE";
            } else if (~name.indexOf("Service")) {
                return "SERVICE";
            } else {
                return "COMPONENT";
            }
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
        Reflect.defineMetadata(TAGGED_CLS, { id: identifier, type: key }, module);
        key = `${key}:${identifier}`;
        if (!this.handlerMap.has(key)) {
            this.handlerMap.set(key, module);
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
 * get type
 * @param target 
 */
export function getType(target: any) {
    return manager.getType(target);
}

