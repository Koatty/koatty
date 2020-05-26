/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-20 14:41:56
 */
// tslint:disable-next-line: no-implicit-dependencies
import * as Koa from "koa";
import { Koatty } from "../Koatty";


export interface IController {
    app: Koatty;
    ctx: Koa.Context;

    __before: () => Promise<any>;
    __after: () => Promise<any>;
    readonly body: (data: any, contentType?: string, encoding?: string) => Promise<any>;
    readonly deny: (code?: number) => void;
    readonly expires: (timeout: number) => void;
    readonly fail: (msg?: Error | string, data?: any, code?: number) => Promise<any>;
    readonly header: (name: string, value?: any) => any;
    readonly json: (data: any) => Promise<any>;
    readonly isGet: () => boolean;
    readonly isMethod: (method: string) => boolean;
    readonly isPost: () => boolean;
    readonly ok: (msg?: string, data?: any, code?: number) => Promise<any>;
    readonly param: (name?: string) => any;
    readonly redirect: (urls: string, alt?: string) => void;
    readonly type: (contentType?: string, encoding?: string | boolean) => string;
}