/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-28 11:31:05
 */
import { Scope, CompomentType } from "./Constants";


/**
 * Container interface
 *
 * @export
 * @interface IContainer
 */
export interface IContainer {
    reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    get(identifier: string): object;
    // tslint:disable-next-line: unified-signatures
    get(identifier: string, type?: CompomentType, args?: any[]): object;
}


/**
 * IOC object interface
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
