/**
 * @ author: richen
 * @ copyright: Copyright (c) - <richenlin(at)gmail.com>
 * @ license: MIT
 * @ version: 2019-10-11 13:43:51
 */
import { Bootstrap, ComponentScan, Autowired, Koatty, ConfiguationScan, logger, helper } from '../src/index';
import * as path from "path";
// import * as helper from "think_lib";

@Bootstrap()
// @ComponentScan('./test')
// @ConfiguationScan('./test/config')
export class App extends Koatty {

    public init() {
        this.root_path = __dirname;
        // this.app_path = __dirname + path.sep + 'app';
        this.app_debug = true; //线上环境请将debug模式关闭，即：app_debug:false
    }


}


