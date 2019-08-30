import { Autowired, Component, Service } from '../src/index';
// import { Test1 } from './test1';

@Service()
export class TestService3 {
    // @Autowired
    // private test1: Test1;
    public constructor() { }
    public sayHello() {
        console.log('test3.sayHello!');
    }
}