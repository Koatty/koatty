/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-04 15:26:58
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import { saveModule, saveClassMetadata, savePropertyDataToClass, getIdentifier } from "./Injectable";
import { CONTROLLER_KEY, COMPONENT_KEY, TAGGED_PROP, TAGGED_CLS, TAGGED_ARGS, MIDDLEWARE_KEY, NAMED_TAG, SERVICE_KEY, CompomentType } from './Constants';
import { helper } from '..';

/**
 * Indicates that an decorated class is a "component".
 *
 * @export
 * @param {string} [identifier] component name
 * @returns {ClassDecorator}
 */
export function Component(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || getIdentifier(target);
        saveModule(COMPONENT_KEY, target, identifier);
        saveClassMetadata(COMPONENT_KEY, TAGGED_CLS, identifier, target);
    };
}

/**
 * Indicates that an decorated class is a "controller".
 *
 * @export
 * @param {string} [path] controller router path
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
 * Indicates that an decorated class is a "middleware".
 *
 * @export
 * @param {string} [identifier] middleware name
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
 * Indicates that an decorated class is a "middleware".
 *
 * @export
 * @param {string} [identifier] middleware name
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
 * Marks a constructor method as to be autowired by Koatty's dependency injection facilities.
 *
 * @export
 * @param {string} [identifier] injection name
 * @param {(CompomentType | any[])} [type] compomentType
 * @param {any[]} [constructArgs] constructor args
 * @returns {PropertyDecorator}
 */
export function Autowired(identifier?: string, type?: CompomentType, constructArgs?: any[]): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const designType = Reflect.getMetadata('design:type', target, propertyKey);
        if (!designType && !identifier) {
            // throw Error("identifier cannot be empty when circular dependency exists");
            identifier = helper.camelCase(propertyKey, { pascalCase: true });
        } else {
            identifier = identifier || designType.name;
        }
        if (type === undefined) {
            if (identifier.indexOf('Controller') > -1) {
                type = 'CONTROLLER';
            } else if (identifier.indexOf('Model') > -1) {
                type = 'COMPONENT';
            } else {
                type = 'SERVICE';
            }
        }

        if (!designType) {
            savePropertyDataToClass(TAGGED_PROP, {
                type,
                identifier,
                delay: true,
                args: constructArgs || []
            }, target, propertyKey);
        } else {
            savePropertyDataToClass(TAGGED_PROP, {
                type,
                identifier,
                delay: false,
                args: constructArgs || []
            }, target, propertyKey);
        }
    };
}

/**
 * Indicates that an decorated configuations as a property.
 *
 * @export
 * @param {string} identifier configuations key
 * @param {string} [type] configuations type
 * @returns {PropertyDecorator}
 */
export function Value(identifier: string, type?: string): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        // identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        identifier = identifier || propertyKey;
        savePropertyDataToClass(TAGGED_ARGS, `${identifier || ''}|${type || 'config'}`, target, propertyKey);
    };
}
