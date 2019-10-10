/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-10 16:33:28
 */
import * as helper from "think_lib";
import { attachClassMetadata } from "./Injectable";
import { PATH_METADATA, METHOD_METADATA, ROUTER_NAME_METADATA, ROUTER_KEY, PARAM } from "./Constants";

export interface RouterOption {
    path?: string;
    requestMethod: string;
    routerName?: string;
    method: string;
}

export const RequestMethod = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
    PATCH: "patch",
    ALL: "all",
    OPTIONS: "options",
    HEAD: "head"
};

const defaultMetadata = {
    [PATH_METADATA]: '/',
    [METHOD_METADATA]: RequestMethod.GET,
    [ROUTER_NAME_METADATA]: ''
};

export interface RequestMappingMetadata {
    [PATH_METADATA]?: string;
    [METHOD_METADATA]: string;
    [ROUTER_NAME_METADATA]?: string;
}

export const RequestMapping = (
    metadata: RequestMappingMetadata = defaultMetadata
): MethodDecorator => {
    const path = metadata[PATH_METADATA] || '';
    const requestMethod = metadata[METHOD_METADATA] || RequestMethod.GET;
    const routerName = metadata[ROUTER_NAME_METADATA] || '';

    return (target, key: string, descriptor: PropertyDescriptor) => {
        // tslint:disable-next-line: no-object-literal-type-assertion
        attachClassMetadata(ROUTER_KEY, key, {
            path,
            requestMethod,
            routerName,
            method: key
        } as RouterOption, target);

        return descriptor;
    };
};

const createMappingDecorator = (method: string) => (
    path: string,
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping({
        [PATH_METADATA]: path,
        [METHOD_METADATA]: method,
        [ROUTER_NAME_METADATA]: routerOptions.routerName
    });
};

/**
 * Routes HTTP POST requests to the specified path.
 */
export const Post = createMappingDecorator(RequestMethod.POST);

/**
 * Routes HTTP GET requests to the specified path.
 */
export const Get = createMappingDecorator(RequestMethod.GET);

/**
 * Routes HTTP DELETE requests to the specified path.
 */
export const Del = createMappingDecorator(RequestMethod.DELETE);

/**
 * Routes HTTP PUT requests to the specified path.
 */
export const Put = createMappingDecorator(RequestMethod.PUT);

/**
 * Routes HTTP PATCH requests to the specified path.
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);

/**
 * Routes HTTP OPTIONS requests to the specified path.
 */
export const Options = createMappingDecorator(RequestMethod.OPTIONS);

/**
 * Routes HTTP HEAD requests to the specified path.
 */
export const Head = createMappingDecorator(RequestMethod.HEAD);

/**
 * Routes all HTTP requests to the specified path.
 */
export const All = createMappingDecorator(RequestMethod.ALL);


/**
 * 
 * @param fn 
 */
const Inject = (fn: Function) => {
    return (target: any, propertyKey: string, descriptor: any) => {
        // 获取成员类型
        // const type = Reflect.getMetadata('design:type', target, propertyKey);
        // 获取成员参数类型
        const paramtypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
        // 获取成员返回类型
        // const returntype = Reflect.getMetadata('design:returntype', target, propertyKey);
        // 获取所有元数据 key (由 TypeScript 注入)
        // const keys = Reflect.getMetadataKeys(target, propertyKey);

        attachClassMetadata(PARAM, propertyKey, {
            name: propertyKey,
            fn,
            index: descriptor,
            type: (paramtypes[descriptor] && paramtypes[descriptor].name ? paramtypes[descriptor].name : '').toLowerCase()
        }, target);
        return descriptor;
    };

};
/**
 * 
 * @param param 
 * @param type 
 */
const convertParamsType = (param: any, type: string) => {
    switch (type) {
        case 'object':
        case 'enum':
            return param;
        case 'number':
            return helper.toNumber(param);
        case 'boolean':
            return !!param;
        case 'array':
        case 'tuple':
            return helper.toArray(param);
        case 'string':
        default:
            return helper.toString(param);

    }
};

/**
 * get request.body
 *
 * @export
 * @returns
 */
export function Body() {
    return Inject((ctx: any) => convertParamsType(ctx.request.body, 'object'));
}

/**
 * get post body/querystring params
 *
 * @export
 * @param {string} [arg]
 * @returns
 */
export function Param(arg?: string) {
    if (arg) {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.param(), type));
    } else {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.param(), type));
    }
}

/**
 * get querystring params
 *
 * @export
 * @param {string} [arg]
 * @returns
 */
export function Query(arg?: string) {
    if (arg) {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.querys(arg), type));
    } else {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.querys(), type));
    }
}

/**
 * get upload file object
 *
 * @export
 * @param {string} [arg]
 * @returns
 */
export function File(arg?: string) {
    if (arg) {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.file(arg), type));
    } else {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.file(), type));
    }
}
