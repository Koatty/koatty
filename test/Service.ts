import { Autowired, Component, Controller, Service } from '../src/index';
// import { Test3 } from './test3';
import { provide } from 'injection';

@Service()
export class TestService {
    public constructor() { }
    public sayHello() {
        console.log('test2.sayHello!');
    }
}