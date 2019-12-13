/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-12-13 09:40:09
 */
import { RestController, Controller } from "../../../src/index";
import { App } from '../App';

@Controller("/rest")
export class RestTestController extends RestController {
    app: App;

    init() {

    }
}