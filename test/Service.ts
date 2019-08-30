import { Autowired, Component, Controller, Service } from '../src/index';
import { TestService2 } from './Service2';
import { TestService3 } from './Service3';

@Service()
export class TestService extends TestService2 {
    @Autowired()
    private testService2: TestService2;
    @Autowired()
    private testService3: TestService3;
    public constructor() {
        super();
    }
    public sayHello() {
        console.log('test2.sayHello!');
    }
}