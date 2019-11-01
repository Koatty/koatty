import { Component, Autowired, Controller, Value, BaseController, logger, helper, RequestMapping, RequestBody, PathVariable, GetMaping, PostMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { App } from '../App';
import { AppBaseController } from "./AppBaseController";

interface PlainObj {
    aa: string;
    bb: {
        cc: string;
    };
}

@Controller()
export class TestController extends AppBaseController {
    app: App;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;
    private num = 0;
    private mm1: any;
    private mm2: any;

    init() {
        this.mm1 = this.app.mm1;
        this.mm2 = this.app.mm2;
        console.log('TestController.mm1', this.mm1);
        console.log('TestController.mm2', this.mm2);
    }

    @GetMaping()
    public sayHello(@PathVariable('aa') aa: number, @PathVariable('bb') bb: string) {
        console.log('info', typeof aa, typeof bb);
        console.log('info', aa, bb);
        console.log('test', this.test);
        console.log('testService', this.testService instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this._options.scope);
        console.log('test.sayHello!', this.isGet());

        logger.info('TestController.sayHello');
        this.testCount();
        this.testService.sayHello();
        return this.json({ 'TestController': 'test.sayHello!' });
    }

    @PostMaping("/test")
    testHello(@RequestBody() body: any) {
        this.json(body);
    }

    @GetMaping('/test')
    private testCount() {
        this.num++;
        logger.info(helper.toString(this.num));
        return this.json({ 'TestController': 'test.testCount!' });
    }
}