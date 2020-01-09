import { Length, Min, Max, IsCnName, Contains, IsNotEmpty, IsDefined } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-01-09 18:11:10
 */

export class Dto {
    // @Length(10, 20, {
    //     message: "name必填或格式不正确"
    // })
    @IsDefined()
    @IsNotEmpty()
    name: string;

    @Contains("hello")
    text: string;

    @Min(0)
    @Max(10)
    rating: number;
}