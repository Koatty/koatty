/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-30 15:01:22
 */
export type Scope = 'Singleton' | 'Request' | 'Prototype';
/**
 * 对象定义存储容器
 */
export interface IContainer {
    reg<T>(target: T, options?: ObjectDefinitionOptions): T;
    reg<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    get<T>(identifier: string): T;
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
