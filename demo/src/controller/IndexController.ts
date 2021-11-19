/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:31:04
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, After, RequestBody, Get, Helper, Post, RequestParam, IOCContainer, PathVariable, BeforeEach, Exception, prevent, Logger } from "../../../src/index";
import { Validated, Valid } from "koatty_validation";
import { App } from '../App';
import { AdminController } from "./AdminController";
import { TestService } from "../service/TestService";
import { TestDto } from '../model/TestDto';
import { TestModel } from '../model/TestModel';
import { TestAspect } from '../aspect/TestAspect';
import { Test2Aspect } from "../aspect/Test2Aspect";


@Controller("/")
@BeforeEach(TestAspect)
export class IndexController extends AdminController {
    app: App;
    pageInfo: { 'appName': string; 'appVersion': string; 'appKeywords': string; 'appDescription': string; };

    @Autowired()
    private testService: TestService;
    cache: {};

    init() {
        this.cache = {};
    }


    @GetMapping("/")
    @Before(Test2Aspect)
    async default(@RequestBody() data: any) {
        console.log(data.toString());

        // const info = await this.testService.test2().catch(() => null);
        // return { "aa": "band!!!!!!" };
        // this.ctx.status = 403;
        // this.fail("sfsdfsdfdsf");
        // this.ctx.body = { "aa": "band!!!!!!" };
        console.log(Logger.getLevel());
        Logger.Debug("do not logger when product env");
        // throw new Error("band");
        // throw new Exception("band", 1, 405);
        // ctx.body = "sss";
        // this.ctx.throw("ssss");
        // return prevent();
        // return new Promise((resolve: Function) => setTimeout(() => resolve(), 200));
        // return "Hello Koatty.";
        if (data == "1") {
            return this.ok("Hello Koatty.");
        } else {
            return this.fail("err.");
        }

    }

    @GetMapping("/path/:name")
    @Before(TestAspect)
    async path(@Get("test") test = '666', @PathVariable("name") name: string) {
        const info = await this.testService.test1(name);
        // throw Error("default");
        return this.body(info);
        // this.type("text/plain");
        // this.type("text/html");
        console.log('PathVariable', name);
        console.log('Get', test);
        return this.fail({
            code: 200,
            message: "dsfsfs"
        });
    }

    @PostMapping("/test")
    @Validated()
    async test(@Post() aa: TestDto) {
        // console.log(Helper.isFunction(TestModel));
        // const info = await this.testService.test(aa).catch((e: any) => {
        //     return this.fail(e.message || e);
        // });
        // return new Promise((resolve: Function) => setTimeout(() => resolve(1), 200));
        // throw Error("test");
        console.log(this.ctx.getMetaData('X-Request-Id'), '------------------------');
        return this.ok("success", "");

    }

}
