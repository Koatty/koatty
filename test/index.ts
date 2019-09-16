/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-10 10:49:27
 */
import { Bootstrap, ComponentScan, Autowired, Koatty } from '../src/index';
import * as koa from "koa";
import * as helper from "think_lib";
import { TestService } from './Service';
import { TestService2 } from './Service2';

@Bootstrap()
@ComponentScan('./test')
export class App extends Koatty {

    public init() {
        // this.options = {
        //     root_path: __dirname
        //     app_path: __dirname + path.sep + 'app',
        //     app_debug: true //线上环境请将debug模式关闭，即：app_debug:false
        // };
        console.log('App.init');
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


