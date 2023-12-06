/*
 * @Description: 
 * @Usage: 
 * @Author: richen
 * @Date: 2023-11-11 11:51:19
 * @LastEditTime: 2023-12-05 21:10:39
 * @License: BSD (3-Clause)
 * @Copyright (c): <richenlin(at)gmail.com>
 */
/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: BSD (3-Clause)
 * @ version: 2020-05-18 11:16:22
 */
import { IMiddleware } from "../component/Components";
import { Koatty } from 'koatty_core';
import { Payload } from "koatty_payload";

export class PayloadMiddleware implements IMiddleware {
  run(options: any, app: Koatty) {
    return Payload(options, app);
  }
}