/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-09-18 13:46:58
 */
import { Bootstrap, ComponentScan, Autowired, Koatty } from '../src/index';
import * as path from "path";
import * as helper from "think_lib";
import { TestService } from './app/service/Service';
import { TestService2 } from './app/service/Service2';

@Bootstrap()
@ComponentScan('./test')
export class App extends Koatty {

    public init() {
        console.log('App.init');
        this.options = {
            root_path: __dirname,
            app_path: __dirname + path.sep + 'app',
            app_debug: true //线上环境请将debug模式关闭，即：app_debug:false
        };
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


