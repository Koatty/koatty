/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-21 20:40:14
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { injectSchedule } from "./Schedule";
import { CompomentType, TAGGED_CLS } from "./Constants";
import { IContainer, ObjectDefinitionOptions } from "./IContainer";
import { injectValue, injectAutowired } from './Autowired';
import { Koatty } from '../Koatty';

/**
 * Auto injection
 *
 * @param {*} target
 * @param {ObjectDefinitionOptions} options
 * @param {Container} container
 * @returns
 */
const BuildInject = function (target: any, options: ObjectDefinitionOptions, container: Container) {
    // inject configuation
    injectValue(target, target.prototype, container);
    // inject autowired
    injectAutowired(target, target.prototype, container);
    // inject schedule
    injectSchedule(target, target.prototype, container);
    return target;
};

/**
 * IOC Container
 *
 * @export
 * @class Container
 * @implements {IContainer}
 */
export class Container implements IContainer {
    private app: Koatty;
    private classMap: Map<any, any>;
    private instanceMap: WeakMap<any, any>;
    private metadataMap: WeakMap<any, any>;

    /**
     * creates an instance of Container.
     * @param {*} app
     * @memberof Container
     */
    public constructor() {
        this.classMap = new Map();
        this.instanceMap = new WeakMap();
        this.metadataMap = new WeakMap();
    }

    /**
     * set app
     *
     * @param {Koatty} app
     * @returns
     * @memberof Container
     */
    public setApp(app: Koatty) {
        this.app = app;
    }

    /**
     * get app
     *
     * @returns
     * @memberof Container
     */
    public getApp() {
        return this.app;
    }

    /**
     * registering an instance of a class to an IOC container.
     *
     * @template T
     * @param {T} target
     * @param {ObjectDefinitionOptions} [options]
     * @returns {T}
     * @memberof Container
     */
    public reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    public reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    public reg<T>(identifier: any, target?: any, options?: ObjectDefinitionOptions): T {
        if (helper.isClass(identifier) || helper.isFunction(identifier)) {
            options = target;
            target = (identifier as any);
            identifier = this.getIdentifier(target);
        }
        options = {
            isAsync: false,
            initMethod: "constructor",
            destroyMethod: "distructor",
            scope: "Singleton",
            type: "COMPONENT",
            args: [],
            ...options
        };
        options.args = options.args.length ? options.args : [this.app];

        let instance = this.instanceMap.get(target);
        if (!instance) {
            // inject options once
            Reflect.defineProperty(target.prototype, "_options", {
                enumerable: false,
                configurable: false,
                writable: true,
                value: options
            });
            if (helper.isClass(target)) {
                const ref = this.getClass(options.type, identifier);
                if (!ref) {
                    // inject dependency
                    BuildInject(target, options, this);

                    if (options.scope === "Singleton") {
                        // instantiation
                        instance = Reflect.construct(target, options.args);
                        helper.define(instance, "app", this.app);
                    } else {
                        instance = target;
                    }
                    // registration
                    this.instanceMap.set(target, Object.seal(instance));
                }
            } else {
                return target;
            }
        }

        if (options.scope !== "Singleton") {
            // instantiation
            instance = Reflect.construct(instance, options.args);
            helper.define(instance, "app", this.app);
            return instance;
        }
        return instance;
    }

    /**
     * get instance from IOC container.
     *
     * @param {string} identifier
     * @param {CompomentType} [type="SERVICE"]
     * @param {any[]} [args=[]]
     * @returns {object}
     * @memberof Container
     */
    public get(identifier: string, type: CompomentType = "SERVICE", args: any[] = []): object {
        const target = this.getClass(identifier, type);
        if (!target) {
            return null;
        }
        // get instance from the Container
        let instance: any = this.instanceMap.get(target);
        if (!instance) {
            return null;
        }

        // not Singleton, the Container return prototype
        if (args.length > 0 || helper.isClass(instance)) {
            // instantiation
            instance = Reflect.construct(instance, args);
            helper.define(instance, "app", this.app);
        }

        return instance;
    }

    /**
     * get class from IOC container by identifier.
     *
     * @param {string} identifier
     * @param {CompomentType} [type="SERVICE"]
     * @returns {object}
     * @memberof Container
     */
    public getClass(identifier: string, type: CompomentType = "SERVICE"): object {
        return this.classMap.get(`${type}:${identifier}`);
    }

