import { Component, Autowired, Controller, Value, Get, All, Param, Query, BaseController, logger, helper } from '../../../src/index';
import { TestService } from '../service/TestService';

interface PlainObj {
    aa: string;
    bb: {
        cc: string;
    };
}

@Controller('/test')
export class TestController extends BaseController {
    public ctx: any;
    public options: any;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;
    num = 0;

    @Get('/sayHello')
    public sayHello(@Query('aa') aa: number, @Query('bb') bb: string) {
        console.log('info', typeof aa, typeof bb);
        console.log('test', this.test);
        console.log('testService', this.testService instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this.options.scope);
        console.log('test.sayHello!');
        logger.info('TestController.sayHello');
        // this.testService.sayHello();
        this.testCount();
        this.testService.sayHello();
        return this.json({ 'TestController': 'test.sayHello!' });
    }

    private testCount() {
        this.num++;
        logger.info(helper.toString(this.num));
    }

    @All('/helloWorld')
    public helloWorld(@Param() info: PlainObj) {

        this.testCount();
        return this.json(info);
    }
}