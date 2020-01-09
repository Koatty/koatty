/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2020-01-09 17:18:34
 */
import { Controller, GetMaping, Autowired, RequestMapping, RequestMethod, PostMaping, Before, BeforeEach, After, RequestBody, Get, Validated, Valid } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";
import { Dto } from '../../model/Dto';

@Controller("/admin")
export class IndexController extends AdminController {
    app: App;
    pageInfo: { 'appName': string; 'appVersion': string; 'appKeywords': string; 'appDescription': string; };

    @Autowired()
    private testService: TestService;
    cache: {};

    init() {
        this.cache = {};
    }

    // __before() {
    //     console.log('__before');
    //     return Promise.resolve();
    // }

    @RequestMapping("/", RequestMethod.ALL)
    // @Before("TestAspect")
    async default(@Get("test") @Valid(["IsNotEmpty"], "格式不正确") test: number) {
        const info = await this.testService.test();
        return this.body(info);
    }

    @RequestMapping("/test", RequestMethod.ALL)
    @Validated()
    async test(@Get() aa: Dto) {
        const info = await this.testService.test();
        return this.body(info);
    }

}
