/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-30 13:16:37
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Koatty } from '../Koatty';
import * as helper from "think_lib";
import { injectAutowired } from './Autowired';
import { CompomentType, TAGGED_CLS } from "./Constants";
import { IContainer, ObjectDefinitionOptions } from "./IContainer";

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
        if (!helper.isClass(target)) {
            return target;
        }

        let instance = this.instanceMap.get(target);
        if (!instance) {
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
            // inject options once
            Reflect.defineProperty(target.prototype, "_options", {
                enumerable: false,
                configurable: false,
                writable: true,
                value: options
            });
            const ref = this.getClass(options.type, identifier);
            if (!ref) {
                this.saveClass(options.type, target, identifier);
            }
            // define app as getter
            const app = this.app;
            Reflect.defineProperty(target.prototype, "app", {
                get() {
                    return app;
                },
                configurable: false,
                enumerable: false
            });
            // inject autowired
            injectAutowired(target, target.prototype, this);

            if (options.scope === "Singleton") {
                // instantiation
                instance = Reflect.construct(target, options.args);
            } else {
                instance = target;
            }
            // registration
            this.instanceMap.set(target, Object.seal(instance));
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
        if (!helper.isClass(target)) {
            return null;
        }
        // get instance from the Container
        const instance: any = this.reg(target, { scope: args.length > 0 ? "Prototype" : "Singleton", type, args });

        // require Prototype instance
        if (helper.isClass(instance)) {
            // instantiation
            return Reflect.construct(target, args);
        } else {
            return instance;
        }

    }

    /**
     * get class from IOC container by identifier.
     *
     * @param {string} identifier
     * @param {CompomentType} [type="SERVICE"]
     * @returns {Function}
     * @memberof Container
     */
    public getClass(identifier: string, type: CompomentType = "SERVICE"): Function {
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
        if (!helper.isClass(target)) {
            return null;
        }
        const type = this.getType(<Function><unknown>target);
        // get instance from the Container
        const instance: any = this.reg(target, { scope: args.length > 0 ? "Prototype" : "Singleton", type, args });

        // require Prototype instance
        if (helper.isClass(instance)) {
            // instantiation
            return Reflect.construct(<Function><unknown>target, args);
        } else {
            return instance;
        }
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
     * @param {Function | Object} target
     * @returns
     * @memberof Container
     */
    public getIdentifier(target: Function | Object) {
        let name = "";
        if (helper.isFunction(target)) {
            const metaData = Reflect.getOwnMetadata(TAGGED_CLS, target);
            if (metaData) {
                name = metaData.id || "";
            } else {
                name = (<Function>target).name || "";
            }
        } else {
            name = target.constructor ? (target.constructor.name || "") : "";
        }
        return name;
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
            let name = (<Function>target).name || "";
            name = name || (target.constructor ? (target.constructor.name || "") : "");
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
     * @param {CompomentType} type
     * @param {Function} module
     * @param {string} identifier
     * @memberof Container
     */
    public saveClass(type: CompomentType, module: Function, identifier: string) {
        Reflect.defineMetadata(TAGGED_CLS, { id: identifier, type }, module);
        const key = `${type}:${identifier}`;
        if (!this.classMap.has(key)) {
            this.classMap.set(key, module);
        }
    }

    /**
     * get all class from Container
     *
     * @param {CompomentType} type
     * @returns
     * @memberof Container
     */
    public listClass(type: CompomentType) {
        const modules: any[] = [];
        this.classMap.forEach((v, k) => {
            if (k.startsWith(type)) {
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
