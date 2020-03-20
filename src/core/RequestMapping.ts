/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-20 11:44:34
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import * as helper from "think_lib";
import { IOCContainer } from './Container';
import { paramterTypes } from "think_validtion";
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
const Inject = (fn: Function): ParameterDecorator => {
    return (target: any, propertyKey: string, descriptor: any) => {
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
        if (!paramterTypes[type]) {
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
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function RequestBody(): ParameterDecorator {
    return Inject((ctx: any) => ctx.request.body);
}

/**
 * Get post or get parameters, post priority
 *
 * @export
 * @param {string} [name]
 * @returns {ParameterDecorator}
 */
export function RequestParam(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            const data: any = { ...ctx._get, ...ctx._post };
            return data[name];
        });
    } else {
        return Inject((ctx: any, type: string) => {
            const data: any = { ...ctx._get, ...ctx._post };
            return data;
        });
    }
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name] params name
 * @returns
 */
export function PathVariable(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return ctx.querys(name);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.querys();
        });
    }
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Get(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return ctx.querys(name);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.querys();
        });
    }
}

/**
 * Get parsed POST/PUT... body.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Post(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return ctx.post(name);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.post();
        });
    }
}

/**
 * Get parsed upload file object.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function File(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return ctx.file(name);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.file();
        });
    }
}

/**
 * Get request header.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Header(name?: string): ParameterDecorator {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return ctx.get(name);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.headers;
        });
    }
}

/**
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function Body(): ParameterDecorator {
    return Inject((ctx: any) => ctx.request.body);
}
