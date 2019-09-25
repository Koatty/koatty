import { Component, Autowired, Controller, Value } from '../../../src/index';
import { TestService } from '../service/TestService';

@Controller('/aa_controller')
export class AaController {
    public ctx: any;
    @Value("logs_path")
    private test: string;
    @Autowired()
    private testService: TestService;
    public sayHello() {
        console.log('test', this.test);
        console.log('testService', this.testService);
        console.log('ctx', this.ctx);
        console.log('aa.sayHello!');
        // this.testService.sayHello();
    }
}