/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-16 17:16:50
 */
import { Scope, CompomentType } from './Constants';

/**
 * 对象定义存储容器
 */
export interface IContainer {
    reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    get<T>(identifier: string): T;
    // tslint:disable-next-line: unified-signatures
    get<T>(identifier: string, type?: CompomentType): T;
}

export interface ObjectDefinitionOptions {
    isAsync?: boolean;
    initMethod?: string;
    destroyMethod?: string;
    scope?: Scope;
}

export interface TagClsMetadata {
    id: string;
    originName: string;
}

export interface TagPropsMetadata {
    key: string | number | symbol;
    value: any;
}

export interface ReflectResult {
    [key: string]: TagPropsMetadata[];
}
