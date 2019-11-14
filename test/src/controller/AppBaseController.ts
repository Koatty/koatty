/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-11-14 12:30:07
 */

import { Component, Autowired, Controller, Value, BaseController, logger, helper, RequestMapping, RequestBody, PathVariable, GetMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { App } from '../App';


@Controller()
export class AppBaseController extends BaseController {
    Model: any = {};

    init() {
        this.Model = { test: 1 };
    }
}