/*
 * @Description: component interface
 * @Usage: 
 * @Author: richen
 * @Date: 2023-12-09 21:56:32
 * @LastEditTime: 2024-01-04 07:43:03
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */

// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Middleware as KoaMiddleware, Next } from "koa";
import { Koatty, KoattyContext, KoattyNext } from 'koatty_core';
import { CONTROLLER_ROUTER } from "koatty_serve";
import { IAspect, IOCContainer } from "koatty_container";
import { Helper } from "koatty_lib";


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
 * Interface for Controller
 */
export interface IController {
  readonly app: Koatty;
  readonly ctx: KoattyContext;

  // new(ctx: KoattyContext, ...arg: any[]): IController;
  // init(...arg: any[]): void;
  // ok(msg: string | ApiInput, data?: any, code?: number): Promise<ApiOutput>;
  // fail(msg: Error | string | ApiInput, data?: any, code?: number): void;
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
export interface KoattyMiddleware extends KoaMiddleware { }

/**
 * Interface for Middleware
 */
export interface IMiddleware {
  run: (options: any, app: Koatty) => (ctx: KoattyContext, next: Next) => Promise<any>;
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

  // init(...arg: any[]): void;
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

/**
 * check is implements Middleware Interface
 * @param cls 
 * @returns 
 */
export function implementsMiddlewareInterface(cls: any): cls is IMiddleware {
  return 'run' in cls && Helper.isFunction(cls.run);
}

/**
 * check is implements Controller Interface
 * @param cls 
 * @returns 
 */
export function implementsControllerInterface(cls: any): cls is IController {
  return 'app' in cls && 'ctx' in cls;
}

/**
 * check is implements Service Interface
 * @param cls 
 * @returns 
 */
export function implementsServiceInterface(cls: any): cls is IService {
  return 'app' in cls;
}

/**
 * check is implements Plugin Interface
 * @param cls 
 * @returns 
 */
export function implementsPluginInterface(cls: any): cls is IPlugin {
  return 'run' in cls && Helper.isFunction(cls.run);
}

/**
 * check is implements Aspect Interface
 * @param cls 
 * @returns 
 */
export function implementsAspectInterface(cls: any): cls is IAspect {
  return 'app' in cls && 'run' in cls && Helper.isFunction(cls.run);
}