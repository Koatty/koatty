import { Component, Autowired, Controller, Value, Get, All, Param, Query } from '../../../src/index';
import { TestService } from '../service/TestService';

interface PlainObj {
    aa: string;
    bb: string;
}

@Controller('/test')
export class TestController {
    public ctx: any;
    private options: any;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;

    @Get('/say')
    public sayHello(@Query('aa') aa: number, @Query('bb') bb: string) {
        console.log('info', aa, bb);
        console.log('test', this.test);
        console.log('testService', this.testService instanceof TestService);
        console.log('ctx', this.ctx.url);
        console.log('options', this.options.scope);
        console.log('test.sayHello!');
        // this.testService.sayHello();
        return this.ctx.body = 'test.sayHello!';
    }

    @All('/hello')
    public helloWorld(@Query() info: PlainObj) {
        return this.ctx.body = 'test.helloWorld!';
    }
}