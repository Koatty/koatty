import { Component, Autowired, Controller, Value } from '../../../src/index';
import { TestService } from '../service/Service';

@Controller('/test_controller')
export class TestController {
    public ctx: any;
    @Value("test.aa")
    private test: string;
    @Autowired()
    private testService: TestService;
    public sayHello() {
        console.log('test', this.test);
        console.log('testService', this.testService);
        console.log('ctx', this.ctx);
        console.log('test1.sayHello!');
        // this.testService.sayHello();
    }
}