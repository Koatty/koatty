/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-27 15:00:50
 */
export type Scope = 'Singleton' | 'Request' | 'Prototype';
/**
 * 对象定义存储容器
 */
export interface IContainer {
    registry<T>(target: T, options?: ObjectDefinitionOptions): T;
    registry<T>(identifier: string, target: T, options?: ObjectDefinitionOptions): T;
    isAsync(identifier: string): boolean;
    get<T>(identifier: string, args?: any): T;
    getAsync<T>(identifier: string, args?: any): Promise<T>;
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