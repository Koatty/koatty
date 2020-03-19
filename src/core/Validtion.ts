/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-19 20:25:03
 */
import * as Koa from "koa";
import * as helper from "think_lib";
import { convertParamsType, ValidatorFuncs, plainToClass, ValidRules } from 'think_validtion';
import { PARAM_RULE_KEY } from './Constants';
import { IOCContainer } from './Container';
export {
    Validated, ClassValidator, FunctionValidator,
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
            index: descriptor,
            type
        }, target, propertyKey);
    };
}