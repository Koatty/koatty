import { Autowired, Component, Service, Base } from '../../../src/index';
import { TestService3 } from './TestService3';
import { TestService } from './TestService';
// import { Test1 } from './test1';

@Service()
export class TestService2 extends Base {
    @Autowired()
    private testService: TestService;

    public sayHello() {
        console.log('test2.sayHello!');
        console.log(this.testService.testLazy());
    }
}