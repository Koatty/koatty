import { Length, Min, Max, IsCnName, Contains, IsNotEmpty, IsDefined } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-20 07:02:12
 */

export class TestDto {
    // @Length(10, 20, {
    //     message: "name必填或格式不正确"
    // })
    // @IsNotEmpty({ message: "name不能为空" })
    @IsDefined()
    name: number;

    @Contains("hello")
    text: string;

    @Min(0, { message: "大于等于0" })
    @Max(10, { message: "小于等于10" })
    rating: number;
}