import { Length, IsInt, Min, Max, IsCnName, Contains } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-30 19:05:59
 */

export class Dto {
    @Length(10, 20, {
        message: "name必填或格式不正确"
    })
    name: string;

    @Contains("hello")
    text: string;

    @IsInt()
    @Min(0)
    @Max(10)
    rating: number;
}