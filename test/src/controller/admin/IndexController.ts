/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-03-13 20:34:30
 */
import { Controller, GetMaping, Autowired, RequestMapping, RequestMethod, PostMaping, Before, BeforeEach, After, RequestBody, Get, Validated, Valid, Helper, Cacheable, Post } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";
import { Dto } from '../../model/Dto';
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
        console.log('__before');
        return Promise.resolve();
    }

    @RequestMapping("/", RequestMethod.ALL)
    @Before(TestAspect)
    async default(@Get("aa") @Valid(["IsNotEmpty"], "参数不能为空") aa: number) {
        return this.ok(Helper.toString(aa));
    }

    @RequestMapping("/test", RequestMethod.ALL)
    @Validated()
    async test(@Post() aa: Dto) {
        console.log(Helper.isFunction(TestModel));
        const info = await this.testService.test(aa);
        return this.body(info);
    }

}
