/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-07 09:32:55
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { saveModule, getIdentifier, savePropertyData } from "./Injectable";
import { CONTROLLER_KEY, COMPONENT_KEY, MIDDLEWARE_KEY, NAMED_TAG, SERVICE_KEY } from "./Constants";

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
