/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-21 23:42:36
 */
import { Controller, GetMapping, Autowired, RequestMethod, PostMapping, Before, BeforeEach, After, RequestBody, Get, Validated, Valid, Helper, Cacheable, Post, RequestParam } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";
import { TestDto } from '../../model/TestDto';
import { TestModel } from '../../model/TestModel';
import { TestAspect } from '../../aspect/TestAspect';

@Controller("/admin")
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
        console.log('__before');
        return Promise.resolve();
    }

    @GetMapping("/")
    @Before(TestAspect)
    async default(
        @Get("aa") @Valid(["IsNotEmpty"], "aa不能为空") aa: number,
        @Get("name") name: string,
        @Get("test") @Valid("IsNotEmpty", "test不能为空") test: string) {
        this.app.test = 'eeeeeee';
        // delete this.app;
        console.log(this.app.test);
        console.log(this.app.mm1);
        return this.ok("", { aa, name });
    }

    @GetMapping("/test")
    @Validated()
    async test(@RequestParam() aa: TestDto) {
        console.log(Helper.isFunction(TestModel));
        const info = await this.testService.test(aa);
        return this.ok("", info);
    }

}
