import { Component, Autowired, Controller } from '../src/index';
import { TestService } from './Service';

@Controller()
export class TestController {
    @Autowired()
    private testService: TestService;
    public constructor(aa: string, bb: string) { }
    public sayHello() {
        console.log('test1.sayHello!');
        // this.testService.sayHello();
    }
}