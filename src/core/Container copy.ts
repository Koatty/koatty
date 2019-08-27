/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-23 20:20:19
 */
import { Container, getClassMetadata, getObjectDefinition, IApplicationContext, IContainer, ObjectDefinitionOptions, ScopeEnum, TAGGED_CLS, TagClsMetadata, ObjectIdentifier, Scope } from 'injection';
import { CLASS_KEY_CONSTRUCTOR, CONFIG_KEY, FUNCTION_INJECT_KEY } from './Constants';
import * as helper from "think_lib";

interface DecoratorMetadata {
    key: string;
    propertyName: string;
}
export class IOContainer extends Container implements IContainer {
    public handlerMap: Map<string, (handlerKey: string, instance?: any) => any>;

    // tslint:disable-next-line: no-unnecessary-initializer
    public constructor(baseDir: string = process.cwd(), parent: IApplicationContext = undefined) {
        super(baseDir, parent);
    }

    public init(): void {
        this.handlerMap = new Map();
        super.init();

        this.registerEachCreatedHook();
    }

    /**
     * get hook from current map or parent map
     * @param hookKey hookKey
     */
    public findHandlerHook(hookKey: string): any {
        if (this.handlerMap.has(hookKey)) {
            return this.handlerMap.get(hookKey);
        }
        if (this.parent) {
            return (this.parent as IOContainer).findHandlerHook(hookKey);
        }
    }

    /**
     *
     * @param handlerType handlerType
     * @param handler handler
     */
    public registerDataHandler(handlerType: string, handler: (handlerKey: any) => any) {
        this.handlerMap.set(handlerType, handler);
    }

    /**
     *
     * @param objectDefinition objectDefinition
     * @param target target
     */
    public registerCustomBinding(objectDefinition: any, target: any) {
        super.registerCustomBinding(objectDefinition, target);

        // Override the default scope to request
        const objDefOptions: ObjectDefinitionOptions = getObjectDefinition(target);
        if (objDefOptions && !objDefOptions.scope) {
            console.log(`register @scope to default value(request), id=${objectDefinition.id}`);
            objectDefinition.scope = ScopeEnum.Request;
        }
    }

    /**
     *
     * @param exports exports
     */
    public bindClass(exports: any) {
        if (helper.isClass(exports) || helper.isFunction(exports)) {
            this.bindModule(exports);
        } else {
            // tslint:disable-next-line: forin
            for (const m in exports) {
                const module = exports[m];
                if (helper.isClass(module) || helper.isFunction(module)) {
                    this.bindModule(module);
                }
            }
        }
    }

    /**
     *
     * @param module module
     */
    protected bindModule(module: any) {
        if (helper.isClass(module)) {
            const metaData = Reflect.getMetadata(TAGGED_CLS, module) as TagClsMetadata;
            console.log('bindModule -> metaData', metaData);
            // Class name cannot be defined as 'default', or export default class {}
            if (metaData && metaData.id && !/^default\d/.test(metaData.originName)) {
                this.bind(metaData.id, module);
            }
        } else {
            const info: {
                id: ObjectIdentifier;
                provider: (context?: IApplicationContext) => any;
                scope?: Scope;
                isAutowire?: boolean;
            } = module[FUNCTION_INJECT_KEY];
            if (info && info.id) {
                if (!info.scope) {
                    info.scope = ScopeEnum.Request;
                }
                this.bind(info.id, module, {
                    scope: info.scope,
                    isAutowire: info.isAutowire
                });
            }
        }
    }

    /**
     * register
     */
    protected registerEachCreatedHook() {
        // register constructor inject
        this.beforeEachCreated((target, constructorArgs, context) => {
            let constructorMetaData;
            try {
                constructorMetaData = getClassMetadata(CLASS_KEY_CONSTRUCTOR, target);
            } catch (e) {
                console.log(`beforeEachCreated error ${e.stack}`);
            }

            // lack of field
            if (constructorMetaData && constructorArgs) {
                // tslint:disable-next-line: forin
                for (const idx in constructorMetaData) {
                    const index = parseInt(idx, 10);
                    const propertyMeta = constructorMetaData[index];
                    let result;

                    switch (propertyMeta.type) {
                        case 'config':
                            result = this.findHandlerHook(CONFIG_KEY)(propertyMeta.key);
                            break;
                    }
                    constructorArgs[index] = result;
                }
            }
        });

        // register property inject
        this.afterEachCreated((instance, context, definition) => {
            // 处理配置装饰器
            const configSetterProps: DecoratorMetadata[] = getClassMetadata(CONFIG_KEY, instance);
            this.defineGetterPropertyValue(configSetterProps, instance, this.findHandlerHook(CONFIG_KEY));
        });

    }
    /**
     * binding getter method for decorator
     * @param setterProps setterProps
     * @param instance instance
     * @param getterHandler getterHandler
     */
    private defineGetterPropertyValue(setterProps: DecoratorMetadata[], instance: any, getterHandler: any) {
        if (setterProps && getterHandler) {
            for (const prop of setterProps) {
                if (prop.propertyName) {
                    Object.defineProperty(instance, prop.propertyName, {
                        get: () => getterHandler(prop.key, instance),
                        configurable: false,
                        enumerable: true
                    });
                }
            }
        }
    }
}
