/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-27 15:24:13
 */
import * as helper from "think_lib";
import { CompomentType } from './Constants';
import { injectSchedule } from './Schedule';
import { IContainer, ObjectDefinitionOptions } from './IContainer';
import { getModule, getIdentifier, injectAutowired, injectValue, saveModule } from './Injectable';

/**
 * Auto injection
 *
 * @param {*} target
 * @param {*} instance
 * @param {ObjectDefinitionOptions} options
 * @param {Container} container
 * @returns
 */
const buildInject = function (target: any, instance: any, options: ObjectDefinitionOptions, container: Container) {
    // inject options once
    Reflect.defineProperty(instance, '_options', {
        enumerable: false,
        configurable: false,
        writable: true,
        value: options
    });
    // inject autowired
    injectAutowired(target, instance, container);
    // inject schedule
    injectSchedule(target, instance, container);
    return instance;
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
            initMethod: 'constructor',
            destroyMethod: 'distructor',
            scope: 'Singleton',
            type: 'COMPONENT',
            args: [],
            ...options
        };

        let instance = this.handlerMap.get(target);
        if (!this.handlerMap.has(target)) {
            if (helper.isClass(target)) {
                const ref = getModule(options.type, identifier);
                if (!ref) {
                    saveModule(options.type, target, identifier);
                }

                // inject configuation. may be used by constructor
                injectValue(target, target.prototype, this);

                // instantiation
                instance = Reflect.construct(target, options.args && options.args.length ? options.args : [this.app]);

                // inject dependency
                instance = buildInject(target, instance, options, this);

                // // tslint:disable-next-line: no-this-assignment
                // const container = this;
                // instance = Reflect.construct(new Proxy(target, {
                //     construct(tgt, args, newTarget) {
                //         const cls: any = Reflect.construct(tgt, args, newTarget);
                //         // injection dependency
                //         buildInject(tgt, cls, options, container);
                //         // custom construct method
                //         // tslint:disable-next-line: no-unused-expression
                //         cls.init && cls.init(...args);
                //         return cls;
                //     }
                // }), options.args && options.args.length ? options.args : [this.app]);

                // registration
                this.handlerMap.set(target, instance);
            } else {
                instance = target;
            }
        }
        if (options.scope !== 'Singleton') {
            instance = helper.clone(instance, true);
        }
        return instance;
    }

    /**
     * Get instance from IOC container.
     *
     * @template T
     * @param {string} identifier
     * @param {CompomentType} [type='SERVICE']
     * @param {any[]} [args]
     * @returns {T}
     * @memberof Container
     */
    public get<T>(identifier: string, type: CompomentType = 'SERVICE', args?: any[]): T {
        const target = getModule(type, identifier);
        if (!target) {
            return null;
        }
        // 
        let instance: any;
        if (args && args.length > 0) {
            instance = this.reg(target, { scope: 'Request', type, args });
        } else {
            instance = this.handlerMap.get(target);
            if (!instance) {
                instance = this.reg(identifier, target);
            }
        }
        // tslint:disable-next-line: no-unused-expression
        instance && !instance.app && (instance.app = this.app);

        return instance;
    }

}

