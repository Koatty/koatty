/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-12 19:44:15
 */
import * as helper from "think_lib";
import { CompomentType } from './Constants';
import { IContainer, ObjectDefinitionOptions } from './IContainer';
import { getModule, getIdentifier, injectAutowired, injectValue, saveModule } from './Injectable';

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
     *
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
        if (!this.handlerMap.has(target) || options.scope !== 'Singleton') {
            if (helper.isClass(target)) {
                const ref = getModule(options.type, identifier);
                if (!ref) {
                    saveModule(options.type, target, identifier);
                }
                // inject options
                if (!target.prototype._options) {
                    Reflect.defineProperty(target.prototype, '_options', {
                        enumerable: false,
                        configurable: false,
                        writable: true,
                        value: options
                    });
                }
                instance = Reflect.construct(target, options.args && options.args.length ? options.args : [this.app]);
                // inject autowired
                injectAutowired(target, instance, this);
                if (target.prototype && target.prototype._delay) {
                    // tslint:disable-next-line: no-unused-expression
                    this.app.once && this.app.once("appLazy", () => {
                        // lazy inject autowired
                        injectAutowired(target, instance, this, true);
                    });
                }
                // inject value
                injectValue(target, instance, this.app);

                this.handlerMap.set(target, instance);
            } else {
                instance = target;
            }
        }
        return instance;
    }

    /**
     * 
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

