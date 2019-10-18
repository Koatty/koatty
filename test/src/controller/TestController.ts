import { Component, Autowired, Controller, Value, Get, All, BaseController, logger, helper, BaseControllerOptions, RequestMapping, RequestBody, PathVariable, GetMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { App } from '../app';

interface PlainObj {
    aa: string;
    bb: {
        cc: string;
    };
}

@Controller()
export class TestController extends BaseController {
    app: App;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;
    num = 0;

    @GetMaping('/test')
    public sayHello(@PathVariable('aa') aa: number, @PathVariable('bb') bb: string) {
        console.log('info', typeof aa, typeof bb);
        console.log('test', this.test);
        console.log('testService', this.testService instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this._options.scope);
        console.log('test.sayHello!');

        logger.info('TestController.sayHello');
        // this.testService.sayHello();
        this.testCount();
        this.testService.sayHello();
        return this.json({ 'TestController': 'test.sayHello!' });
    }

    @GetMaping('/test1')
    private testCount() {
        this.num++;
        logger.info(helper.toString(this.num));
        return this.json({ 'TestController': 'test.testCount!' });
    }

    @RequestMapping()
    public helloWorld(@RequestBody() info: PlainObj) {
        this.testCount();
        return this.json(info);
    }
}