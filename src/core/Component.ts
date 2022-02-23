/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-10 11:32:45
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Koatty, KoattyContext, KoattyNext } from 'koatty_core';
import { CONTROLLER_ROUTER } from "koatty_router";
import { IOCContainer } from "koatty_container";

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
 * Interface for Api output
 */
export interface ApiOutput {
    code: number; // 错误码
    message: string; // 消息内容
    data: any; // 数据
}

/**
 * Interface for Api input
 */
export interface ApiInput {
    code?: number; // 错误码
    message?: string; // 消息内容
    data?: any; // 数据
}

/**
 * Interface for Controller
 */
export interface IController {
    readonly app: Koatty;
    readonly ctx: KoattyContext;

    __befor?: () => Promise<any>;
    __after?: () => Promise<any>;
    readonly fail: (msg?: Error | string | ApiInput, data?: any, ret?: number) => Promise<any>;
    readonly ok: (msg?: string | ApiInput, data?: any, ret?: number) => Promise<any>;
}

/**
 * Indicates that an decorated class is a "middleware".
 *
 * @export
 * @param {string} [identifier] class name
 * @returns {ClassDecorator}
 */
export function Middleware(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("MIDDLEWARE", target, identifier);
    };
}

/**
 * Interface for Middleware
 */
export type KoattyMiddleware = (ctx: KoattyContext, next: KoattyNext) => Promise<any>;

/**
 * Interface for Middleware
 */
export interface IMiddleware {
    run: (options: any, app: Koatty) => KoattyMiddleware;
}

/**
 * Indicates that an decorated class is a "service".
 *
 * @export
 * @param {string} [identifier] class name
 * @returns {ClassDecorator}
 */
export function Service(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || IOCContainer.getIdentifier(target);
        IOCContainer.saveClass("SERVICE", target, identifier);
    };
}

/**
 * Interface for Service
 */
export interface IService {
    readonly app: Koatty;
}

/**
 * Indicates that an decorated class is a "plugin".
 *
 * @export
 * @param {string} [identifier] class name
 * @returns {ClassDecorator}
 */
export function Plugin(identifier?: string): ClassDecorator {
    return (target: any) => {
        identifier = identifier || IOCContainer.getIdentifier(target);
        // 
        if (!identifier.endsWith("Plugin")) {
            throw Error("Plugin class name must be 'Plugin' suffix.");
        }
        IOCContainer.saveClass("COMPONENT", target, `${identifier}`);
    };
}

/**
 * Interface for Plugin
 */
export interface IPlugin {
    run: (options: any, app: Koatty) => Promise<any>;
}
