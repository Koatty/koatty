/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-31 19:51:17
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

    public constructor(app: any) {
        this.app = app;
        this.handlerMap = new WeakMap<any, any>();
    }
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

                instance = target.prototype;
                // inject options
                if (!instance._options) {
                    Reflect.defineProperty(instance, '_options', {
                        enumerable: false,
                        configurable: false,
                        writable: true,
                        value: options
                    });
                }
                // inject autowired
                injectAutowired(target, instance, this);
                // inject value
                injectValue(target, instance, this.app);

                instance = Reflect.construct(target, options.args && options.args.length ? options.args : [this.app]);
                this.handlerMap.set(target, instance);
            } else {
                instance = target;
            }
        }
        return instance;
    }

    /**
     * 
     * @param identifier 
     */
    public get<T>(identifier: string, type: CompomentType = 'SERVICE', args?: any[]): T {
        const ref = getModule(type, identifier);
        if (!ref) {
            return null;
        }
        // 
        let target: any;
        if (args && args.length > 0) {
            target = this.reg(ref, { scope: 'Request', type, args });
        } else {
            target = this.handlerMap.get(ref);
            if (!target) {
                target = this.reg(identifier, ref);
            }
            // if (target._options && target._options.scope !== 'Singleton') {
            //     args = target._options && target._options.args && target._options.args.length ? target._options.args : [this.app];
            //     target = this.reg(ref, { scope: 'Request', type, args });
            // }
            // tslint:disable-next-line: no-unused-expression
            // target.app && (target.app = this.app);
        }

        return target;
    }
}

