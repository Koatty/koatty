import { Component, Autowired, Controller, Value, Get, All, Param } from '../../../src/index';
import { TestService } from '../service/TestService';

@Controller('/test')
export class TestController {
    public ctx: any;
    private options: any;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;

    @Get('/say')
    public sayHello(@Param() info: any) {
        console.log('info', info);
        console.log('test', this.test);
        console.log('testService', this.testService);
        console.log('ctx', this.ctx.request);
        console.log('options', this.options);
        console.log('test.sayHello!');
        // this.testService.sayHello();
        return this.ctx.body = 'test.sayHello!';
    }

    @All('/hello')
    public helloWorld() {
        return this.ctx.body = 'test.helloWorld!';
    }
}