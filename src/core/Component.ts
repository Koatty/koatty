/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-07 09:26:46
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { saveModule, getIdentifier, savePropertyData } from "./Injectable";
import { CONTROLLER_KEY, COMPONENT_KEY, TAGGED_PROP, TAGGED_ARGS, MIDDLEWARE_KEY, NAMED_TAG, SERVICE_KEY, CompomentType } from "./Constants";
import * as helper from "think_lib";

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
    };
}

/**
 * Indicates that an decorated class is a "controller".
 *
 * @export
 * @param {string} [path] controller router path
 * @returns {ClassDecorator}
 */
export function Controller(path = ""): ClassDecorator {
    return (target: any) => {
        const identifier = getIdentifier(target);
        saveModule(CONTROLLER_KEY, target, identifier);
        savePropertyData(NAMED_TAG, path, target, identifier);
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
        saveModule(MIDDLEWARE_KEY, target, identifier);
    };
}

/**
 * Indicates that an decorated class is a "service".
 *
 * @export
 * @param {string} [identifier] middleware name
 * @returns {ClassDecorator}
 */
export function Service(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || getIdentifier(target);
        saveModule(SERVICE_KEY, target, identifier);
    };
}

/**
 * Marks a constructor method as to be autowired by Koatty"s dependency injection facilities.
 *
 * @export
 * @param {string} [identifier]
 * @param {CompomentType} [type]
 * @param {any[]} [constructArgs]
 * @param {boolean} [isDelay=false]
 * @returns {PropertyDecorator}
 */
export function Autowired(identifier?: string, type?: CompomentType, constructArgs?: any[], isDelay = false): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const designType = Reflect.getMetadata("design:type", target, propertyKey);
        if (!identifier) {
            if (!designType || designType.name === "Object") {
                // throw Error("identifier cannot be empty when circular dependency exists");
                identifier = helper.camelCase(propertyKey, { pascalCase: true });
            } else {
                identifier = designType.name;
            }
        }
        if (!identifier) {
            throw Error("identifier cannot be empty when circular dependency exists");
        }
        if (type === undefined) {
            if (identifier.indexOf("Controller") > -1) {
                type = "CONTROLLER";
            } else if (identifier.indexOf("Middleware") > -1) {
                type = "MIDDLEWARE";
            } else if (identifier.indexOf("Service") > -1) {
                type = "SERVICE";
            } else {
                type = "COMPONENT";
            }
        }
        //Cannot rely on injection controller
        if (type === "CONTROLLER") {
            throw new Error(`Controller cannot be injection!`);
        }
        //Cannot rely on injection middleware
        // if (type === "MIDDLEWARE") {
        //     throw new Error(`Middleware ${identifier || ""} cannot be injected!`);
        // }

        if (!designType || designType.name === "Object") {
            isDelay = true;
        }

        savePropertyData(TAGGED_PROP, {
            type,
            identifier,
            delay: isDelay,
            args: constructArgs || []
        }, target, propertyKey);
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
        savePropertyData(TAGGED_ARGS, `${identifier || ""}|${type || "config"}`, target, propertyKey);
    };
}

/**
 * Indicates that an decorated configuations as a property.
 *
 * @export
 * @param {string} identifier
 * @param {string} [type]
 * @returns {PropertyDecorator}
 */
export function Config(identifier: string, type?: string): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const designType = Reflect.getMetadata("design:type", target, propertyKey);
        // identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        identifier = identifier || propertyKey;
        savePropertyData(TAGGED_ARGS, `${identifier || ""}|${type || "config"}`, target, propertyKey);
    };
}
