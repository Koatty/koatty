import { Autowired, Component, Controller, Service } from '../../../src/index';
import { TestService2 } from './TestService2';
import { TestService3 } from './TestService3';
import { App } from '../App';

@Service()
export class TestService extends TestService2 {
    app: App;
    mm1: any;
    mm2: any;
    // @Autowired()
    // private testService2: TestService2;
    // @Autowired()
    // private testService3: TestService3;

    init() {
        this.mm1 = this.app.mm1;
        this.mm2 = this.app.mm2;
        console.log('TestService.mm1', this.mm1);
        console.log('TestService.mm2', this.mm2);
    }

    public sayHello() {
        console.log('TestService.mm1', this.mm1);
        console.log('TestService.mm2', this.mm2);
        console.log(this.app.app_debug);
        console.log('TestService.sayHello!');
    }
}