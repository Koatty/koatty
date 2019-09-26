/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-26 11:33:10
 */
import { PATH_METADATA, METHOD_METADATA, ROUTER_NAME_METADATA, ROUTER_KEY, PARAM } from "./Constants";
import { attachClassMetadata } from "./Injectable";


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
    return (target: any, name: string, descriptor: any) => {
        attachClassMetadata(PARAM, name, {
            name,
            fn,
            index: descriptor
        }, target);
        return descriptor;
    };

};

/**
 * get request.body
 *
 * @export
 * @returns
 */
export function Body() {
    return Inject((ctx: any) => ctx.request.body);
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
        return Inject((ctx: any) => ctx.param(arg));
    } else {
        return Inject((ctx: any) => ctx.param());
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
        return Inject((ctx: any) => ctx.querys(arg));
    } else {
        return Inject((ctx: any) => ctx.querys());
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
        return Inject((ctx: any) => ctx.file(arg));
    } else {
        return Inject((ctx: any) => ctx.file());
    }
}