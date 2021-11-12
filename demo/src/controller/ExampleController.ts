/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:31:04
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, After, RequestBody, Get, Helper, Post, RequestParam, IOCContainer, PathVariable, BeforeEach, Exception, prevent, Logger, BaseController } from "../../../src/index";
import { Validated, Valid } from "koatty_validation";
import { App } from '../App';
import { TestAspect } from '../aspect/TestAspect';
import { Test2Aspect } from "../aspect/Test2Aspect";


@Controller("/")
export class ExampleController extends BaseController {
    app: App;


    async Ping(content: string) {
        console.log(content);
        return content;
    }

    async Echo(msg: string) {
        console.log(msg);
        return msg;
    }

}
