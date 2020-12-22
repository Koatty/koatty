/*
 * @Author: richen
 * @Date: 2020-12-18 10:37:03
 * @LastEditors: linyyyang<linyyyang@tencent.com>
 * @LastEditTime: 2020-12-21 17:34:27
 * @License: BSD (3-Clause)
 * @Copyright (c) - <richenlin(at)gmail.com>
 */
import { DefaultLogger as logger } from "koatty_logger";
import { Container, IOCContainer } from "koatty_container";
import { TAGGED_ARGS } from "./Constants";
import { RecursiveGetMetadata } from "../util/Helper";

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
    const app = container.getApp();
    if (!app) {
        return;
    }
    const metaData = RecursiveGetMetadata(TAGGED_ARGS, target);

    // tslint:disable-next-line: forin
    for (const metaKey in metaData) {
        // tslint:disable-next-line: no-unused-expression
        process.env.APP_DEBUG && logger.Custom("think", "", `Register inject ${IOCContainer.getIdentifier(target)} config key: ${metaKey} => value: ${metaData[metaKey]}`);
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