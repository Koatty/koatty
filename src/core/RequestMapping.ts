/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-10 11:33:00
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { IOCContainer } from 'koatty_container';
import { paramterTypes } from "koatty_validtion";
import { ROUTER_KEY, PARAM_KEY } from "./Constants";

/**
 *
 *
 * @export
 * @interface RouterOption
 */
export interface RouterOption {
    path?: string;
    requestMethod: string;
    routerName?: string;
    method: string;
}

/**
 * http request methods
 *
 * @export
 * @var RequestMethod
 */
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

/**
 * Routes HTTP requests to the specified path.
 *
 * @param {string} [path="/"] router path
 * @param {*} [requestMethod=RequestMethod.GET] http methods
 * @param {{
 *         routerName?: string; router name
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const RequestMapping = (
    path = "/",
    requestMethod = RequestMethod.GET,
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    const routerName = routerOptions.routerName || "";
    return (target, key: string, descriptor: PropertyDescriptor) => {
        const targetType = IOCContainer.getType(target);
        if (targetType !== "CONTROLLER") {
            throw Error("RequestMapping decorator is only used in controllers class.");
        }
        // tslint:disable-next-line: no-object-literal-type-assertion
        IOCContainer.attachPropertyData(ROUTER_KEY, {
            path,
            requestMethod,
            routerName,
            method: key
        } as RouterOption, target, key);

        return descriptor;
    };
};

/**
 * Routes HTTP POST requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const PostMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.POST, routerOptions);
};

/**
 * Routes HTTP GET requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const GetMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.GET, routerOptions);
};

/**
 * Routes HTTP DELETE requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const DeleteMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.DELETE, routerOptions);
};

/**
 * Routes HTTP PUT requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const PutMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.PUT, routerOptions);
};

/**
 * Routes HTTP PATCH requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const PatchMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.PATCH, routerOptions);
};

/**
 * Routes HTTP OPTIONS requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const OptionsMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.OPTIONS, routerOptions);
};

/**
 * Routes HTTP HEAD requests to the specified path.
 *
 * @param {string} path
 * @param {{
 *         routerName?: string;
 *     }} [routerOptions={}]
 * @returns {MethodDecorator}
 */
export const HeadMapping = (
    path = "/",
    routerOptions: {
        routerName?: string;
    } = {}
): MethodDecorator => {
    return RequestMapping(path, RequestMethod.HEAD, routerOptions);
};

/**
 * 
 * @param fn 
 */
const Inject = (fn: Function, name: string): ParameterDecorator => {
    return (target: any, propertyKey: string, descriptor: any) => {
        const targetType = IOCContainer.getType(target);
        if (targetType !== "CONTROLLER") {
            throw Error(`${name} decorator is only used in controllers class.`);
        }
        // 获取成员类型
        // const type = Reflect.getMetadata("design:type", target, propertyKey);
        // 获取成员参数类型
        const paramtypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        // 获取成员返回类型
        // const returntype = Reflect.getMetadata("design:returntype", target, propertyKey);
        // 获取所有元数据 key (由 TypeScript 注入)
        // const keys = Reflect.getMetadataKeys(target, propertyKey);
        let type = (paramtypes[descriptor] && paramtypes[descriptor].name) ? paramtypes[descriptor].name : "object";
        let isDto = false;
        //DTO class
        if (!(helper.toString(type) in paramterTypes)) {
            type = IOCContainer.getIdentifier(paramtypes[descriptor]);
            // reg to IOC container
            // IOCContainer.reg(type, paramtypes[descriptor]);
            isDto = true;
        }

        IOCContainer.attachPropertyData(PARAM_KEY, {
            name: propertyKey,
            fn,
            index: descriptor,
            type,
            isDto
        }, target, propertyKey);
        return descriptor;

    };
};

/**
 * Get request header.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Header(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        if (name !== undefined) {
            return ctx.get(name);
        }
        return ctx.headers;
    }, "Header");
}

/**
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function RequestBody(): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser();
    }, "RequestBody");
}

/**
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function Body(): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser();
    }, "Body");
}

/**
 * Get post or get parameters, post priority
 *
 * @export
 * @param {string} [name]
 * @returns {ParameterDecorator}
 */
export function RequestParam(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser().then((body: any) => {
            const getParams = ctx.queryParser() || {};
            const postParams = (body.post ? body.post : body) || {};
            if (name !== undefined) {
                return postParams[name] === undefined ? getParams[name] : postParams[name];
            }
            return { ...getParams, ...postParams };
        });
    }, "RequestParam");
}

/**
 * Get post or get parameters, post priority
 *
 * @export
 * @param {string} [name]
 * @returns {ParameterDecorator}
 */
export function Param(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser().then((body: any) => {
            const getParams = ctx.queryParser() || {};
            const postParams = (body.post ? body.post : body) || {};
            if (name !== undefined) {
                return postParams[name] === undefined ? getParams[name] : postParams[name];
            }
            return { ...getParams, ...postParams };
        });
    }, "Param");
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name] params name
 * @returns
 */
export function PathVariable(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        const getParams = ctx.queryParser() || {};
        if (name === undefined) {
            return getParams;
        }
        return getParams[name];
    }, "PathVariable");
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Get(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        const getParams = ctx.queryParser() || {};
        if (name === undefined) {
            return getParams;
        }
        return getParams[name];
    }, "Get");
}

/**
 * Get parsed POST/PUT... body.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Post(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser().then((body: any) => {
            const params = body.post ? body.post : body;
            if (name === undefined) {
                return params;
            }
            return params[name];
        });
    }, "Post");
}

/**
 * Get parsed upload file object.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function File(name?: string): ParameterDecorator {
    return Inject((ctx: any) => {
        return ctx.bodyParser().then((body: any) => {
            const params = body.file || {};
            if (name === undefined) {
                return params;
            }
            return params[name];
        });
    }, "File");
}

