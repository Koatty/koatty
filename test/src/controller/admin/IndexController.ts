/**
 * @ author: xxx
 * @ copyright: Copyright (c)
 * @ license: Apache License 2.0
 * @ version: 2019-12-26 11:38:00
 */
import { Controller, GetMaping, Autowired, RequestMapping, RequestMethod, PathVariable, PostMaping, RequestBody, Valid, Get } from "../../../../src/index";
import { App } from '../../App';
import { AdminController } from "../AdminController";
import { TestService } from "../../service/TestService";

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

    @RequestMapping("/", RequestMethod.ALL)
    async default(@PathVariable("test") @Valid("notEmpty") test: string) {
        const info = await this.testService.test();
        return this.body(info);
    }

}
