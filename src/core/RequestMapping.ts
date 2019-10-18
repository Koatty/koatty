/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-18 10:51:14
 */
import * as helper from "think_lib";
import { attachClassMetadata } from "./Injectable";
import { ROUTER_KEY, PARAM } from "./Constants";

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

export const RequestMapping = (
    path = "/",
    requestMethod = RequestMethod.GET,
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    const routerName = routerOptions.routerName || '';

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
    return RequestMapping(path, method, routerOptions);
};

/**
 * Routes HTTP POST requests to the specified path.
 */
export const Post = createMappingDecorator(RequestMethod.POST);
export const PostMaping = createMappingDecorator(RequestMethod.POST);

/**
 * Routes HTTP GET requests to the specified path.
 */
export const Get = createMappingDecorator(RequestMethod.GET);
export const GetMaping = createMappingDecorator(RequestMethod.GET);

/**
 * Routes HTTP DELETE requests to the specified path.
 */
export const Del = createMappingDecorator(RequestMethod.DELETE);
export const DelMaping = createMappingDecorator(RequestMethod.DELETE);

/**
 * Routes HTTP PUT requests to the specified path.
 */
export const Put = createMappingDecorator(RequestMethod.PUT);
export const PutMaping = createMappingDecorator(RequestMethod.PUT);

/**
 * Routes HTTP PATCH requests to the specified path.
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);
export const PatchMaping = createMappingDecorator(RequestMethod.PATCH);

/**
 * Routes HTTP OPTIONS requests to the specified path.
 */
export const Options = createMappingDecorator(RequestMethod.OPTIONS);
export const OptionsMaping = createMappingDecorator(RequestMethod.OPTIONS);

/**
 * Routes HTTP HEAD requests to the specified path.
 */
export const Head = createMappingDecorator(RequestMethod.HEAD);
export const HeadMaping = createMappingDecorator(RequestMethod.HEAD);

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
            return helper.toString(param);
        default: //any
            return param;
    }
};

/**
 * get request.body
 *
 * @export
 * @returns
 */
export function RequestBody() {
    return Inject((ctx: any) => ctx.request.body);
}

/**
 * get post querystring params
 *
 * @export
 * @param {string} [arg]
 * @returns
 */
export function PathVariable(arg?: string) {
    if (arg) {
        return Inject((ctx: any, type: string) => convertParamsType(ctx.querys(arg), type));
    } else {
        return Inject((ctx: any, type: string) => ctx.querys());
    }
}

