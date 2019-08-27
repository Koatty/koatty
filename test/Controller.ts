import { Component, Autowired, Controller } from '../src/index';
import { TestService } from './Service';

@Controller()
export class TestController {
    @Autowired()
    private testService: TestService;
    public constructor() { }
    public sayHello() {
        console.log('test1.sayHello!');
        // this.testService.sayHello();
    }
}