/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-05-10 11:33:37
 */
import * as helper from "think_lib";
import { ValidRules, ClassValidator, paramterTypes } from 'think_validtion';
import { PARAM_RULE_KEY, PARAM_CHECK_KEY } from './Constants';
import { IOCContainer } from 'think_container';
export {
    ClassValidator, FunctionValidator,
    IsDefined, IsCnName, IsIdNumber, IsZipCode, IsMobile, IsPlateNumber, IsEmail, IsIP, IsPhoneNumber, IsUrl, IsHash, IsNotEmpty, Equals, NotEquals, Contains, IsIn, IsNotIn, IsDate,
    Min, Max, Length
} from "think_validtion";

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
        const type = (paramtypes[descriptor] && paramtypes[descriptor].name) ? paramtypes[descriptor].name : "object";

        IOCContainer.attachPropertyData(PARAM_RULE_KEY, {
            name: propertyKey,
            rule: rules,
            message,
            index: descriptor,
            type
        }, target, propertyKey);
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
        //
        IOCContainer.savePropertyData(PARAM_CHECK_KEY, {
            dtoCheck: 1
        }, target, propertyKey);

        // 获取成员参数类型
        // const paramtypes = Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];

        // const { value, configurable, enumerable } = descriptor;
        // descriptor = {
        //     configurable,
        //     enumerable,
        //     writable: true,
        //     value: async function valid(...props: any[]) {
        //         const ps: any[] = [];
        //         // tslint:disable-next-line: no-unused-expression
        //         (props || []).map((value: any, index: number) => {
        //             const type = (paramtypes[index] && paramtypes[index].name) ? paramtypes[index].name : "any";
        //             if (!paramterTypes[type]) {
        //                 ps.push(ClassValidator.valid(paramtypes[index], value, true));
        //             } else {
        //                 ps.push(Promise.resolve(value));
        //             }
        //         });
        //         if (ps.length > 0) {
        //             props = await Promise.all(ps);
        //         }
        //         // tslint:disable-next-line: no-invalid-this
        //         return value.apply(this, props);
        //     }
        // };
        // return descriptor;
    };
}