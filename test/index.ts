/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-08-30 15:24:43
 */
// import { IOC } from '../src/core/Constants';
// import { Autowired, Bootstrap } from '../src/index';
// import { Test1 } from './Controller';
import { Bootstrap, ComponentScan, Autowired } from '../src';
// import { IOC } from '../src/core/Constants';
// import { IOContainer } from '../src/core/Container';
// import { Container, ScopeEnum, provide } from 'injection';
import * as koa from "koa";
import * as helper from "think_lib";
import { TestService } from './Service';
import { TestService2 } from './Service2';

@Bootstrap()
@ComponentScan('./test')
// @Controller
// @Service
// @Middleware
export class App extends koatty {

    public runTest() {
        console.log('App.runTest');
        // this.test.sayHello();
    }

    public listen() {
        console.log('run ...');
    }

}


// console.log(helper.isFunction(App));

// const container = new Container();

// container.bind(App);
// const container = new IOContainer();
// container.init();
// container.load(process.cwd());
// const app: any = container.get('app');
// container.dumpDependency().then((newTree: any) => {
//     console.log(newTree);
// });


// console.log(app);


