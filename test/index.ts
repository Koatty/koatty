/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-09 16:07:11
 */
import { Bootstrap, ComponentScan, Autowired, Koatty, ConfiguationScan, logger, helper } from '../src/index';
import * as path from "path";
// import * as helper from "think_lib";
import { TestService } from './app/service/TestService';
import { TestService2 } from './app/service/TestService2';

@Bootstrap()
// @ComponentScan('./test')
// @ConfiguationScan('./test/config')
export class App extends Koatty {

    public init() {
        this.root_path = __dirname;
        this.app_path = __dirname + path.sep + 'app';
        this.app_debug = true; //线上环境请将debug模式关闭，即：app_debug:false
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


