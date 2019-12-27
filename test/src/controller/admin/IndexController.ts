/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-12-27 14:23:33
 */
import { Controller, GetMaping, Autowired, RequestMapping, RequestMethod, PathVariable, PostMaping, RequestBody, Valid, Get, Before, BeforeEach } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";

@Controller("/admin")
@BeforeEach("TestAspect")
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
    // @Before("TestAspect")
    async default() {
        const info = await this.testService.test();
        return this.body(info);
    }

    @RequestMapping("/test", RequestMethod.ALL)
    // @Before("TestAspect")
    async test() {
        const info = await this.testService.test();
        return this.body(info);
    }

}
