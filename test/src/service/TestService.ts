import { Autowired, Component, Controller, Service, Base } from '../../../src/index';
import { TestService2 } from './TestService2';
import { App } from '../App';

@Service()
export class TestService extends Base {
    app: App;
    mm1: any;
    mm2: any;
    @Autowired()
    private testService2: TestService2;

    init() {
        this.mm1 = this.app.mm1;
        this.mm2 = this.app.mm2;
        console.log('TestService.mm1', this.mm1);
        console.log('TestService.mm2', this.mm2);
    }

    public sayHello(): any {
        console.log('TestService.mm1', this.mm1);
        console.log('TestService.mm2', this.mm2);
        console.log('TestService.sayHello!');
        console.log(this.testService2.sayHello());
        return null;
    }

    public testLazy(): any {
        console.log('TestService.testLazy!');
        return null;
    }
}