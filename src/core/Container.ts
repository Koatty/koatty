/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-03 19:48:21
 */
import * as helper from "think_lib";
import { CompomentType } from "./Constants";
import { injectSchedule } from "./Schedule";
import { IContainer, ObjectDefinitionOptions } from "./IContainer";
import { getModule, getIdentifier, injectAutowired, injectValue, saveModule } from "./Injectable";

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
    public app: any;
    private handlerMap: WeakMap<any, any>;

    /**
     * Creates an instance of Container.
     * @param {*} app
     * @memberof Container
     */
    public constructor(app: any) {
        this.app = app;
        this.handlerMap = new WeakMap<any, any>();
    }


    /**
     * Registering an instance of a class to an IOC container.
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
            identifier = getIdentifier(target);
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

        let instance = this.handlerMap.get(target);
        if (!instance) {
            // inject options once
            Reflect.defineProperty(target.prototype, "_options", {
                enumerable: false,
                configurable: false,
                writable: true,
                value: options
            });
            if (helper.isClass(target)) {
                const ref = getModule(options.type, identifier);
                if (!ref) {
                    saveModule(options.type, target, identifier);
                }
                // inject dependency
                BuildInject(target, options, this);

                if (options.scope === "Singleton") {
                    // instantiation
                    instance = Reflect.construct(target, options.args);
                } else {
                    instance = target;
                }
                // registration
                this.handlerMap.set(target, instance);
            } else {
                return target;
            }
        }

        if (options.scope !== "Singleton") {
            // instantiation
            return Reflect.construct(instance, options.args);
        }
        return instance;
    }

    /**
     * Get instance from IOC container.
     *
     * @param {string} identifier
     * @param {CompomentType} [type="SERVICE"]
     * @param {any[]} [args=[]]
     * @returns {object}
     * @memberof Container
     */
    public get(identifier: string, type: CompomentType = "SERVICE", args: any[] = []): object {
        const target = getModule(type, identifier);
        if (!target) {
            return null;
        }
        // get instance from the Container
        let instance: any = this.handlerMap.get(target);
        if (!instance) {
            return null;
        }

        // not Singleton, the Container return prototype
        if (args.length > 0 || helper.isClass(instance)) {
            // instantiation
            instance = Reflect.construct(instance, args);
        }

        if (!instance.app) {
            instance.app = this.app;
        }

        return instance;
    }

}

