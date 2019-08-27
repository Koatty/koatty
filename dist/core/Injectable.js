"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const Constants_1 = require("./Constants");
const injection_1 = require("injection");
const helper = require("think_lib");
function InjectClass(target) {
    const depends = Reflect.getOwnMetadataKeys(target).filter((meta) => 'design:paramtypes' !== meta);
    console.log(depends);
}
exports.InjectClass = InjectClass;
function attachConstructorDataOnClass(identifier, clz, type, index) {
    if (!identifier) {
        const args = injection_1.getParamNames(clz);
        if (clz.length === args.length && index < clz.length) {
            identifier = args[index];
        }
    }
    let constructorMetaValue = injection_1.getClassMetadata(Constants_1.CLASS_KEY_CONSTRUCTOR, clz);
    if (!constructorMetaValue) {
        constructorMetaValue = {};
    }
    constructorMetaValue[index] = {
        key: identifier,
        type
    };
    injection_1.saveClassMetadata(Constants_1.CLASS_KEY_CONSTRUCTOR, constructorMetaValue, clz);
}
exports.attachConstructorDataOnClass = attachConstructorDataOnClass;
function Component(target, identifier, index) {
    console.log('metadata Component');
    return (target) => {
        console.log('Component', target, identifier, index);
        if (Reflect.hasOwnMetadata(injection_1.TAGGED_CLS, target)) {
            throw new Error("Cannot apply @Component decorator multiple times.");
        }
        injection_1.scope(injection_1.ScopeEnum.Singleton)(target);
        injection_1.saveClassMetadata(Constants_1.PRIORITY_KEY, index, target);
        if (!identifier) {
            identifier = helper.camelCase(target.name);
        }
        Reflect.defineMetadata(injection_1.TAGGED_CLS, {
            id: identifier,
            originName: target.name
        }, target);
        injection_1.initOrGetObjectDefProps(target);
    };
}
exports.Component = Component;
function Controller(target, path, index) {
    console.log('metadata Controller');
    return (target, targetKey, index) => {
        console.log(target);
        injection_1.saveModule(Constants_1.CONTROLLER_KEY, target);
        injection_1.saveClassMetadata(Constants_1.CONTROLLER_KEY, { path, index }, target);
        injection_1.scope(injection_1.ScopeEnum.Request)(target);
        injection_1.saveClassMetadata(Constants_1.PRIORITY_KEY, index, target);
    };
}
exports.Controller = Controller;
function Middleware(target, identifier) {
    console.log('metadata Middleware');
}
exports.Middleware = Middleware;
function Service(target, identifier) {
    console.log('metadata Service');
}
exports.Service = Service;
function Autowired(target, identifier) {
    console.log('metadata Autowired');
}
exports.Autowired = Autowired;
function Config(identifier) {
    console.log(identifier);
    return (target, targetKey, index) => {
        console.log(target, ':', targetKey, index);
        if (typeof index === 'number') {
            attachConstructorDataOnClass(identifier, target, Constants_1.CONFIG_KEY, index);
        }
        else {
            if (!identifier) {
                identifier = targetKey;
            }
            injection_1.attachClassMetadata(Constants_1.CONFIG_KEY, {
                key: identifier,
                propertyName: targetKey
            }, target);
        }
    };
}
exports.Config = Config;
//# sourceMappingURL=Injectable.js.map