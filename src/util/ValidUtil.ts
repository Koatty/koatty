/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-30 18:43:41
 */
import helper from "think_lib";
import { plainToClass } from "class-transformer";
import { validate, registerDecorator, ValidationArguments, ValidationOptions, Validator } from "class-validator";
export const validatorCls = new Validator();
/**
 *
 *
 * @export
 * @class ValidateUtil
 */
export class ValidateUtil {
    private static instance: ValidateUtil;

    private constructor() {
    }

    /**
     * 
     *
     * @static
     * @returns
     * @memberof ValidateUtil
     */
    static getInstance() {
        return this.instance || (this.instance = new ValidateUtil());
    }

    /**
     *
     *
     * @param {*} Clazz
     * @param {*} data
     * @returns {Promise<any>}
     * @memberof ValidateUtil
     */
    async valid(Clazz: any, data: any): Promise<any> {
        const obj = plainToClass(Clazz, data);
        const errors = await validate(obj);
        if (errors.length > 0) {
            throw new Error(Object.values(errors[0].constraints)[0]);
        }
        return obj;
    }
}


/**
 * Checks if value is a chinese name.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function iscnname(value: string): boolean {
    const reg = /^([a-zA-Z0-9\u4e00-\u9fa5\·]{1,10})$/;
    return reg.test(value);
}

/**
 * Checks if value is a idcard number.
 *
 * @param {string} value
 * @returns
 */
export function isidnumber(value: string): boolean {
    if (/^\d{15}$/.test(value)) {
        return true;
    }
    if ((/^\d{17}[0-9X]$/).test(value)) {
        const vs = '1,0,x,9,8,7,6,5,4,3,2'.split(',');
        const ps: any[] = '7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2'.split(',');
        const ss: any[] = value.toLowerCase().split('');
        let r = 0;
        for (let i = 0; i < 17; i++) {
            r += ps[i] * ss[i];
        }
        const isOk = (vs[r % 11] === ss[17]);
        return isOk;
    }
    return false;
}

/**
 * Checks if value is a mobile phone number.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function ismobile(value: string): boolean {
    const reg = /^(13|14|15|16|17|18|19)\d{9}$/;
    return reg.test(value);
}

/**
 * Checks if value is a zipcode.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function iszipcode(value: string): boolean {
    const reg = /^\d{6}$/;
    return reg.test(value);
}

/**
 * Checks if value is a platenumber.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isplatenumber(value: string): boolean {
    // let reg = new RegExp('^(([\u4e00-\u9fa5][a-zA-Z]|[\u4e00-\u9fa5]{2}\d{2}|[\u4e00-\u9fa5]{2}[a-zA-Z])[-]?|([wW][Jj][\u4e00-\u9fa5]{1}[-]?)|([a-zA-Z]{2}))([A-Za-z0-9]{5}|[DdFf][A-HJ-NP-Za-hj-np-z0-9][0-9]{4}|[0-9]{5}[DdFf])$');
    // let xreg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}(([0-9]{5}[DF]$)|([DF][A-HJ-NP-Z0-9][0-9]{4}$))/;
    const xreg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]{1}[A-Z]{1}(([0-9]{5}[DF]$)|([DF][A-HJ-NP-Z0-9][0-9]{4}$))/;
    // let creg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]{1}$/;
    const creg = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领]{1}[A-Z]{1}[A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]{1}$/;
    if (value.length === 7) {
        return creg.test(value);
    } else {
        //新能源车牌
        return xreg.test(value);
    }
}


/**
 * Checks if value is a chinese name.
 *
 * @export
 * @param {string} property
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsCnName(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsCnName",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return iscnname(value);
                }
            }
        });
    };
}

/**
 * Checks if value is a idcard number(chinese).
 *
 * @export
 * @param {string} property
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsIdNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsIdNumber",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return isidnumber(value);
                }
            }
        });
    };
}

/**
 * Checks if value is a zipcode(chinese).
 *
 * @export
 * @param {string} property
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsZipCode(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsZipCode",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return iszipcode(value);
                }
            }
        });
    };
}

/**
 * Checks if value is a mobile phone number(chinese).
 *
 * @export
 * @param {string} property
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsMobile(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsMobile",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return ismobile(value);
                }
            }
        });
    };
}

/**
 * Checks if value is a plate number(chinese).
 *
 * @export
 * @param {string} property
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsPlateNumber(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsPlateNumber",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return isplatenumber(value);
                }
            }
        });
    };

}

/**
 * Checks value is empty, undefined, null, '', NaN, [], {} and any empty string(including spaces, tabs, formfeeds, etc.), returns true.
 *
 * @export
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsEmpty(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsEmpty",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return helper.isEmpty(value);
                }
            }
        });
    };
}

/**
 * Checks value is not empty, undefined, null, '', NaN, [], {} and any empty string(including spaces, tabs, formfeeds, etc.), returns false.
 *
 * @export
 * @param {ValidationOptions} [validationOptions]
 * @returns
 */
export function IsNotEmpty(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: "IsNotEmpty",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return !!helper.isEmpty(value);
                }
            }
        });
    };
}