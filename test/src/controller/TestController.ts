import { Component, Autowired, Controller, Value, BaseController, Logger, Helper, RequestMapping, RequestBody, PathVariable, GetMaping, PostMaping } from '../../../src/index';
import { TestService } from '../service/TestService';
import { TestModel } from '../model/TestModel';
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
    Model: TestModel;
    // testModel: TestModel;
    private num = 0;

    init() {
        // this.Model = this.testModel;
        console.log(this.Model);
    }

    @GetMaping()
    async sayHello(@PathVariable('aa') aa: number, @PathVariable('bb') bb: string) {
        console.log('info', typeof aa, typeof bb);
        console.log('info', aa, bb);
        console.log('test', this.test);
        console.log('testService', this.testService instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this._options.scope);
        console.log('isGet!', this.isGet());

        Logger.info('TestModel.config');
        console.log(this.Model.config);

        Logger.info('this.testCount');
        this.testCount();

        Logger.info('TestController.sayHello');
        this.testService.sayHello();

        // await myTimeout();
        return this.json({ 'TestController': 'test.sayHello!' });
    }

    @PostMaping("/test")
    testHello(@RequestBody() body: any) {
        this.json(body);
    }

    private testCount() {
        this.num++;
        console.log(Helper.toString(this.num));
    }
}