/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-07 19:25:21
 */
// tslint:disable-next-line: no-import-side-effect
import "reflect-metadata";
import helper from "think_lib";
import { PARAM_RULE_KEY } from './Constants';
import { attachPropertyData } from './Injectable';
import { FunctionValidator, ClassValidator } from 'think_validtion';
export {
    ClassValidator, FunctionValidator, IsDefined, IsCnName, IsIdNumber, IsZipCode, IsMobile, IsPlateNumber, IsEmail, IsIP, IsPhoneNumber, IsUrl, IsHash, IsNotEmpty, Equals, NotEquals, Contains, IsIn, IsNotIn, IsDate,
    Min, Max, Length
} from "think_validtion";

/**
 * type checked rules
 *
 * @export
 * @type {number}
 */
export type ValidRules = "IsNotEmpty" | "Equals" | "NotEquals" | "Contains" | "Min" | "Max" | "Length" | "IsIn" | "IsNotIn" | "IsDate" |
    "IsEmail" | "IsIP" | "IsPhoneNumber" | "IsUrl" | "IsHash" | "IsCnName" | "IsIdNumber" | "IsZipCode" | "IsMobile" | "IsPlateNumber";

/**
 * Check the base types.
 *
 * @param {*} value
 * @param {string} type
 * @returns {boolean}
 */
const checkParamsType = function (value: any, type: string): boolean {
    switch (type) {
        case "number":
            if (!helper.isNumber(value)) {
                return false;
            }
            return true;
        case "boolean":
            if (!helper.isBoolean(value)) {
                return false;
            }
            return true;
        case "array":
        case "tuple":
            if (!helper.isArray(value)) {
                return false;
            }
            return true;
        case "string":
            if (!helper.isString(value)) {
                return false;
            }
            return true;
        case "object":
        case "enum":
            if (helper.isUndefined(value)) {
                return false;
            }
            return true;
        default: //any
            return true;
    }
};

/**
 * Invoke valid rules.
 *
 * @param {*} ctx
 * @param {string} name
 * @param {*} value
 * @param {string} type
 * @param {(ValidRules | ValidRules[] | Function)} rule
 * @param {string} [message=""]
 * @returns
 */
const ValidCheck = function (ctx: any, name: string, value: any, type: string, rule: any, message = "") {
    // check type
    if (!checkParamsType(value, type)) {
        return ctx.throw(400, `Invalid parameter type, the parameter \`${name}\` is not ${type}`);
    }
    if (helper.isFunction(rule)) {
        if (!rule(value)) {
            return ctx.throw(400, message || `The parameter \`${name}\` is invalid.`);
        }
        return value;
    } else {
        if (helper.isString(rule)) {
            rule = [rule];
        }
        if (rule.some((it: string) => FunctionValidator[it] && !FunctionValidator[it](value))) {
            return ctx.throw(400, message || `The parameter \`${name}\` is invalid.`);
        }
    }
    return value;
};

/**
 * Validtion paramer's type and values.
 *
 * @export
 * @param {(ValidRules | ValidRules[] | Function)} rule
 * @param {string} [message]
 * @returns {ParameterDecorator}
 */
export function Valid(rule: ValidRules | ValidRules[] | Function, message?: string): ParameterDecorator {
    let rules: any = [];
    if (helper.isString(rule)) {
        rules = (<string>rule).split(",");
    } else {
        rules = rule;
    }
    return (target: any, propertyKey: string, descriptor: any) => {
        // 获取成员参数类型
        const paramtypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        attachPropertyData(PARAM_RULE_KEY, {
            name: propertyKey,
            fn: ValidCheck,
            rule: rules,
            msg: message,
            index: descriptor,
            type: (paramtypes[descriptor] && paramtypes[descriptor].name ? paramtypes[descriptor].name : "").toLowerCase()
        }, target, propertyKey);
        return descriptor;
    };
}

/**
 * Validtion paramer's type and values from DTO class.
 *
 * @export
 * @returns {MethodDecorator}
 */
export function Validated(): MethodDecorator {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        // 获取成员参数类型
        const paramtypes = Reflect.getMetadata("design:paramtypes", target, propertyKey);
        const { value, configurable, enumerable } = descriptor;
        descriptor = {
            configurable,
            enumerable,
            writable: true,
            value: async function valid(...props: any[]) {
                const ps: any[] = [];
                // tslint:disable-next-line: no-unused-expression
                props.map && props.map((value: any, index: number) => {
                    if (helper.isObject(value) && helper.isClass(paramtypes[index])) {
                        ps.push(ClassValidator.valid(paramtypes[index], value));
                    }
                });
                if (ps.length > 0) {
                    await Promise.all(ps);
                }
                // tslint:disable-next-line: no-invalid-this
                return value.apply(this, props);
            }
        };
        return descriptor;
    };

}