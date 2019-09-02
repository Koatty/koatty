/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-02 15:36:55
 */
import { Bootstrap, ComponentScan, Autowired, Koatty } from '../src/index';
import * as koa from "koa";
import * as helper from "think_lib";
import { TestService } from './Service';
import { TestService2 } from './Service2';

@Bootstrap()
@ComponentScan('./test')
export class App extends Koatty {

    public runTest() {
        console.log('App.runTest');
        // this.test.sayHello();
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


