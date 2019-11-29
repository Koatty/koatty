/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-28 17:41:54
 */
// tslint:disable-next-line: no-import-side-effect
import 'reflect-metadata';
import * as helper from "think_lib";
import { attachPropertyData } from "./Injectable";
import { ROUTER_KEY, PARAM_KEY, PARAM_RULE_KEY } from "./Constants";
import * as Rules from "../util/ValidRule";

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
    const routerName = routerOptions.routerName || '';

    return (target, key: string, descriptor: PropertyDescriptor) => {
        // tslint:disable-next-line: no-object-literal-type-assertion
        attachPropertyData(ROUTER_KEY, {
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
export const PostMaping = (
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
export const GetMaping = (
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
export const DeleteMaping = (
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
export const PutMaping = (
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
export const PatchMaping = (
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
export const OptionsMaping = (
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
export const HeadMaping = (
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
const Inject = (fn: Function, vaildRule?: any[] | Function, message?: string): ParameterDecorator => {
    return (target: any, propertyKey: string, descriptor: any) => {
        // 获取成员类型
        // const type = Reflect.getMetadata('design:type', target, propertyKey);
        // 获取成员参数类型
        const paramtypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
        // 获取成员返回类型
        // const returntype = Reflect.getMetadata('design:returntype', target, propertyKey);
        // 获取所有元数据 key (由 TypeScript 注入)
        // const keys = Reflect.getMetadataKeys(target, propertyKey);

        if (vaildRule) {
            attachPropertyData(PARAM_RULE_KEY, {
                name: propertyKey,
                fn,
                rule: vaildRule,
                msg: message,
                index: descriptor,
                type: (paramtypes[descriptor] && paramtypes[descriptor].name ? paramtypes[descriptor].name : '').toLowerCase()
            }, target, propertyKey);
            return descriptor;
        } else {
            attachPropertyData(PARAM_KEY, {
                name: propertyKey,
                fn,
                index: descriptor,
                type: (paramtypes[descriptor] && paramtypes[descriptor].name ? paramtypes[descriptor].name : '').toLowerCase()
            }, target, propertyKey);
            return descriptor;
        }
    };

};

/**
 *
 *
 * @param {*} param
 * @param {string} type
 * @param {*} ctx
 * @param {boolean} [isConvert=false]
 * @param {boolean} [isCheck=false]
 * @returns
 */
// tslint:disable-next-line: cyclomatic-complexity
const convertParamsType = (param: any, type: string, ctx: any, isConvert = false, isCheck = false) => {
    switch (type) {
        case 'number':
            if (isConvert && !helper.isEmpty(param)) {
                const tmp = helper.toNumber(param);
                param = helper.isNaN(tmp) ? param : tmp;
            }
            if (isCheck && !helper.isNumber(param)) {
                return ctx.throw(400, `Invalid parameter type, the value \`${param}\` is not ${type}`);
            }
            return param;
        case 'boolean':
            if (isConvert) {
                param = !!param;
            }
            if (isCheck && !helper.isBoolean(param)) {
                return ctx.throw(400, `Invalid parameter type, the value \`${param}\` is not ${type}`);
            }
            return param;
        case 'array':
        case 'tuple':
            if (isConvert) {
                param = helper.toArray(param);
            }
            if (isCheck && !helper.isArray(param)) {
                return ctx.throw(400, `Invalid parameter type, the value \`${param}\` is not ${type}`);
            }
            return param;
        case 'string':
            if (isConvert) {
                // Almost all types can be converted to strings, so returning directly.
                return helper.toString(param);
            }
            if (isCheck && !helper.isString(param)) {
                return ctx.throw(400, `Invalid parameter type, the value \`${param}\` is not ${type}`);
            }
            return param;
        case 'object':
        case 'enum':
            if (isCheck && helper.isUndefined(param)) {
                return ctx.throw(400, `Invalid parameter type, the value \`${param}\` is not ${type}`);
            }
            return param;
        default: //any
            return param;
    }
};

/**
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function RequestBody() {
    return Inject((ctx: any) => ctx.request.body);
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name] params name
 * @returns
 */
export function PathVariable(name?: string) {
    if (name) {
        return Inject((ctx: any, type: string) => {
            const data: any = helper.extend(ctx.params || {}, ctx.query);
            return convertParamsType(data[name], type, ctx, true, false);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            const data: any = helper.extend(ctx.params || {}, ctx.query);
            return data;
        });
    }
}


/**
 * Get parsed request body.
 *
 * @export
 * @returns
 */
export function Body() {
    return Inject((ctx: any) => ctx.request.body);
}

/**
 * Get parsed query-string.
 *
 * @export
 * @param {string} [name]
 * @returns
 */
export function Get(name?: string) {
    if (name) {
        return Inject((ctx: any, type: string) => {
            const data: any = helper.extend(ctx.params || {}, ctx.query);
            return convertParamsType(data[name], type, ctx, true, false);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            const data: any = helper.extend(ctx.params || {}, ctx.query);
            return data;
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
export function Post(name?: string) {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return convertParamsType(ctx.post(name), type, ctx, true, false);
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
export function File(name?: string) {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return convertParamsType(ctx.file(name), type, ctx, true, false);
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
export function Header(name?: string) {
    if (name) {
        return Inject((ctx: any, type: string) => {
            return convertParamsType(ctx.get(name), type, ctx, true, false);
        });
    } else {
        return Inject((ctx: any, type: string) => {
            return ctx.headers;
        });
    }
}

/**
 * type checked rules
 *
 * @export
 * @type {number}
 */
export type ValidRules = "notEmpty" | "isMd5" | "isEmail" | "isCname" | "isIdnumber" | "isMobile" | "isZipcode" | "isUrl";

/**
 * rule map
 */
const ruleObj: any = {
    notEmpty(val: any) {
        return helper.isEmpty(val) ? false : true;
    },
    isMd5: Rules.md5,
    isEmail: Rules.email,
    isCname: Rules.cnname,
    isIdnumber: Rules.idnumber,
    isMobile: Rules.mobile,
    isZipcode: Rules.zipcode,
    isUrl: Rules.url
};

/**
 * Validtion paramer's type.
 *
 * @export
 * @param {(ValidRules | ValidRules[] | Function)} rule
 * @param {string} [message] 
 * @returns
 */
export function Valid(rule: ValidRules | ValidRules[] | Function, message?: string) {
    let rules: any = [];
    if (helper.isString(rule)) {
        rules = (<string>rule).split(",");
    } else {
        rules = rule;
    }
    return Inject(ValidCheck, rules, message);
}

/**
 * Invoke valid rules.
 *
 * @param {*} ctx
 * @param {*} value
 * @param {string} type
 * @param {(ValidRules | ValidRules[] | Function)} rule
 * @param {string} [message=""]
 * @returns
 */
function ValidCheck(ctx: any, value: any, type: string, rule: any, message = "") {
    // check type
    value = convertParamsType(value, type, ctx, false, true);
    if (helper.isFunction(rule)) {
        if (!rule(value)) {
            return ctx.throw(400, message || `Invalid parameter value: ${value}, typeof ${typeof value}.`);
        }
        return value;
    } else if (helper.isArray(rule)) {
        if (<any[]>rule.some((it: string) => ruleObj[it] && !ruleObj[it](value))) {
            return ctx.throw(400, message || 'Invalid parameter value.');
        }
    }
    return value;
}
