/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-17 14:22:24
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import { saveModule, saveClassMetadata, savePropertyDataToClass, getIdentifier, getMethodNames } from "./Injectable";
import { CONTROLLER_KEY, COMPONENT_KEY, TAGGED_PROP, TAGGED_CLS, TAGGED_ARGS, MIDDLEWARE_KEY, NAMED_TAG, SERVICE_KEY, CompomentType } from './Constants';

/**
 *
 *
 * @export
 * @param {string} [identifier]
 * @returns {ClassDecorator}
 */
export function Component(identifier?: string): ClassDecorator {
    return (target: any) => {
        saveModule(COMPONENT_KEY, target, identifier);
        saveClassMetadata(COMPONENT_KEY, TAGGED_CLS, identifier, target);
    };
}

/**
 *
 *
 * @export
 * @param {string} [path]
 * @returns {ClassDecorator}
 */
export function Controller(path?: string): ClassDecorator {
    return (target: any) => {
        saveModule(CONTROLLER_KEY, target);
        const identifier = getIdentifier(target);
        saveClassMetadata(CONTROLLER_KEY, TAGGED_CLS, identifier, target);
        savePropertyDataToClass(NAMED_TAG, path, target, identifier);
    };
}

/**
 *
 *
 * @export
 * @param {string} [identifier]
 * @returns {ClassDecorator}
 */
export function Middleware(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || getIdentifier(target);
        saveModule(MIDDLEWARE_KEY, target);
        saveClassMetadata(MIDDLEWARE_KEY, TAGGED_CLS, identifier, target);
    };
}

/**
 *
 *
 * @export
 * @param {string} [identifier]
 * @returns {ClassDecorator}
 */
export function Service(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || getIdentifier(target);
        saveModule(SERVICE_KEY, target, identifier);
        saveClassMetadata(SERVICE_KEY, TAGGED_CLS, identifier, target);
    };
}

/**
 *
 *
 * @export
 * @param {string} [identifier]
 * @param {CompomentType} [type]
 * @returns {PropertyDecorator}
 */
export function Autowired(identifier?: string, type?: CompomentType): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const designType = Reflect.getMetadata('design:type', target, propertyKey);
        identifier = identifier || designType.name;
        if (type === undefined) {
            if (identifier.indexOf('Controller') > -1) {
                type = 'CONTROLLER';
            } else if (identifier.indexOf('Model') > -1) {
                type = 'COMPONENT';
            } else {
                type = 'SERVICE';
            }
        }
        savePropertyDataToClass(TAGGED_PROP, `${type}:${identifier}`, target, propertyKey);
    };
}

/**
 *
 *
 * @export
 * @param {string} identifier
 * @param {string} [type]
 * @returns {PropertyDecorator}
 */
export function Value(identifier: string, type?: string): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        // identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        identifier = identifier || propertyKey;
        savePropertyDataToClass(TAGGED_ARGS, `${identifier || ''}|${type || 'config'}`, target, propertyKey);
    };
}
