import { Autowired, Component, Service, Base } from '../../../dist/index';
// import { Test1 } from './test1';

@Service()
export class TestService2 extends Base {
    // @Autowired
    // private test1: Test1;
    public sayHello() {
        console.log('test3.sayHello!');
    }
}