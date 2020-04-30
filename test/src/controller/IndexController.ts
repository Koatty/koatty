/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-04-30 10:45:00
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, BeforeEach, After, RequestBody, Get, Validated, Valid, Helper, Post, RequestParam } from "../../../src/index";
import { App } from '../App';
import { AdminController } from "./AdminController";
import { TestService } from "../service/TestService";
import { TestDto } from '../model/TestDto';
import { TestModel } from '../model/TestModel';
import { TestAspect } from '../aspect/TestAspect';

@Controller("/")
@BeforeEach()
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
        return this.ok("", { name });
    }

    @PostMapping("/test")
    @Validated()
    async test(@RequestParam() aa: TestDto) {
        console.log(Helper.isFunction(TestModel));
        const info = await this.testService.test(aa);
        return this.ok("", info);
    }

}
