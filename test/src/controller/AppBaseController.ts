/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-12 18:41:58
 */

import { Component, Autowired, Controller, Value, BaseController, logger, helper, RequestMapping, RequestBody, PathVariable, GetMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { App } from '../App';


@Controller()
export class AppBaseController extends BaseController {
    Model = {};

    init() {
        this.Model = { test: 1 };
    }
}