/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2020-03-19 15:30:22
 */
import { RestController, Controller } from "../../../src/index";
import { App } from '../App';

// @Controller("/rest")
export class RestTestController extends RestController {
    app: App;

    init() {

    }
}