/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-08 14:46:22
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import { Context } from 'koa';
import * as helper from "think_lib";
import * as logger from "think_logger";
import { saveModule, saveClassMetadata, savePropertyDataToClass, getIdentifier } from "./Injectable";
import { CONTROLLER_KEY, COMPONENT_KEY, TAGGED_PROP, TAGGED_CLS, TAGGED_ARGS, MIDDLEWARE_KEY, NAMED_TAG } from './Constants';

export function Component(identifier?: any): ClassDecorator {
    return (target: any) => {
        saveModule(COMPONENT_KEY, target, identifier);
        saveClassMetadata(COMPONENT_KEY, TAGGED_CLS, identifier, target);
    };
}
export function Autowired(identifier?: any): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        savePropertyDataToClass(TAGGED_PROP, identifier, target, propertyKey);
    };
}
export function Controller(path?: any): ClassDecorator {
    return (target: any) => {
        saveModule(CONTROLLER_KEY, target);
        const identifier = getIdentifier(target);
        saveClassMetadata(CONTROLLER_KEY, TAGGED_CLS, identifier, target);
        savePropertyDataToClass(NAMED_TAG, path, target, identifier);
    };
}
export function Middleware(identifier?: any): ClassDecorator {
    return (target: any) => {
        saveModule(MIDDLEWARE_KEY, target);
        saveClassMetadata(MIDDLEWARE_KEY, TAGGED_CLS, identifier, target);
    };
}
export function Service(identifier?: any): ClassDecorator {
    return (target: any) => {
        saveModule(COMPONENT_KEY, target, identifier);
        saveClassMetadata(COMPONENT_KEY, TAGGED_CLS, identifier, target);
    };
}
export function Value(identifier: string, type?: string): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        savePropertyDataToClass(TAGGED_ARGS, `${identifier || ''}|${type || 'config'}`, target, propertyKey);
    };
}
