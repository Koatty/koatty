/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-10 11:32:45
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
// import * as helper from "think_lib";
import { IOCContainer } from 'think_container';
import { CONTROLLER_ROUTER } from "./Constants";

/**
 * Indicates that an decorated class is a "component".
 *
 * @export
 * @param {string} [identifier] component name
 * @returns {ClassDecorator}
 */
export function Component(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("COMPONENT", target, identifier);
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
        const identifier = IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("CONTROLLER", target, identifier);
        IOCContainer.savePropertyData(CONTROLLER_ROUTER, path, target, identifier);
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
        identifier = identifier || IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("MIDDLEWARE", target, identifier);
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
        identifier = identifier || IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("SERVICE", target, identifier);
    };
}
