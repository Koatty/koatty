/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-12-02 14:50:01
 */
import { Controller, GetMaping, Autowired, RequestMapping, RequestMethod, PathVariable, PostMaping, RequestBody, Valid } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";

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

    @RequestMapping("/", RequestMethod.ALL)
    async default(@PathVariable("test") @Valid("notEmpty") test: string) {
        const info = await this.testService.test();
        return this.ok(test, info);
    }

    @PostMaping("/test")
    test(@RequestBody() body: any) {
        return this.ok("test", body);
    }
}
