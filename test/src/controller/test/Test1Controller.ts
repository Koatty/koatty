import { Component, Autowired, Controller, Value, BaseController, Logger, Helper, RequestMapping, RequestBody, PathVariable, GetMaping, PostMaping, Valid } from '../../../../src/index';
import { App } from '../../App';
import { AppBaseController } from "../AppBaseController";

@Controller("/test")
export class Test1Controller extends AppBaseController {

    init() {

    }

    @GetMaping("/test")
    async sayHello(@PathVariable('aa') @Valid("notEmpty", "aa不能为空") aa: any, @PathVariable('bb') bb: string) {

        // await myTimeout();
        console.log('test/TestController');
        return this.json({ 'TestController': 'test.sayHello!' });
    }
}