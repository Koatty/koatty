/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-05-19 14:31:04
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, After, RequestBody, Get, Validated, Valid, Helper, Post, RequestParam, IOCContainer } from "../../../src/index";
import { App } from '../App';
import { AdminController } from "./AdminController";
import { TestService } from "../service/TestService";
import { TestDto } from '../model/TestDto';
import { TestModel } from '../model/TestModel';
import { TestAspect } from '../aspect/TestAspect';


@Controller("/")
export class IndexController extends AdminController {
    app: App;
    pageInfo: { 'appName': string; 'appVersion': string; 'appKeywords': string; 'appDescription': string; };

    @Autowired()
    private testService: TestService;
    cache: {};

    init() {
        this.cache = {};
    }

    __before() {
        console.log(this.app.test);
        console.log('__before', this.app.env);
        return Promise.resolve();
    }

    @GetMapping("/")
    @Before(TestAspect)
    async default(@Get("name") name = '666') {
        const info = await this.testService.test1(name);
        // throw Error("default");
        // return this.body(info);
        this.type("text/plain");
        this.type("text/html");
        return "haha";
    }

    @PostMapping("/test")
    @Validated()
    async test(@Post() aa: TestDto) {
        // console.log(Helper.isFunction(TestModel));
        const info = await this.testService.test(aa).catch((e: any) => {
            return this.fail(e.message || e);
        });
        // return new Promise((resolve: Function) => setTimeout(() => resolve(1), 200));
        // throw Error("test");
        return this.ok("success", info);

    }

}
