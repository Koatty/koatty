/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-26 11:58:09
 */
// tslint:disable-next-line: no-import-side-effect
// import 'reflect-metadata';
import { CONTROLLER_KEY, MIDDLEWARE_KEY } from './Constants';
import { saveClassMetadata, saveModule, scope, ScopeEnum, TAGGED_CLS, TagClsMetadata, initOrGetObjectDefProps, inject, getParamNames, INJECT_TAG, ObjectIdentifier } from "injection";
import * as helper from "think_lib";
import { tagParameter, tagProperty, Metadatas } from './Metadatas';

/**
 * 
 * @param target 
 * @param identifier 
 * @param index 
 */
function injectComponent(target: Function | any, identifier?: string) {
    if (Reflect.hasOwnMetadata(TAGGED_CLS, target)) {
        throw new Error("Cannot apply @Component/@Service/@Model decorator multiple times.");
    }

    if (!identifier) {
        identifier = target.name;
    }
    scope(ScopeEnum.Singleton)(target);
    // tslint:disable-next-line: no-object-literal-type-assertion
    Reflect.defineMetadata(TAGGED_CLS, {
        id: identifier,
        originName: target.name
    } as TagClsMetadata, target);
    // init property here
    initOrGetObjectDefProps(target);
}

/**
 * 
 * @param identifier 
 * @param index 
 */
export function Component(identifier?: any): any {
    console.log('Injectable: Component');

    if (helper.isFunction(identifier)) {
        const target = identifier;
        identifier = undefined;
        injectComponent(target, identifier);
        return target;
    } else {
        return (target: any) => {
            injectComponent(target, identifier);
        };
    }
}

/**
 * 
 * @param target 
 * @param path 
 */
function injectController(target: Function | any, path?: string) {
    saveModule(CONTROLLER_KEY, target);
    // tslint:disable-next-line: no-object-literal-type-assertion
    saveClassMetadata(CONTROLLER_KEY, path, target);
    scope(ScopeEnum.Request)(target);
}

/**
 * 
 * @param path 
 */
export function Controller(path?: any): any {
    console.log('Injectable: Controller');
    if (helper.isFunction(path)) {
        const target = path;
        path = undefined;
        injectController(target, path);
        return target;
    } else {
        return (target: any) => {
            injectController(target, path);
        };
    }
}
/**
 * 
 * @param target 
 * @param identifier 
 */
function injectMiddleware(target: Function | any, identifier?: string) {
    saveModule(MIDDLEWARE_KEY, target);
    if (!identifier) {
        identifier = target.name;
    }
    // tslint:disable-next-line: no-object-literal-type-assertion
    Reflect.defineMetadata(MIDDLEWARE_KEY, {
        id: identifier,
        originName: target.name
    } as TagClsMetadata, target);

}

/**
 * 
 * @param target 
 * @param identifier 
 */
export function Middleware(identifier?: any) {
    console.log('Injectable: Middleware');
    if (helper.isFunction(identifier)) {
        const target = identifier;
        identifier = undefined;
        injectMiddleware(target, identifier);
        return target;
    } else {
        return (target: any) => {
            injectMiddleware(target, identifier);
        };
    }
}

/**
 * 
 * @param target 
 * @param identifier 
 */
export function Service(identifier?: any) {
    console.log('Injectable: Service');
    if (helper.isFunction(identifier)) {
        const target = identifier;
        identifier = undefined;
        injectComponent(target, identifier);
        return target;
    } else {
        return (target: any) => {
            injectComponent(target, identifier);
        };
    }
}

function injectAutowired(target: any, identifier: any, targetKey: string, index?: number) {
    if (typeof index === 'number') {
        if (!identifier) {
            const args = getParamNames(target);
            if (target.length === args.length && index < target.length) {
                identifier = args[index];
            }
        }
        const metadata = new Metadatas(INJECT_TAG, identifier);
        tagParameter(target, targetKey, index, metadata);
    } else {
        if (!identifier) {
            identifier = targetKey;
        }
        const metadata = new Metadatas(INJECT_TAG, identifier);
        tagProperty(target, targetKey, metadata);
    }
}
/**
 * 
 * @param target 
 * @param identifier 
 */
export function Autowired(identifier?: any, index?: any): any {
    console.log('Injectable: Autowired');
    // console.log(helper.camelCase(index, { pascalCase: true }));

    if (helper.isObject(identifier)) {
        console.log(111111111111111, identifier, index);
        const target = identifier;
        identifier = index;
        // identifier = identifier && helper.camelCase(index, { pascalCase: true });
        injectAutowired(target, identifier, identifier);
        return target;
    } else {
        console.log(2222222222222222, identifier, index);
        return (target: any) => {
            return injectAutowired(target, identifier, target.name, index);
        };
    }
}
