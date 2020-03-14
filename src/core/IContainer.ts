/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-14 13:48:03
 */
import { Koatty } from '../Koatty';
import { Scope, CompomentType } from "./Constants";


/**
 * Container interface
 *
 * @export
 * @interface IContainer
 */
export interface IContainer {
    setApp(app: Koatty): void;
    reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    get(identifier: string, type?: CompomentType, args?: any[]): object;
    getClass(identifier: string, type?: CompomentType): object;
    getInsByClass<T>(target: T, args?: any[]): T;
    getMetadataMap(metadataKey: string | symbol, target: any, propertyKey?: string | symbol): any;
    getIdentifier(target: Function): string;
    getType(target: Function): string;
    saveClass(key: string, module: Function, identifier: string): void;
    listClass(key: string): any[];
    saveClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName?: string): void;
    attachClassMetadata(type: string, decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName?: string): void;
    getClassMetadata(type: string, decoratorNameKey: string | symbol, target: Function | object, propertyName?: string): any;
    savePropertyData(decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName: string | symbol): void;
    attachPropertyData(decoratorNameKey: string | symbol, data: any, target: Function | object, propertyName: string | symbol): void;
    getPropertyData(decoratorNameKey: string | symbol, target: Function | object, propertyName: string | symbol): any;
    listPropertyData(decoratorNameKey: string | symbol, target: Function | object): any[];
}


/**
 * BeanFactory object interface
 *
 * @export
 * @interface ObjectDefinitionOptions
 */
export interface ObjectDefinitionOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
    type: CompomentType;
    args: any[];
}

/**
 *
 *
 * @export
 * @interface TagClsMetadata
 */
export interface TagClsMetadata {
    id: string;
    originName: string;
}

/**
 *
 *
 * @export
 * @interface TagPropsMetadata
 */
export interface TagPropsMetadata {
    key: string | number | symbol;
    value: any;
}

/**
 *
 *
 * @export
 * @interface ReflectResult
 */
export interface ReflectResult {
    [key: string]: TagPropsMetadata[];
}
