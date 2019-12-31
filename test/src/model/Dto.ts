import { Length, Min, Max, IsCnName, Contains, IsNotEmpty } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-31 10:29:08
 */

export class Dto {
    // @Length(10, 20, {
    //     message: "name必填或格式不正确"
    // })
    @IsNotEmpty()
    name: string;

    @Contains("hello")
    text: string;

    @Min(0)
    @Max(10)
    rating: number;
}