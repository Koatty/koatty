import { Length, Min, Max, IsCnName, Contains, IsNotEmpty, IsDefined } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-19 19:56:00
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

    @Min(0)
    @Max(10)
    rating: number;
}