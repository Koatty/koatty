import { Autowired, Component, Service, Base } from '../../../src/index';
import { TestService } from './TestService';
// import { Test1 } from './test1';

@Service()
export class TestService3 extends Base {
    // @Autowired()
    // private testService: TestService;

    public sayHello() {
        console.log('test3.sayHello!');
    }
}