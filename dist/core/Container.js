"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injection_1 = require("injection");
const Constants_1 = require("./Constants");
const debug = require('debug')('koatty:Container');
const helper = require('think_lib');
class IOContainer extends injection_1.Container {
    constructor(baseDir = process.cwd(), parent = undefined) {
        super(baseDir, parent);
    }
    init() {
        this.handlerMap = new Map();
        super.init();
        this.registerEachCreatedHook();
    }
    findHandlerHook(hookKey) {
        if (this.handlerMap.has(hookKey)) {
            return this.handlerMap.get(hookKey);
        }
        if (this.parent) {
            return this.parent.findHandlerHook(hookKey);
        }
    }
    registerDataHandler(handlerType, handler) {
        this.handlerMap.set(handlerType, handler);
    }
    registerCustomBinding(objectDefinition, target) {
        super.registerCustomBinding(objectDefinition, target);
        const objDefOptions = injection_1.getObjectDefinition(target);
        if (objDefOptions && !objDefOptions.scope) {
            debug(`register @scope to default value(request), id=${objectDefinition.id}`);
            objectDefinition.scope = injection_1.ScopeEnum.Request;
        }
    }
    bindClass(exports) {
        console.log('bindClass.exports', exports, helper.isClass(exports), helper.isFunction(exports));
        if (helper.isClass(exports) || helper.isFunction(exports)) {
            this.bindModule(exports);
        }
        else {
            for (const m in exports) {
                const module = exports[m];
                console.log('bindClass.module', module.name, helper.isClass(module), helper.isFunction(module));
                if (helper.isClass(module) || helper.isFunction(module)) {
                    console.log('bindClass.module', module);
                }
            }
        }
    }
    bindModule(module) {
        if (helper.isClass(module)) {
            console.log(11111111111111111111);
            const providerId = injection_1.getProviderId(module);
            if (providerId) {
                this.bind(providerId, module);
            }
        }
        else {
            console.log(2222222222222222);
            const info = module[Constants_1.FUNCTION_INJECT_KEY];
            if (info && info.id) {
                if (!info.scope) {
                    info.scope = injection_1.ScopeEnum.Request;
                }
                this.bind(info.id, module, {
                    scope: info.scope,
                    isAutowire: info.isAutowire
                });
            }
        }
    }
    registerEachCreatedHook() {
        this.beforeEachCreated((target, constructorArgs, context) => {
            let constructorMetaData;
            try {
                constructorMetaData = injection_1.getClassMetadata(Constants_1.CLASS_KEY_CONSTRUCTOR, target);
            }
            catch (e) {
                debug(`beforeEachCreated error ${e.stack}`);
            }
            if (constructorMetaData && constructorArgs) {
                for (const idx in constructorMetaData) {
                    const index = parseInt(idx, 10);
                    const propertyMeta = constructorMetaData[index];
                    let result;
                    switch (propertyMeta.type) {
                        case 'config':
                            result = this.findHandlerHook(Constants_1.CONFIG_KEY)(propertyMeta.key);
                            break;
                    }
                    constructorArgs[index] = result;
                }
            }
        });
        this.afterEachCreated((instance, context, definition) => {
            const configSetterProps = injection_1.getClassMetadata(Constants_1.CONFIG_KEY, instance);
            this.defineGetterPropertyValue(configSetterProps, instance, this.findHandlerHook(Constants_1.CONFIG_KEY));
        });
    }
    defineGetterPropertyValue(setterProps, instance, getterHandler) {
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
exports.IOContainer = IOContainer;
//# sourceMappingURL=Container.js.map