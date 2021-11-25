import { Length, Min, Max, IsCnName, Contains, IsNotEmpty, IsDefined } from 'koatty_validation';
import { Component } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-04-14 18:21:20
 */
@Component()
export class TestDto {
    // @Min(0, { message: "大于等于0" })
    // @Max(10, { message: "小于等于10" })
    @IsDefined()
    age: number;

    // @Length(10, 20, {
    //     message: "name必填或格式不正确"
    // })
    @IsNotEmpty({ message: "name不能为空" })
    // @IsDefined()
    name: string;

    // @Contains("hello")
    // @IsDefined()
    // text: string;


}