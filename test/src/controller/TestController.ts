import { Component, Autowired, Controller, Value, BaseController, logger, helper, RequestMapping, RequestBody, PathVariable, GetMaping, PostMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { App } from '../App';
import { AppBaseController } from "./AppBaseController";
function myTimeout(ms = 3000) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms, 'done');
    });
}

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
    @Autowired()
    Model: TestService;
    private num = 0;

    init() {
        // this.Model = this.testService;
    }

    @GetMaping()
    async sayHello(@PathVariable('aa') aa: number, @PathVariable('bb') bb: string) {
        console.log('info', typeof aa, typeof bb);
        console.log('info', aa, bb);
        console.log('test', this.test);
        console.log('testService', this.Model instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this._options.scope);
        console.log('test.sayHello!', this.isGet());

        logger.info('TestController.sayHello');
        this.testCount();
        this.testService.sayHello();
        // await myTimeout();
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