    /**
     * get instance from IOC container by class.
     *
     * @template T
     * @param {T} target
     * @param {any[]} [args=[]]
     * @returns {T}
     * @memberof Container
     */
    public getInsByClass<T>(target: T, args: any[] = []): T {
        if (!target || !helper.isClass(target)) {
            return null;
        }
        // get instance from the Container
        let instance: any = this.instanceMap.get(target);
        if (!instance) {
            return null;
        }

        // not Singleton, the Container return prototype
        if (args.length > 0 || helper.isClass(instance)) {
            // instantiation
            instance = Reflect.construct(instance, args);
            helper.define(instance, "app", this.app);
        }
        return instance;
    }

    /**
     * get metadata from class
     *
     * @static
     * @param {(string | symbol)} metadataKey
     * @param {(Function | object)} target
     * @param {(string | symbol)} [propertyKey]
     * @returns
     * @memberof Injectable
     */
    public getMetadataMap(metadataKey: string | symbol, target: Function | object, propertyKey?: string | symbol) {
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

    /**
     * get identifier from class
     *
     * @param {Function} target
     * @returns
     * @memberof Container
     */
    public getIdentifier(target: Function) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.id;
        } else {
            // return helper.camelCase(target.name, { pascalCase: true });
            return target.name;
        }
    }

    /**
     * get component type from class
     *
     * @param {Function} target
     * @returns
     * @memberof Container
     */
    public getType(target: Function | object) {
        const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
        if (metaData) {
            return metaData.type;
        } else {
            const name = (<Function>target).name || target.constructor.name || "";
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
     * save class to Container
     *
     * @param {string} key
     * @param {Function} module
     * @param {string} identifier
     * @memberof Container
     */
    public saveClass(key: string, module: Function, identifier: string) {
        Reflect.defineMetadata(TAGGED_CLS, { id: identifier, type: key }, module);
        key = `${key}:${identifier}`;
        if (!this.classMap.has(key)) {
            this.classMap.set(key, module);
        }
    }

    /**
     * get all class from Container
     *
     * @param {string} key
     * @returns
     * @memberof Container
     */
    public listClass(key: string) {
        const modules: any[] = [];
        this.classMap.forEach((v, k) => {
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
     * save meta data to class or property
     *
     * @param {string} type
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {(Function | object)} target
     * @param {string} [propertyName]
     * @memberof Container
     */
    public saveClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName?: string) {
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
     * @param {(Function | object)} target
     * @param {string} [propertyName]
     * @memberof Container
     */
    public attachClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName?: string) {
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
     * @param {(Function | object)} target
     * @param {string} [propertyName]
     * @returns
     * @memberof Container
     */
    public getClassMetadata(type: string, decoratorNameKey: string | symbol, target: Function | object, propertyName?: string) {
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
     * @param {(Function | object)} target
     * @param {(string | symbol)} propertyName
     * @memberof Container
     */
    public savePropertyData(decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        originMap.set(propertyName, data);
    }

    /**
     * attach property data to class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {*} data
     * @param {(Function | object)} target
     * @param {(string | symbol)} propertyName
     * @memberof Container
     */
    public attachPropertyData(decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        if (!originMap.has(propertyName)) {
            originMap.set(propertyName, []);
        }
        originMap.get(propertyName).push(data);
    }

    /**
     * get property data from class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {(Function | object)} target
     * @param {(string | symbol)} propertyName
     * @returns
     * @memberof Container
     */
    public getPropertyData(decoratorNameKey: string | symbol, target: Function | object, propertyName: string | symbol) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        return originMap.get(propertyName);
    }

    /**
     * list property data from class
     *
     * @param {(string | symbol)} decoratorNameKey
     * @param {(Function | object)} target
     * @returns
     * @memberof Container
     */
    public listPropertyData(decoratorNameKey: string | symbol, target: Function | object) {
        const originMap = this.getMetadataMap(decoratorNameKey, target);
        const datas: any = {};
        for (const [key, value] of originMap) {
            datas[key] = value;
        }
        return datas;
    }
}
// export
export const IOCContainer = new Container();
