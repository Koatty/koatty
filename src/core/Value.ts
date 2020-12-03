/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-11 15:07:28
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import { Logger } from "../util/Logger";
import { recursiveGetMetadata } from "../util/Lib";
import { Container, IOCContainer, TAGGED_ARGS } from "koatty_container";

/**
 * Indicates that an decorated configuration as a property.
 *
 * @export
 * @param {string} identifier configuration key
 * @param {string} [type] configuration type
 * @returns {PropertyDecorator}
 */
export function Value(key: string, type?: string): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        // ###############
        // PropertyDecorator is executed before ClassDecorator, resulting in that componentType cannot be obtained here...
        // ###############
        // const componentType = IOCContainer.getType(target);
        // if (componentType === "MIDDLEWARE") {
        //     throw Error("Value decorator cannot be used in the middleware class. Please use app.config() to get the configuration.");
        // }

        // identifier = identifier || helper.camelCase(propertyKey, { pascalCase: true });
        key = key || propertyKey;
        IOCContainer.savePropertyData(TAGGED_ARGS, `${key || ""}|${type || "config"}`, target, propertyKey);
    };
}
/**
 * Indicates that an decorated configuration as a property.
 *
 * @export
 * @param {string} identifier configuration key
 * @param {string} [type] configuration type
 * @returns {PropertyDecorator}
 */
export const Config = Value;

/**
 *
 *
 * @export
 * @param {*} target
 * @param {*} instance
 * @param {Container} container
 */
export function injectValue(target: any, instance: any, container: Container) {
    // const componentType = IOCContainer.getType(target);
    // if (componentType === "MIDDLEWARE") {
    //     throw Error("Value decorator cannot be used in the middleware class. Please use app.config() to get the configuration.");
    // }
    const metaData = recursiveGetMetadata(TAGGED_ARGS, target);
    const app = container.getApp();
    // tslint:disable-next-line: forin
    for (const metaKey in metaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && Logger.Custom("think", "", `Register inject ${IOCContainer.getIdentifier(target)} config key: ${metaKey} => value: ${metaData[metaKey]}`);
        const propKeys = metaData[metaKey].split("|");
        const [propKey, type] = propKeys;
        Reflect.defineProperty(instance, metaKey, {
            enumerable: true,
            configurable: false,
            writable: true,
            value: app.config(propKey, type)
        });
    }
}