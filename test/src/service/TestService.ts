import { Autowired, Component, Controller, Service } from '../../../dist/index';
import { TestService2 } from './TestService2';
import { TestService3 } from './TestService3';

@Service()
export class TestService extends TestService2 {
    app: any;
    // @Autowired()
    // private testService2: TestService2;
    // @Autowired()
    // private testService3: TestService3;

    public sayHello() {
        console.log(this.app.app_debug);

        console.log('TestService.sayHello!');
    }
}