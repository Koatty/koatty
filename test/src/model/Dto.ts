import { Length, Min, Max, IsCnName, Contains } from '../../../src';
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-31 09:28:37
 */

export class Dto {
    @Length(10, 20, {
        message: "name必填或格式不正确"
    })
    name: string;

    @Contains("hello")
    text: string;

    @Min(0)
    @Max(10)
    rating: number;
}