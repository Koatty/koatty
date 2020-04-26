/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-04-26 11:37:39
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import * as logger from "think_logger";
import { recursiveGetMetadata } from "../util/Lib";
import { Container, IOCContainer } from "./Container";
import { TAGGED_PROP, CompomentType } from "./Constants";


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
                identifier = helper.camelCase(propertyKey, true);
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

        IOCContainer.savePropertyData(TAGGED_PROP, {
            type,
            identifier,
            delay: isDelay,
            args: constructArgs || []
        }, target, propertyKey);
    };
}

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 * @param {boolean} [isLazy=false]
 */
export function injectAutowired(target: any, instance: any, container: Container, isLazy = false) {
    const metaData = recursiveGetMetadata(TAGGED_PROP, target);

    // tslint:disable-next-line: forin
    for (const metaKey in metaData) {
        let dep;
        const { type, identifier, delay, args } = metaData[metaKey] || { type: "", identifier: "", delay: false, args: [] };
        if (type && identifier) {
            if (!delay || isLazy) {
                dep = container.get(identifier, type, args);
                if (dep) {
                    // tslint:disable-next-line: no-unused-expression
                    process.env.APP_DEBUG && logger.custom("think", "", `Register inject ${target.name} properties key: ${metaKey} => value: ${JSON.stringify(metaData[metaKey])}`);
                    Reflect.defineProperty(instance, metaKey, {
                        enumerable: true,
                        configurable: false,
                        writable: true,
                        value: dep
                    });
                } else {
                    throw new Error(`Component ${metaData[metaKey].identifier || ""} not found. It's autowired in class ${target.name}`);
                }
            } else {
                // Delay loading solves the problem of cyclic dependency
                const app = container.getApp();
                // tslint:disable-next-line: no-unused-expression
                app && app.once("appStart", () => {
                    // lazy inject autowired
                    injectAutowired(target, instance, container, true);
                });
            }
        }
    }
}
